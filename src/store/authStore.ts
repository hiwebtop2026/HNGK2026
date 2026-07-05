import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  nickname: string;
  registeredAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;

  // 操作方法
  register: (email: string, password: string, nickname: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  setError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
}

// 密码强度校验：至少8位，必须同时包含字母和数字
export function isPasswordStrong(password: string): boolean {
  return /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password);
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
  if (errorMessage.includes('Password should be at least')) {
    return '密码长度至少8位，且必须包含字母和数字';
  }
  if (errorMessage.includes('Invalid email')) {
    return '请输入正确的邮箱地址';
  }
  return errorMessage;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  successMessage: null,

  register: async (email: string, password: string, nickname: string) => {
    set({ isLoading: true, error: null, successMessage: null });

    // 本地输入校验
    if (!email || !email.includes('@')) {
      set({ isLoading: false, error: '请输入正确的邮箱地址' });
      return false;
    }

    if (!nickname || nickname.trim().length < 2) {
      set({ isLoading: false, error: '昵称至少2个字符' });
      return false;
    }

    if (nickname.trim().length > 20) {
      set({ isLoading: false, error: '昵称最多20个字符' });
      return false;
    }

    if (!password || !isPasswordStrong(password)) {
      set({ isLoading: false, error: '密码至少8位，且必须包含字母和数字' });
      return false;
    }

    // Supabase 未配置时直接报错（不再降级到本地模式）
    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, error: '认证服务未配置，请联系管理员' });
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname: nickname.trim() }
        }
      });

      if (error) {
        set({ isLoading: false, error: translateSupabaseError(error.message) });
        return false;
      }

      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || email,
          nickname: (data.user.user_metadata?.nickname as string) || nickname.trim(),
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

        // 邮箱验证情况：用户已创建但可能需要验证邮件
        // 若无 session，提示用户查收验证邮件，但仍标记为已认证（便于后续引导）
        if (!data.session) {
          set({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: null,
            successMessage: '注册成功！请查收验证邮件完成激活。'
          });
          return true;
        }

        set({ isLoading: false, isAuthenticated: true, user, error: null });
        return true;
      }

      // Supabase 返回空数据，视为失败（不再降级）
      set({ isLoading: false, error: '注册失败，请稍后重试' });
      return false;
    } catch (err: any) {
      // 网络或其他异常，直接报错（不再降级到本地模式）
      if (import.meta.env.DEV) {
        console.error('注册失败:', err);
      }
      set({ isLoading: false, error: '网络异常，请检查网络后重试' });
      return false;
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null, successMessage: null });

    // 本地输入校验
    if (!email || !email.includes('@')) {
      set({ isLoading: false, error: '请输入正确的邮箱地址' });
      return false;
    }

    if (!password) {
      set({ isLoading: false, error: '请输入密码' });
      return false;
    }

    // Supabase 未配置时直接报错
    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, error: '认证服务未配置，请联系管理员' });
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false, error: translateSupabaseError(error.message) });
        return false;
      }

      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || email,
          nickname: (data.user.user_metadata?.nickname as string) || email.split('@')[0],
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

        set({ isLoading: false, isAuthenticated: true, user, error: null });
        return true;
      }

      // Supabase 返回空数据，视为失败
      set({ isLoading: false, error: '登录失败，请稍后重试' });
      return false;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('登录失败:', err);
      }
      set({ isLoading: false, error: '网络异常，请检查网络后重试' });
      return false;
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
      }
      set({ isAuthenticated: false, user: null, error: null });
      return true;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('退出失败:', err);
      }
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
            nickname: (session.user.user_metadata?.nickname as string) || (session.user.email || '').split('@')[0],
            registeredAt: session.user.created_at || new Date().toISOString(),
          };
          set({ isAuthenticated: true, user, isLoading: false });
        } else {
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      } else {
        // Supabase 未配置，置为未认证（不再读取本地用户）
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },

  setError: (error) => set({ error }),
  setSuccessMessage: (message) => set({ successMessage: message }),
}));
