import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  registeredAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  register: (email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  setError: (error: string | null) => void;
}

// localStorage 后备方案（未配置 Supabase 时使用）
const USERS_KEY = 'hngk_users';
const CURRENT_USER_KEY = 'hngk_current_user';

function getLocalUsers(): Record<string, { email: string; password: string; registeredAt: string }> {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : {};
}

function saveLocalUsers(users: Record<string, { email: string; password: string; registeredAt: string }>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getLocalCurrentUser(): User | null {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

function saveLocalCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// 简单的哈希（仅用于本地模式，生产环境请用 Supabase
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Supabase 错误消息中文翻译
function translateSupabaseError(errorMessage: string): string {
  if (errorMessage.includes('email rate limit exceeded')) {
    return '注册请求过于频繁，请稍后再试';
  }
  if (errorMessage.includes('User already registered')) {
    return '该邮箱已注册，请直接登录';
  }
  if (errorMessage.includes('Invalid login credentials')) {
    return '邮箱或密码错误';
  }
  if (errorMessage.includes('Email not confirmed')) {
    return '邮箱尚未验证，请查收验证邮件并完成验证';
  }
  if (errorMessage.includes('Password should be at least 6 characters')) {
    return '密码长度至少6位';
  }
  if (errorMessage.includes('Invalid email')) {
    return '请输入正确的邮箱地址';
  }
  return errorMessage;
}

// 本地注册辅助函数
async function registerLocal(
  email: string, 
  password: string, 
  set: (partial: Partial<AuthState>) => void
): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const users = getLocalUsers();
  
  if (users[email]) {
    set({ isLoading: false, error: '该邮箱已注册，请直接登录' });
    return false;
  }
  
  const user: User = {
    id: 'local_' + Date.now(),
    email,
    registeredAt: new Date().toISOString(),
  };
  
  users[email] = { email, password: hashPassword(password), registeredAt: user.registeredAt };
  saveLocalUsers(users);
  saveLocalCurrentUser(user);
  
  set({ isLoading: false, isAuthenticated: true, user, error: null });
  return true;
}

// 本地登录辅助函数
async function loginLocal(
  email: string, 
  password: string, 
  set: (partial: Partial<AuthState>) => void
): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const users = getLocalUsers();
  const stored = users[email];
  
  if (!stored) {
    set({ isLoading: false, error: '该邮箱未注册，请先注册' });
    return false;
  }
  
  if (stored.password !== hashPassword(password)) {
    set({ isLoading: false, error: '密码错误' });
    return false;
  }
  
  const user: User = {
    id: 'local_' + Date.now(),
    email,
    registeredAt: stored.registeredAt,
  };
  saveLocalCurrentUser(user);
  
  set({ isLoading: false, isAuthenticated: true, user, error: null });
  return true;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  
  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    // 本地验证（无论哪种模式都先验证）
    if (!email || !email.includes('@')) {
      set({ isLoading: false, error: '请输入正确的邮箱地址' });
      return false;
    }
    
    if (!password || password.length < 6) {
      set({ isLoading: false, error: '密码长度至少6位' });
      return false;
    }
    
    // 检查本地是否已注册（避免重复注册）
    const localUsers = getLocalUsers();
    if (localUsers[email]) {
      set({ isLoading: false, error: '该邮箱已注册，请直接登录' });
      return false;
    }
    
    try {
      if (isSupabaseConfigured && supabase) {
        // Supabase 模式
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) {
          // 翻译错误消息
          const translatedError = translateSupabaseError(error.message);
          
          // 如果是频率限制错误，自动降级到本地模式
          if (error.message.includes('email rate limit exceeded')) {
            return registerLocal(email, password, set);
          }
          
          set({ isLoading: false, error: translatedError });
          return false;
        }
        
        if (data.user) {
          const user: User = {
            id: data.user.id,
            email: data.user.email || email,
            registeredAt: data.user.created_at || new Date().toISOString(),
          };
          
          // 记录注册行为
          try {
            await supabase.from('usage_logs').insert({
              user_id: data.user.id,
              email: data.user.email || email,
              action: 'register',
              details: { source: 'web' },
              user_agent: navigator.userAgent,
            });
          } catch {}
          
          // 处理邮箱验证情况：用户已创建但需要验证邮件
          if (!data.session) {
            set({ 
              isLoading: false, 
              isAuthenticated: false, 
              user: null, 
              error: '注册成功！请查收邮箱验证邮件后登录' 
            });
            return false;
          }
          
          // 同时保存到本地作为备份
          localUsers[email] = { email, password: hashPassword(password), registeredAt: user.registeredAt };
          saveLocalUsers(localUsers);
          saveLocalCurrentUser(user);
          
          set({ isLoading: false, isAuthenticated: true, user, error: null });
          return true;
        }
        
        // Supabase 返回空数据，降级到本地模式
        return registerLocal(email, password, set);
      } else {
        // 本地模式（localStorage）
        return registerLocal(email, password, set);
      }
    } catch (err: any) {
      // Supabase 网络错误或其他异常，降级到本地模式
      console.warn('Supabase registration failed, falling back to local mode:', err);
      return registerLocal(email, password, set);
    }
  },
  
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    // 本地验证
    if (!email || !email.includes('@')) {
      set({ isLoading: false, error: '请输入正确的邮箱地址' });
      return false;
    }
    
    if (!password || password.length < 6) {
      set({ isLoading: false, error: '密码长度至少6位' });
      return false;
    }
    
    try {
      if (isSupabaseConfigured && supabase) {
        // Supabase 模式
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          // 翻译错误消息
          const translatedError = translateSupabaseError(error.message);
          
          // 如果是邮箱未验证或凭证错误，尝试本地登录
          if (error.message.includes('Email not confirmed') || 
              error.message.includes('Invalid login credentials')) {
            return loginLocal(email, password, set);
          }
          
          set({ isLoading: false, error: translatedError });
          return false;
        }
        
        if (data.user) {
          const user: User = {
            id: data.user.id,
            email: data.user.email || email,
            registeredAt: data.user.created_at || new Date().toISOString(),
          };
          
          // 记录登录行为
          try {
            await supabase.from('usage_logs').insert({
              user_id: data.user.id,
              email: data.user.email || email,
              action: 'login',
              details: { source: 'web' },
              user_agent: navigator.userAgent,
            });
          } catch {}
          
          // 同时保存到本地作为备份
          const users = getLocalUsers();
          if (!users[email]) {
            users[email] = { email, password: hashPassword(password), registeredAt: user.registeredAt };
            saveLocalUsers(users);
          }
          saveLocalCurrentUser(user);
          
          set({ isLoading: false, isAuthenticated: true, user, error: null });
          return true;
        }
        
        // Supabase 返回空数据，尝试本地登录
        return loginLocal(email, password, set);
      } else {
        // 本地模式
        return loginLocal(email, password, set);
      }
    } catch (err: any) {
      // Supabase 网络错误或其他异常，尝试本地登录
      console.warn('Supabase login failed, falling back to local mode:', err);
      return loginLocal(email, password, set);
    }
  },
  
  logout: async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        // 先记录登出行为，再登出
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          try {
            await supabase.from('usage_logs').insert({
              user_id: session.user.id,
              email: session.user.email,
              action: 'logout',
              details: { source: 'web' },
              user_agent: navigator.userAgent,
            });
          } catch {}
        }
        await supabase.auth.signOut();
      } else {
        // 本地模式：记录登出
        const logs = getLocalUsers().email ? [{}] : []; // 简化处理
        saveLocalCurrentUser(null);
      }
      set({ isAuthenticated: false, user: null, error: null });
      return true;
    } catch (err: any) {
      set({ error: err.message || '退出失败' });
      return false;
    }
  },
  
  checkAuth: async () => {
    set({ isLoading: true });
    
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            registeredAt: session.user.created_at || new Date().toISOString(),
          };
          set({ isAuthenticated: true, user, isLoading: false });
        } else {
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      } else {
        const user = getLocalCurrentUser();
        set({
          isAuthenticated: !!user,
          user,
          isLoading: false,
        });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },
  
  setError: (error) => set({ error }),
}));