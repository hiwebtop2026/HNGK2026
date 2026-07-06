import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sendVerificationCode } from '../services/emailService';

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
  return str.includes('@');
}

function translateSupabaseError(errorMessage: string): string {
  if (errorMessage.includes('email rate limit exceeded')) {
    return '请求过于频繁，请稍后再试';
  }
  if (errorMessage.includes('User already registered')) {
    return '该邮箱已注册，请直接登录';
  }
  if (errorMessage.includes('Invalid login credentials')) {
    return '账号或密码错误';
  }
  if (errorMessage.includes('Email not confirmed')) {
    return '邮箱尚未验证，请先完成验证';
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
  if (errorMessage.includes('Email rate limit') || errorMessage.includes('rate limit')) {
    return '验证码发送过于频繁，请稍后再试';
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

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  successMessage: null,
  rememberEmail: loadRememberEmail(),

  findEmailByNickname: async (nickname: string): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) return null;

    try {
      const { data, error } = await supabase.rpc('get_email_by_nickname', {
        p_nickname: nickname.trim(),
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

        if (!data.session) {
          try {
            const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (!signInError && sessionData.session) {
              set({ isLoading: false, isAuthenticated: true, user, error: null, successMessage: '注册成功！' });
              return true;
            }
          } catch (signInErr) {
            if (import.meta.env.DEV) {
              console.error('注册后自动登录失败:', signInErr);
            }
          }

          set({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: null,
            successMessage: '注册成功！请查收邮件完成验证，或直接登录。'
          });
          return true;
        }

        set({ isLoading: false, isAuthenticated: true, user, error: null, successMessage: '注册成功！' });
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

    if (!email || !email.includes('@')) {
      set({ isLoading: false, error: '请输入正确的邮箱地址' });
      return false;
    }

    if (!isSupabaseConfigured || !supabase) {
      set({ isLoading: false, error: '认证服务未配置，请联系管理员' });
      return false;
    }

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from('auth_otps').insert({
        email: email.trim(),
        code,
        expires_at: expiresAt,
        used: false,
      });

      if (insertError) {
        if (import.meta.env.DEV) {
          console.error('保存验证码失败:', insertError);
        }
        set({ isLoading: false, error: '验证码生成失败，请稍后重试' });
        return false;
      }

      const emailResult = await sendVerificationCode(email.trim(), code, nickname);

      if (!emailResult.success) {
        if (import.meta.env.DEV) {
          console.error('发送验证码失败:', emailResult.error);
        }
        set({
          isLoading: false,
          successMessage: `验证码已生成：${code}（邮件发送失败，可直接使用此验证码）`,
          error: null,
        });
        return true;
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

    if (!email || !email.includes('@')) {
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
      const { data: otpData, error: otpError } = await supabase
        .from('auth_otps')
        .select('*')
        .eq('email', email.trim())
        .eq('code', token.trim())
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (otpError || !otpData) {
        set({ isLoading: false, error: '验证码错误或已过期，请重新获取' });
        return false;
      }

      const { error: updateError } = await supabase
        .from('auth_otps')
        .update({ used: true })
        .eq('id', otpData.id);

      if (updateError && import.meta.env.DEV) {
        console.error('标记验证码为已使用失败:', updateError);
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { nickname: nickname.trim() },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
          
          if (!getUserError && currentUser) {
            const profileNickname = await fetchNicknameFromProfile(currentUser.id);
            const user: User = {
              id: currentUser.id,
              email: currentUser.email || email,
              nickname: profileNickname || (currentUser.user_metadata?.nickname as string) || nickname.trim(),
              registeredAt: currentUser.created_at || new Date().toISOString(),
            };

            try {
              await supabase.from('usage_logs').insert({
                user_id: currentUser.id,
                email: currentUser.email || email,
                action: 'login_after_otp',
                details: { source: 'web' },
                user_agent: navigator.userAgent,
              });
            } catch {}

            const rememberEmail = get().rememberEmail;
            if (rememberEmail !== null && rememberEmail !== email) {
              saveRememberEmail(email);
              set({ rememberEmail: email });
            }

            set({ isLoading: false, isAuthenticated: true, user, error: null, successMessage: '登录成功！' });
            return true;
          }

          set({ isLoading: false, error: '该邮箱已注册，请直接登录' });
          return false;
        }
        set({ isLoading: false, error: translateSupabaseError(signUpError.message) });
        return false;
      }

      if (signUpData.user) {
        const profileNickname = await fetchNicknameFromProfile(signUpData.user.id);
        const user: User = {
          id: signUpData.user.id,
          email: signUpData.user.email || email,
          nickname: profileNickname || (signUpData.user.user_metadata?.nickname as string) || nickname.trim(),
          registeredAt: signUpData.user.created_at || new Date().toISOString(),
        };

        try {
          await supabase.from('usage_logs').insert({
            user_id: signUpData.user.id,
            email: signUpData.user.email || email,
            action: 'register',
            details: { source: 'web', otp: true },
            user_agent: navigator.userAgent,
          });
        } catch {}

        const rememberEmail = get().rememberEmail;
        if (rememberEmail !== null && rememberEmail !== email) {
          saveRememberEmail(email);
          set({ rememberEmail: email });
        }

        if (signUpData.session) {
          set({ isLoading: false, isAuthenticated: true, user, error: null, successMessage: '注册成功！' });
        } else {
          set({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: null,
            successMessage: '注册成功！请查收验证邮件完成激活。',
          });
        }
        return true;
      }

      set({ isLoading: false, error: '注册失败，请稍后重试' });
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
}));
