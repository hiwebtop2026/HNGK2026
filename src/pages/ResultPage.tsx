import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, ArrowLeft, AlertCircle, Zap, Target, Shield, Filter, TrendingUp,
  TrendingDown, Minus, Percent, BarChart3
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { exportToExcel } from '../utils/volunteerUtils';
import { parseSubjectRequirement, matchMajorCategories, MAJOR_CATEGORIES } from '../utils/dataUtils';

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

export function ResultPage() {
  const navigate = useNavigate();
  const { results, baseScore, scoreRange, subject, totalVolunteers, reset, isDark } = useAppStore();
  const [activeTier, setActiveTier] = useState<string>('all');
  
  const chongCount = results.filter(r => r.tier === '冲').length;
  const wenCount = results.filter(r => r.tier === '稳').length;
  const baoCount = results.filter(r => r.tier === '保').length;
  
  const filteredResults = activeTier === 'all' 
    ? results 
    : results.filter(r => r.tier === activeTier);
  
  const handleExport = () => {
    const filename = `2026志愿方案_${baseScore}分_${results.length}志愿.xlsx`;
    exportToExcel(results, filename);
  };
  
  const handleBack = () => {
    reset();
    navigate('/');
  };
  
  const getTierStyle = (tier: string) => {
    switch (tier) {
      case '冲':
        return {
          bg: isDark ? 'bg-orange-500/10' : 'bg-orange-50',
          border: isDark ? 'border-orange-500/30' : 'border-orange-200',
          text: 'text-orange-500',
          badge: 'bg-gradient-to-r from-orange-500 to-red-500',
        };
      case '稳':
        return {
          bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
          border: isDark ? 'border-yellow-500/30' : 'border-yellow-200',
          text: 'text-yellow-500',
          badge: 'bg-gradient-to-r from-yellow-500 to-amber-500',
        };
      case '保':
        return {
          bg: isDark ? 'bg-green-500/10' : 'bg-green-50',
          border: isDark ? 'border-green-500/30' : 'border-green-200',
          text: 'text-green-500',
          badge: 'bg-gradient-to-r from-green-500 to-emerald-500',
        };
      default:
        return {
          bg: isDark ? 'bg-gray-500/10' : 'bg-gray-50',
          border: isDark ? 'border-gray-500/30' : 'border-gray-200',
          text: 'text-gray-500',
          badge: 'bg-gray-500',
        };
    }
  };
  
  const getScoreDiff = (refScore: number) => {
    const diff = refScore - baseScore;
    if (diff > 0) return { icon: <TrendingUp className="w-3 h-3" />, text: `+${diff}`, color: 'text-red-500' };
    if (diff < 0) return { icon: <TrendingDown className="w-3 h-3" />, text: `${diff}`, color: 'text-green-500' };
    return { icon: <Minus className="w-3 h-3" />, text: '0', color: isDark ? 'text-gray-400' : 'text-gray-500' };
  };
  
  const getProbabilityColor = (probability: number) => {
    if (probability >= 75) return 'from-green-500 to-emerald-500';
    if (probability >= 50) return 'from-yellow-500 to-amber-500';
    if (probability >= 25) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-rose-500';
  };
  
  const getProbabilityTextColor = (probability: number) => {
    if (probability >= 75) return isDark ? 'text-green-400' : 'text-green-600';
    if (probability >= 50) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    if (probability >= 25) return isDark ? 'text-orange-400' : 'text-orange-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };
  
  const textPrimary = isDark ? 'text-white' : 'text-gray-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  
  if (results.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className={`glass rounded-2xl p-10 text-center max-w-md ${isDark ? '' : 'shadow-lg'}`}>
          <AlertCircle className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} text-lg mb-6`}>暂无志愿方案数据</p>
          <button
            onClick={handleBack}
            className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
          >
            返回首页
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
      </div>
      
      <div className="relative z-10">
        {/* 头部 */}
        <header className={`glass border-b ${isDark ? 'border-white/10' : 'border-gray-200'} py-4 sticky top-0 z-50 backdrop-blur-xl`}>
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              >
                <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
              </button>
              <div>
                <h1 className={`text-xl font-bold ${textPrimary}`}>志愿方案结果</h1>
                <p className={`text-xs ${textSecondary}`}>为你智能生成 {results.length} 个志愿</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">导出Excel</span>
              </button>
            </div>
          </div>
        </header>
        
        {/* 主内容区 */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* 参数信息条 */}
          <div className={`glass rounded-2xl p-5 mb-8 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className={textSecondary}>基准分数</span>
                <span className={`${textPrimary} font-bold text-lg`}>{baseScore} 分</span>
              </div>
              <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2">
                <span className={textSecondary}>分数范围</span>
                <span className={`${textPrimary} font-medium`}>±{scoreRange} ({baseScore - scoreRange} - {baseScore + scoreRange})</span>
              </div>
              <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2">
                <span className={textSecondary}>科目要求</span>
                <span className={`${textPrimary} font-medium`}>{parseSubjectRequirement(subject)}</span>
              </div>
              <div className={`w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2">
                <span className={textSecondary}>志愿数量</span>
                <span className={`${textPrimary} font-medium`}>{totalVolunteers} 个</span>
              </div>
            </div>
          </div>
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className={`glass rounded-2xl p-5 card-hover ${isDark ? '' : 'shadow-md'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-md">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <p className={`text-sm ${textSecondary}`}>总志愿数</p>
              </div>
              <p className="text-3xl font-bold text-gradient">{results.length}</p>
            </div>
            
            <div className={`glass rounded-2xl p-5 card-hover ${isDark ? '' : 'shadow-md'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <p className={`text-sm ${textSecondary}`}>冲志愿</p>
              </div>
              <p className="text-3xl font-bold text-orange-500">{chongCount}</p>
              <div className={`mt-2 h-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                  style={{ width: `${(chongCount / results.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className={`glass rounded-2xl p-5 card-hover ${isDark ? '' : 'shadow-md'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-md">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <p className={`text-sm ${textSecondary}`}>稳志愿</p>
              </div>
              <p className="text-3xl font-bold text-yellow-500">{wenCount}</p>
              <div className={`mt-2 h-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                  style={{ width: `${(wenCount / results.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className={`glass rounded-2xl p-5 card-hover ${isDark ? '' : 'shadow-md'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <p className={`text-sm ${textSecondary}`}>保志愿</p>
              </div>
              <p className="text-3xl font-bold text-green-500">{baoCount}</p>
              <div className={`mt-2 h-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                  style={{ width: `${(baoCount / results.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* 筛选标签 */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Filter className={`w-4 h-4 ${textSecondary}`} />
            {['all', '冲', '稳', '保'].map((tier) => (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTier === tier
                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : `glass ${textSecondary} hover:${textPrimary}`
                }`}
              >
                {tier === 'all' ? '全部' : `${tier}志愿`}
              </button>
            ))}
          </div>
          
          {/* 志愿列表 */}
          <div className="space-y-4">
            {filteredResults.map((volunteer) => {
              const tierStyle = getTierStyle(volunteer.tier);
              const scoreDiff = getScoreDiff(volunteer.refScore);
              const majorCats = matchMajorCategories(volunteer.name);
              const probGradient = getProbabilityColor(volunteer.admissionProbability);
              const probTextColor = getProbabilityTextColor(volunteer.admissionProbability);
              
              return (
                <div
                  key={volunteer.index}
                  className={`glass rounded-2xl p-5 border ${tierStyle.border} card-hover group`}
                >
                  <div className="flex items-start gap-5">
                    {/* 序号和档次 */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <span className={`text-2xl font-bold ${tierStyle.text}`}>
                        {String(volunteer.index).padStart(2, '0')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${tierStyle.badge} shadow-md`}>
                        {volunteer.tier}
                      </span>
                    </div>
                    
                    {/* 院校信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-lg font-semibold ${textPrimary} truncate`}>{volunteer.name}</h3>
                          </div>
                          <p className={`text-sm ${textMuted}`}>院校代码：{volunteer.code}</p>
                        </div>
                        
                        {/* 录取概率 - 重点展示 */}
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <Percent className={`w-4 h-4 ${probTextColor}`} />
                            <span className={`text-2xl font-bold ${probTextColor}`}>
                              {volunteer.admissionProbability}%
                            </span>
                          </div>
                          <div className="w-32 ml-auto">
                            <div className="probability-bar">
                              <div
                                className={`probability-fill bg-gradient-to-r ${probGradient}`}
                                style={{ width: `${volunteer.admissionProbability}%` }}
                              />
                            </div>
                            <p className={`text-xs ${textMuted} mt-1`}>录取概率</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          volunteer.level === '985'
                            ? isDark ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-50 text-red-600 border border-red-200'
                            : volunteer.level === '211'
                            ? isDark ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-orange-50 text-orange-600 border border-orange-200'
                            : volunteer.level === '双一流'
                            ? isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                            : isDark ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          {volunteer.level}
                        </span>
                        <span className={`text-sm ${textSecondary} flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-gray-500' : 'bg-gray-400'}`} />
                          {volunteer.province}
                        </span>
                        
                        {/* 分数趋势 */}
                        <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${
                          volunteer.scoreTrend === 'up'
                            ? isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                            : volunteer.scoreTrend === 'down'
                            ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                            : isDark ? 'bg-gray-500/10 text-gray-400' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {volunteer.scoreTrend === 'up' && <TrendingUp className="w-3 h-3" />}
                          {volunteer.scoreTrend === 'down' && <TrendingDown className="w-3 h-3" />}
                          {volunteer.scoreTrend === 'stable' && <Minus className="w-3 h-3" />}
                          <span>{volunteer.scoreTrend === 'up' ? '分数上涨' : volunteer.scoreTrend === 'down' ? '分数下降' : '分数平稳'}</span>
                        </span>
                        
                        {majorCats.slice(0, 2).map(catId => {
                          const cat = MAJOR_CATEGORIES.find(c => c.id === catId);
                          if (!cat) return null;
                          return (
                            <span key={catId} className={`px-2 py-0.5 rounded-md text-xs ${
                              isDark
                                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                : 'bg-primary-50 text-primary-600 border border-primary-200'
                            }`}>
                              {cat.name}
                            </span>
                          );
                        })}
                      </div>
                      
                      {/* 历年分数线 */}
                      <div className={`flex items-center gap-6 mb-4 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <BarChart3 className={`w-4 h-4 ${textSecondary}`} />
                          <span className={`text-sm ${textSecondary}`}>历年投档线</span>
                        </div>
                        <div className="flex gap-6 flex-1">
                          <div className="text-center">
                            <p className={`text-xs ${textMuted} mb-1`}>2025</p>
                            <p className={`text-sm font-bold ${textPrimary}`}>{volunteer.score2025 ?? '-'}</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-xs ${textMuted} mb-1`}>2024</p>
                            <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{volunteer.score2024 ?? '-'}</p>
                          </div>
                          <div className="text-center">
                            <p className={`text-xs ${textMuted} mb-1`}>2023</p>
                            <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{volunteer.score2023 ?? '-'}</p>
                          </div>
                        </div>
                        <div className={`text-right ${scoreDiff.color}`}>
                          <div className="flex items-center justify-end gap-1">
                            {scoreDiff.icon}
                            <span className="font-bold">{scoreDiff.text}分</span>
                          </div>
                          <p className={`text-xs ${textMuted}`}>与参考分差</p>
                        </div>
                      </div>
                      
                      {/* 推荐理由 */}
                      <p className={`text-sm ${textSecondary} leading-relaxed`}>
                        💡 {volunteer.reason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 底部提示 */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`glass rounded-xl p-5 card-hover ${isDark ? '' : 'shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className={`font-semibold ${textPrimary}`}>冲志愿</span>
              </div>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>
                投档线高于考生分数，录取概率较低，建议作为冲刺目标谨慎填报，名额不宜过多。
              </p>
            </div>
            
            <div className={`glass rounded-xl p-5 card-hover ${isDark ? '' : 'shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-md">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className={`font-semibold ${textPrimary}`}>稳志愿</span>
              </div>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>
                投档线与考生分数接近，录取把握较大，是志愿填报的核心选择，建议占主要比例。
              </p>
            </div>
            
            <div className={`glass rounded-xl p-5 card-hover ${isDark ? '' : 'shadow-sm'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className={`font-semibold ${textPrimary}`}>保志愿</span>
              </div>
              <p className={`text-sm ${textSecondary} leading-relaxed`}>
                投档线低于考生分数，录取概率很高，确保不会滑档的保底选择，建议合理设置。
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
