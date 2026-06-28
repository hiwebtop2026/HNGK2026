import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Loader2, AlertCircle, CheckCircle2, School, Sparkles,
  User, LogOut, ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
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

export function AuthPage() {
  const navigate = useNavigate();
  const { isDark } = useAppStore();
  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    successMessage,
    register,
    login,
    logout,
    checkAuth,
    setError,
    setSuccessMessage,
  } = useAuthStore();
  
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // 已认证则跳转首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  const handleSubmit = async () => {
    if (!email) {
      setError('请输入邮箱地址');
      return;
    }
    
    if (!password) {
      setError('请输入密码');
      return;
    }
    
    if (mode === 'register') {
      if (password.length < 6) {
        setError('密码长度至少6位');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      
      await register(email, password);
    } else {
      await login(email, password);
    }
  };
  
  const handleLogout = () => {
    logout();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };
  
  const textPrimary = isDark ? 'text-white' : 'text-gray-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-white/5' : 'bg-white';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const inputFocus = isDark ? 'focus:ring-primary-500/50 focus:border-primary-500/50' : 'focus:ring-primary-500/30 focus:border-primary-400';
  
  // 如果已登录，显示用户信息
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className={`glass rounded-2xl p-8 max-w-md w-full ${isDark ? '' : 'shadow-lg'}`}>
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/25">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>欢迎回来</h2>
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
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${isDark ? 'bg-primary-500/20' : 'bg-primary-400/20'} rounded-full blur-3xl -translate-y-1/2`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${isDark ? 'bg-accent-500/20' : 'bg-accent-400/20'} rounded-full blur-3xl translate-y-1/2`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${isDark ? 'bg-purple-500/10' : 'bg-purple-400/10'} rounded-full blur-3xl`} />
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className={`glass rounded-2xl p-8 max-w-md w-full animate-fade-in ${isDark ? '' : 'shadow-lg'}`}>
          {/* 头部 */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <School className="w-5 h-5 text-white" />
              </div>
              <span className={`font-bold text-lg ${textPrimary}`}>高考志愿助手</span>
            </div>
            <ThemeToggle />
          </div>
          
          {/* 模式切换 */}
          <div className={`flex rounded-xl p-1 mb-6 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <button
              onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'
              }`}
            >
              注册
            </button>
          </div>
          
          <div className="text-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4 ${isDark ? '' : 'shadow-sm'}`}>
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {mode === 'register' ? '免费注册' : '欢迎回来'}
              </span>
            </div>
            <h1 className={`text-2xl font-bold ${textPrimary} mb-2`}>
              {mode === 'register' ? '创建账户' : '登录账户'}
            </h1>
            <p className={`${textSecondary}`}>
              {mode === 'register' ? '注册后可使用全部志愿填报功能' : '登录后继续使用志愿助手'}
            </p>
          </div>
          
          {/* 表单 */}
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                邮箱地址
              </label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="请输入邮箱地址"
                  className={`w-full pl-12 pr-4 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all`}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                密码
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${textMuted}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="请输入密码"
                  className={`w-full pl-12 pr-4 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all`}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            </div>
            
            {mode === 'register' && (
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
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
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
              onClick={handleSubmit}
              disabled={isLoading || !email || !password || (mode === 'register' && !confirmPassword)}
              className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-semibold text-lg shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'register' ? '立即注册' : '立即登录'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
          
          {/* 底部提示 */}
          <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'} text-center leading-relaxed`}>
              注册即表示您同意使用本系统进行高考志愿填报辅助，数据仅供参考，请结合实际情况谨慎填报。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}