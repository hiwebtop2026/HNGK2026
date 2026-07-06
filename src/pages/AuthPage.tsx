import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail, Lock, Loader2, AlertCircle, CheckCircle2, School, Sparkles,
  User, LogOut, ArrowRight, Info, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { useAuthStore, isPasswordStrong, isEmail } from '../store/authStore';
import { useAppStore } from '../store/appStore';

function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();
  
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label="切换主题"
      title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
    >
      <div className="theme-toggle-thumb shadow-lg">
        {theme === 'dark' ? (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth={2} strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </button>
  );
}

type RegisterStep = 'info' | 'otp';

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';
  const { isDark } = useAppStore();
  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    successMessage,
    rememberEmail,
    register,
    sendOtp,
    verifyOtpAndRegister,
    login,
    logout,
    checkAuth,
    setError,
    setSuccessMessage,
    setRememberEmail,
  } = useAuthStore();
  
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('info');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (rememberEmail && mode === 'login') {
      setEmail(rememberEmail);
    }
  }, [rememberEmail, mode]);

  useEffect(() => {
    document.title = '智能高考志愿助理';
    checkAuth();
    if (mode === 'register') {
      try {
        if (!sessionStorage.getItem('hngk_guide_shown')) {
          setShowGuide(true);
          sessionStorage.setItem('hngk_guide_shown', '1');
        }
      } catch {}
    }
  }, [checkAuth, mode]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = window.setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('请输入正确的邮箱地址');
      return;
    }
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (nickname.trim().length < 2 || nickname.trim().length > 20) {
      setError('昵称长度2-20个字符');
      return;
    }
    if (!password || !isPasswordStrong(password)) {
      setError('密码至少8位，且必须包含字母和数字');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    const ok = await sendOtp(email, nickname);
    if (ok) {
      setRegisterStep('otp');
      setCountdown(60);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    const ok = await sendOtp(email, nickname);
    if (ok) {
      setCountdown(60);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    await verifyOtpAndRegister(email, otpCode.trim(), password, nickname);
  };

  const handleRegisterSubmit = async () => {
    if (registerStep === 'info') {
      await handleSendOtp();
    } else {
      await handleVerifyOtp();
    }
  };

  const handleLoginSubmit = async () => {
    if (!email) {
      setError('请输入邮箱或昵称');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    await login(email, password);
  };

  const handleLogout = () => {
    logout();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
    setRegisterStep('info');
  };

  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setRegisterStep('info');
    if (newMode === 'login' && rememberEmail) {
      setEmail(rememberEmail);
    }
  };

  const textPrimary = isDark ? 'text-white' : 'text-gray-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-white/5' : 'bg-white';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const inputFocus = isDark ? 'focus:ring-primary-500/50 focus:border-primary-500/50' : 'focus:ring-primary-500/30 focus:border-primary-400';

  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className={`glass rounded-2xl p-8 max-w-md w-full ${isDark ? '' : 'shadow-lg'}`}>
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>欢迎回来，{user.nickname || user.email.split('@')[0]}</h2>
            <p className={`${textSecondary}`}>
              {user.email}
            </p>
          </div>
          
          <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                您已成功登录，可以使用全部功能
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold text-lg shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all mb-4"
          >
            开始使用志愿助手
          </button>
          
          <button
            onClick={handleLogout}
            className={`w-full px-6 py-3 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'} rounded-xl font-medium transition-all flex items-center justify-center gap-2`}
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${isDark ? 'bg-primary-500/20' : 'bg-primary-400/20'} rounded-full blur-3xl -translate-y-1/2`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${isDark ? 'bg-accent-500/20' : 'bg-accent-400/20'} rounded-full blur-3xl translate-y-1/2`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${isDark ? 'bg-purple-500/10' : 'bg-purple-400/10'} rounded-full blur-3xl`} />
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className={`glass rounded-2xl p-8 max-w-md w-full animate-fade-in ${isDark ? '' : 'shadow-lg'}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <School className="w-5 h-5 text-white" />
              </div>
              <span className={`font-bold text-lg ${textPrimary}`}>智能高考志愿助理</span>
            </div>
            <ThemeToggle />
          </div>
          
          <div className={`flex rounded-xl p-1 mb-6 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <button
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => handleModeSwitch('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
              }`}
            >
              注册
            </button>
          </div>

          {mode === 'register' && (
            <div className="flex justify-end -mt-3 mb-4">
              <button
                onClick={() => setShowGuide(true)}
                className={`text-xs flex items-center gap-1 transition-colors ${
                  isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>注册指引</span>
              </button>
            </div>
          )}
          
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4 ${isDark ? '' : 'shadow-sm'}`}>
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {mode === 'login' ? '欢迎回来' : registerStep === 'otp' ? '验证邮箱' : '免费注册'}
              </span>
            </div>
            <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
              {mode === 'login' ? '登录账户' : registerStep === 'otp' ? '输入验证码' : '创建账户'}
            </h1>
            <p className={`${textSecondary}`}>
              {mode === 'login' 
                ? '登录后继续使用志愿助手' 
                : registerStep === 'otp' 
                  ? '验证码已发送到您的邮箱'
                  : '注册后可使用全部志愿填报功能'}
            </p>
          </div>

          {mode === 'register' && registerStep === 'otp' && (
            <div className={`p-3 rounded-xl mb-4 flex items-center gap-2 ${isDark ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-600'}`}>
              <Mail className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">验证码已发送至 <span className="font-medium">{email}</span></span>
            </div>
          )}
          
          <div className="space-y-4">
            {mode === 'register' && registerStep === 'info' && (
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  昵称
                </label>
                <div className="relative">
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setError(null);
                    }}
                    placeholder="请输入昵称（2-20个字符）"
                    maxLength={20}
                    className={`w-full pl-12 pr-4 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all`}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegisterSubmit()}
                  />
                </div>
              </div>
            )}

            {!(mode === 'register' && registerStep === 'otp') && (
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  {mode === 'login' ? '邮箱或昵称' : '邮箱地址'}
                </label>
                <div className="relative">
                  {mode === 'login' ? (
                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  ) : (
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  )}
                  <input
                    type={mode === 'login' ? 'text' : 'email'}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder={mode === 'login' ? '请输入邮箱或昵称' : '请输入邮箱地址'}
                    className={`w-full pl-12 pr-4 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all`}
                    onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLoginSubmit() : handleRegisterSubmit())}
                  />
                </div>
                {mode === 'login' && (
                  <p className={`text-xs mt-1 ${textMuted}`}>支持使用邮箱或昵称登录</p>
                )}
              </div>
            )}

            {mode === 'register' && registerStep === 'otp' && (
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  邮箱验证码
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtpCode(val);
                        setError(null);
                      }}
                      placeholder="请输入6位验证码"
                      maxLength={6}
                      className={`w-full pl-12 pr-4 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all tracking-widest text-center font-mono text-lg`}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || isLoading}
                    className={`px-4 py-4 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      countdown > 0 || isLoading
                        ? isDark ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isDark
                          ? 'bg-white/10 text-primary-400 hover:bg-white/20'
                          : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                    }`}
                  >
                    {countdown > 0 ? (
                      <>{countdown}s</>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        重新获取
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {!(mode === 'register' && registerStep === 'otp') && (
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  密码
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="请输入密码"
                    className={`w-full pl-12 pr-12 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all`}
                    onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLoginSubmit() : handleRegisterSubmit())}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted} hover:${textSecondary} transition-colors`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}
            
            {mode === 'register' && registerStep === 'info' && (
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  确认密码
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="请再次输入密码"
                    className={`w-full pl-12 pr-4 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all`}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegisterSubmit()}
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className={`flex items-center gap-2 cursor-pointer text-sm ${textSecondary}`}>
                  <input
                    type="checkbox"
                    checked={!!rememberEmail}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRememberEmail(email || null);
                      } else {
                        setRememberEmail(null);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  保持登录
                </label>
                <button className={`text-sm transition-colors ${isDark ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>
                  忘记密码？
                </button>
              </div>
            )}
            
            {error && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            {successMessage && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-green-50 border border-green-200 text-green-600'}`}>
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">{successMessage}</span>
              </div>
            )}

            <button
              onClick={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold text-lg shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? '立即登录' : registerStep === 'otp' ? '完成注册' : '获取验证码并注册'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
          
          <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} text-center leading-relaxed`}>
              {mode === 'login'
                ? '使用邮箱或昵称均可登录，密码安全加密传输，保护您的账号安全。'
                : '注册即表示您同意使用本系统进行高考志愿填报辅助，数据仅供参考，请结合实际情况谨慎填报。'}
            </p>
          </div>
        </div>
      </div>

      {showGuide && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`glass rounded-2xl p-6 w-full max-w-lg ${isDark ? '' : 'shadow-xl'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className={`text-lg font-semibold ${textPrimary}`}>注册指引</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className={`text-2xl leading-none ${textMuted} hover:${textSecondary} transition-colors`}
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className={`font-medium ${textPrimary} mb-1`}>设置昵称</p>
                    <p className={`text-sm ${textSecondary}`}>输入2-20个字符的昵称，可用于登录和显示</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <p className={`font-medium ${textPrimary} mb-1`}>填写邮箱</p>
                    <p className={`text-sm ${textSecondary}`}>使用有效邮箱注册，将发送验证码用于验证</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <p className={`font-medium ${textPrimary} mb-1`}>设置密码</p>
                    <p className={`text-sm ${textSecondary}`}>密码至少8位，建议字母数字组合</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'} mb-1`}>邮箱验证说明</p>
                    <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      点击"获取验证码并注册"后，系统将向您的邮箱发送6位验证码。请输入验证码完成注册。如未收到，请检查垃圾邮件箱或稍后重试。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
            >
              我已了解，开始注册
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
