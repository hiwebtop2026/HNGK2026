import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const REMEMBER_EMAIL_KEY = 'hngk_remember_email';
const OTP_EXPIRE_MINUTES = 10;

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
  rememberEmail: string | null;

  register: (email: string, password: string, nickname: string) => Promise<boolean>;
  sendOtp: (email: string, nickname?: string) => Promise<boolean>;
  verifyOtpAndRegister: (email: string, token: string, password: string, nickname: string) => Promise<boolean>;
  login: (identifier: string, password: string) => Promise<boolean>;
  findEmailByNickname: (nickname: string) => Promise<string | null>;
  logout: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
  setError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  setRememberEmail: (email: string | null) => void;
}

export function isPasswordStrong(password: string): boolean {
  return /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password);
}

export function isEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

function translateSupabaseError(errorMessage: string): string {
  if (errorMessage.includes('rate limit exceeded') || errorMessage.includes('rate limited')) {
    return '请求过于频繁，请稍后再试';
  }
  if (errorMessage.includes('User already registered')) {
    return '该邮箱已注册，请直接登录';
  }
  if (errorMessage.includes('Invalid login credentials')) {
    return '账号或密码错误';
  }
  if (errorMessage.includes('Email not confirmed')) {
    return '邮箱尚未验证，请先完成验证后登录';
  }
  if (errorMessage.includes('Password should be at least')) {
    return '密码长度至少8位，且必须包含字母和数字';
  }
  if (errorMessage.includes('Invalid email')) {
    return '请输入正确的邮箱地址';
  }
  if (errorMessage.includes('Invalid OTP') || errorMessage.includes('otp') || errorMessage.includes('验证码')) {
    return '验证码错误或已过期，请重新获取';
  }
  if (errorMessage.includes('too many requests') || errorMessage.includes('Too Many Requests')) {
    return '请求过于频繁，请稍后再试';
  }
  if (errorMessage.includes('User not found')) {
    return '该账号不存在，请先注册';
  }
  if (errorMessage.includes('email already exists')) {
    return '该邮箱已注册，请直接登录';
  }
  if (errorMessage.includes('Network error') || errorMessage.includes('fetch failed')) {
    return '网络连接失败，请检查网络后重试';
  }
  if (errorMessage.includes('Internal Server Error') || errorMessage.includes('500')) {
    return '服务器繁忙，请稍后再试';
  }
  return errorMessage;
}

async function fetchNicknameFromProfile(userId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', userId)
      .single();
    if (!error && data?.nickname) {
      return data.nickname;
    }
    return null;
  } catch {
    return null;
  }
}

function loadRememberEmail(): string | null {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY);
  } catch {
    return null;
  }
}

function saveRememberEmail(email: string | null) {
  try {
    if (email) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  } catch {}
}

export const useAuthStore = create<AuthState>((set, get) => {
  return {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  successMessage: null,
  rememberEmail: loadRememberEmail(),

  findEmailByNickname: async (nickname: string): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) return null;

    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 20) {
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_email_by_nickname', {
        p_nickname: trimmed,
      });

      if (!error && typeof data === 'string') {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  },

  register: async (email: string, password: string, nickname: string) => {
    set({ isLoading: true, error: null, successMessage: null });

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

    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, error: '认证服务未配置，请联系管理员' });
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname: nickname.trim() },
          emailRedirectTo: window.location.origin + '/',
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

        try {
          await supabase.from('usage_logs').insert({
            user_id: data.user.id,
            email: data.user.email || email,
            action: 'register',
            details: { source: 'web' },
            user_agent: navigator.userAgent,
          });
        } catch {}

        if (data.session) {
          set({ isLoading: false, isAuthenticated: true, user, error: null, successMessage: '注册成功！' });
          return true;
        }

        set({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null,
          successMessage: '注册成功！请查收邮件完成验证后登录，或直接使用密码登录。'
        });
        return true;
      }

      set({ isLoading: false, error: '注册失败，请稍后重试' });
      return false;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('注册失败:', err);
      }
      set({ isLoading: false, error: '网络异常，请检查网络后重试' });
      return false;
    }
  },

  sendOtp: async (email: string, nickname?: string): Promise<boolean> => {
    set({ isLoading: true, error: null, successMessage: null });

    if (!email || !isEmail(email)) {
      set({ isLoading: false, error: '请输入正确的邮箱地址' });
      return false;
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, error: '认证服务未配置，请联系管理员' });
      return false;
    }

    try {
      // 使用 Supabase Auth 自带的 OTP 功能发送验证码
      // 邮件由 Supabase 服务端发送，不需要暴露 Resend API key
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          data: nickname ? { nickname: nickname.trim() } : undefined,
        },
      });

      if (otpError) {
        const errorMessage = translateSupabaseError(otpError.message);
        set({ isLoading: false, error: errorMessage });
        return false;
      }

      set({
        isLoading: false,
        successMessage: '验证码已发送，请查收邮箱',
        error: null,
      });
      return true;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('发送验证码失败:', err);
      }
      set({ isLoading: false, error: '发送验证码失败，请稍后重试' });
      return false;
    }
  },

  verifyOtpAndRegister: async (
    email: string,
    token: string,
    password: string,
    nickname: string
  ): Promise<boolean> => {
    set({ isLoading: true, error: null, successMessage: null });

    if (!email || !isEmail(email)) {
      set({ isLoading: false, error: '请输入正确的邮箱地址' });
      return false;
    }
    if (!token || token.length !== 6) {
      set({ isLoading: false, error: '请输入6位验证码' });
      return false;
    }
    if (!password || !isPasswordStrong(password)) {
      set({ isLoading: false, error: '密码至少8位，且必须包含字母和数字' });
      return false;
    }
    if (!nickname || nickname.trim().length < 2 || nickname.trim().length > 20) {
      set({ isLoading: false, error: '昵称长度2-20个字符' });
      return false;
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, error: '认证服务未配置，请联系管理员' });
      return false;
    }

    try {
      // 使用 Supabase Auth 自带的 OTP 验证功能
      // 验证成功后用户自动登录，然后设置密码和昵称
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'email',
      });

      if (verifyError) {
        set({ isLoading: false, error: translateSupabaseError(verifyError.message) });
        return false;
      }

      if (verifyData.user) {
        // 验证成功，设置密码和昵称
        const { error: updateError } = await supabase.auth.updateUser({
          password,
          data: { nickname: nickname.trim() },
        });

        if (updateError) {
          if (import.meta.env.DEV) {
            console.error('设置密码失败:', updateError);
          }
          set({ isLoading: false, error: translateSupabaseError(updateError.message) });
          return false;
        }

        const profileNickname = await fetchNicknameFromProfile(verifyData.user.id);
        const user: User = {
          id: verifyData.user.id,
          email: verifyData.user.email || email,
          nickname: profileNickname || nickname.trim(),
          registeredAt: verifyData.user.created_at || new Date().toISOString(),
        };

        try {
          await supabase.from('usage_logs').insert({
            user_id: verifyData.user.id,
            email: verifyData.user.email || email,
            action: 'register',
            details: { source: 'web', otp: true },
            user_agent: navigator.userAgent,
          });
        } catch {}

        const rememberEmail = get().rememberEmail;
        if (rememberEmail !== email) {
          saveRememberEmail(email);
          set({ rememberEmail: email });
        }

        set({ isLoading: false, isAuthenticated: true, user, error: null, successMessage: '注册成功！' });
        return true;
      }

      set({ isLoading: false, error: '验证失败，请稍后重试' });
      return false;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('OTP注册失败:', err);
      }
      set({ isLoading: false, error: '网络异常，请检查网络后重试' });
      return false;
    }
  },

  login: async (identifier: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null, successMessage: null });

    if (!identifier) {
      set({ isLoading: false, error: '请输入邮箱或昵称' });
      return false;
    }

    if (!password) {
      set({ isLoading: false, error: '请输入密码' });
      return false;
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, error: '认证服务未配置，请联系管理员' });
      return false;
    }

    let email = identifier;

    if (!isEmail(identifier)) {
      const foundEmail = await get().findEmailByNickname(identifier.trim());
      if (!foundEmail) {
        set({ isLoading: false, error: '该昵称未注册，请检查昵称或使用邮箱登录' });
        return false;
      }
      email = foundEmail;
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
        const profileNickname = await fetchNicknameFromProfile(data.user.id);
        const user: User = {
          id: data.user.id,
          email: data.user.email || email,
          nickname: profileNickname || (data.user.user_metadata?.nickname as string) || email.split('@')[0],
          registeredAt: data.user.created_at || new Date().toISOString(),
        };

        try {
          await supabase.from('usage_logs').insert({
            user_id: data.user.id,
            email: data.user.email || email,
            action: 'login',
            details: { source: 'web' },
            user_agent: navigator.userAgent,
          });
        } catch {}

        const rememberEmail = get().rememberEmail;
        if (rememberEmail !== email) {
          saveRememberEmail(email);
          set({ rememberEmail: email });
        }

        set({ isLoading: false, isAuthenticated: true, user, error: null });
        return true;
      }

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
          const profileNickname = await fetchNicknameFromProfile(session.user.id);
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            nickname: profileNickname || (session.user.user_metadata?.nickname as string) || (session.user.email || '').split('@')[0],
            registeredAt: session.user.created_at || new Date().toISOString(),
          };
          set({ isAuthenticated: true, user, isLoading: false });
        } else {
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },

  setError: (error) => set({ error }),
  setSuccessMessage: (message) => set({ successMessage: message }),

  setRememberEmail: (email: string | null) => {
    saveRememberEmail(email);
    set({ rememberEmail: email });
  },
  };
});

