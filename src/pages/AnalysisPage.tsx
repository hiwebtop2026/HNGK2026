import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3, PieChart,
  LineChart, Target, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { SCHOOL_DATA } from '../data/schoolData';
import { getRefScore } from '../utils/dataUtils';
import { calculateTrendAnalysis, calculateAdmissionProbability } from '../utils/trendAnalyzer';

function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full glass hover:bg-white/10 transition-all"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { theme, baseScore } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const isDark = theme === 'dark';
  
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const glass = isDark ? 'bg-white/5 backdrop-blur-md border border-white/10' : 'bg-white/70 backdrop-blur-md border border-white/50';

  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  useEffect(() => {
    const loadData = () => {
      try {
        const processed = SCHOOL_DATA.map(s => {
          const refScore = getRefScore(s.score2025, s.score2024, s.score2023);
          const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
          const probFactors = calculateAdmissionProbability(refScore, baseScore, s.score2025, s.score2024, s.score2023);
          return { ...s, refScore, trendAnalysis, probFactors };
        }).sort((a, b) => a.probFactors.finalProbability - b.probFactors.finalProbability);
        setSchools(processed);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [baseScore]);

  const upTrendCount = schools.filter(s => s.trendAnalysis.trend === 'up').length;
  const downTrendCount = schools.filter(s => s.trendAnalysis.trend === 'down').length;
  const stableCount = schools.filter(s => s.trendAnalysis.trend === 'stable').length;

  const avgVolatility = schools.length > 0 
    ? schools.reduce((sum, s) => sum + s.trendAnalysis.volatility, 0) / schools.length 
    : 0;

  const highVolatilityCount = schools.filter(s => s.trendAnalysis.volatility > 0.15).length;

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/10 transition-all ${textSecondary}`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回首页</span>
            </button>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {isAuthenticated && (
                <div className={`px-4 py-2 rounded-full glass text-sm ${textSecondary}`}>
                  已登录
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/10 transition-all ${textSecondary}`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </button>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated && (
              <div className={`px-4 py-2 rounded-full glass text-sm ${textSecondary}`}>
                已登录
              </div>
            )}
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className={`text-3xl font-bold mb-3 ${textPrimary}`}>
            数据分析中心
          </h1>
          <p className={`text-lg ${textSecondary}`}>
            基于您的分数 {baseScore} 分，分析各院校录取趋势和风险
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-green-500" />
              </div>
              <span className={`text-sm ${textMuted}`}>分数下降</span>
            </div>
            <div className={`text-3xl font-bold ${textPrimary}`}>{downTrendCount}</div>
            <p className={`text-sm ${textSecondary}`}>所院校分数呈下降趋势</p>
          </div>

          <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
                <Minus className="w-6 h-6 text-gray-500" />
              </div>
              <span className={`text-sm ${textMuted}`}>分数平稳</span>
            </div>
            <div className={`text-3xl font-bold ${textPrimary}`}>{stableCount}</div>
            <p className={`text-sm ${textSecondary}`}>所院校分数保持稳定</p>
          </div>

          <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-500" />
              </div>
              <span className={`text-sm ${textMuted}`}>分数上涨</span>
            </div>
            <div className={`text-3xl font-bold ${textPrimary}`}>{upTrendCount}</div>
            <p className={`text-sm ${textSecondary}`}>所院校分数呈上升趋势</p>
          </div>

          <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-500" />
              </div>
              <span className={`text-sm ${textMuted}`}>高波动</span>
            </div>
            <div className={`text-3xl font-bold ${textPrimary}`}>{highVolatilityCount}</div>
            <p className={`text-sm ${textSecondary}`}>所院校波动较大（{'>'}15%）</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center gap-3 mb-4">
              <PieChart className={`w-5 h-5 ${textSecondary}`} />
              <h3 className={`font-semibold ${textPrimary}`}>趋势分布</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className={`text-sm ${textSecondary}`}>分数下降</span>
                  <span className={`text-sm font-medium ${textPrimary}`}>{((downTrendCount / schools.length) * 100).toFixed(1)}%</span>
                </div>
                <div className={`h-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(downTrendCount / schools.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className={`text-sm ${textSecondary}`}>分数平稳</span>
                  <span className={`text-sm font-medium ${textPrimary}`}>{((stableCount / schools.length) * 100).toFixed(1)}%</span>
                </div>
                <div className={`h-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full transition-all duration-500"
                    style={{ width: `${(stableCount / schools.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className={`text-sm ${textSecondary}`}>分数上涨</span>
                  <span className={`text-sm font-medium ${textPrimary}`}>{((upTrendCount / schools.length) * 100).toFixed(1)}%</span>
                </div>
                <div className={`h-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${(upTrendCount / schools.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className={`w-5 h-5 ${textSecondary}`} />
              <h3 className={`font-semibold ${textPrimary}`}>波动分析</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${textSecondary}`}>平均波动系数</span>
                <span className={`text-2xl font-bold ${textPrimary}`}>{avgVolatility.toFixed(3)}</span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    avgVolatility > 0.15 ? 'bg-orange-500' : avgVolatility > 0.1 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(avgVolatility * 500, 100)}%` }}
                />
              </div>
              <p className={`text-xs ${textMuted}`}>
                波动系数越高，说明该校历年分数线变化越大，填报风险越高
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                  <span className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>低波动</span>
                  <div className={`text-sm font-semibold mt-1 ${textPrimary}`}>{'<'} 0.10</div>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                  <span className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>高波动</span>
                  <div className={`text-sm font-semibold mt-1 ${textPrimary}`}>{'>'} 0.15</div>
                </div>
              </div>
            </div>
          </div>

          <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Target className={`w-5 h-5 ${textSecondary}`} />
              <h3 className={`font-semibold ${textPrimary}`}>录取概率分布</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: '保底区间', range: [80, 100], color: 'from-green-500 to-emerald-500' },
                { label: '稳妥区间', range: [60, 80], color: 'from-blue-500 to-cyan-500' },
                { label: '冲刺区间', range: [40, 60], color: 'from-yellow-500 to-orange-500' },
                { label: '高风险', range: [0, 40], color: 'from-red-500 to-rose-500' },
              ].map((item) => {
                const count = schools.filter(s => 
                  s.probFactors.finalProbability >= item.range[0] && 
                  s.probFactors.finalProbability < item.range[1]
                ).length;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm ${textSecondary}`}>{item.label}</span>
                      <span className={`text-sm font-medium ${textPrimary}`}>{count}</span>
                    </div>
                    <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                      <div 
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                        style={{ width: `${(count / schools.length) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`glass rounded-2xl p-5 ${isDark ? '' : 'shadow-md'}`}>
          <div className="flex items-center gap-3 mb-6">
            <LineChart className={`w-5 h-5 ${textSecondary}`} />
            <h3 className={`font-semibold ${textPrimary}`}>院校趋势排行</h3>
            <Info className={`w-4 h-4 ${textMuted}`} />
            <span className={`text-xs ${textMuted}`}>点击查看详细分析</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <th className={`text-left py-3 px-4 text-sm font-semibold ${textSecondary}`}>院校名称</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${textSecondary}`}>趋势</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${textSecondary}`}>趋势值</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${textSecondary}`}>波动系数</th>
                  <th className={`text-center py-3 px-4 text-sm font-semibold ${textSecondary}`}>录取概率</th>
                </tr>
              </thead>
              <tbody>
                {schools.slice(0, 20).map((school) => (
                  <tr 
                    key={school.id} 
                    className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'} cursor-pointer hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-colors`}
                    onClick={() => setSelectedSchool(school)}
                  >
                    <td className={`py-3 px-4 text-sm ${textPrimary}`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          school.level === '985' ? 'bg-red-500/20 text-red-400' :
                          school.level === '211' ? 'bg-orange-500/20 text-orange-400' :
                          school.level === '双一流' ? 'bg-blue-500/20 text-blue-400' :
                          isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {school.level}
                        </span>
                        {school.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                        school.trendAnalysis.trend === 'up'
                          ? isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                          : school.trendAnalysis.trend === 'down'
                          ? isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-600'
                          : isDark ? 'bg-gray-500/15 text-gray-400' : 'bg-gray-50 text-gray-600'
                      }`}>
                        {school.trendAnalysis.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                        {school.trendAnalysis.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                        {school.trendAnalysis.trend === 'stable' && <Minus className="w-3 h-3" />}
                        {school.trendAnalysis.trend === 'up' ? '上涨' : school.trendAnalysis.trend === 'down' ? '下降' : '平稳'}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-center text-sm font-medium ${textPrimary}`}>
                      {school.trendAnalysis.trendValue.toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 text-center text-sm font-medium ${
                      school.trendAnalysis.volatility > 0.15 ? 'text-orange-500' :
                      school.trendAnalysis.volatility > 0.1 ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {school.trendAnalysis.volatility.toFixed(3)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-20 h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                          <div 
                            className={`h-full rounded-full ${
                              school.probFactors.finalProbability >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              school.probFactors.finalProbability >= 60 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                              school.probFactors.finalProbability >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              'bg-gradient-to-r from-red-500 to-rose-500'
                            }`}
                            style={{ width: `${school.probFactors.finalProbability}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${textPrimary}`}>{school.probFactors.finalProbability}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedSchool && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`glass rounded-2xl p-6 w-full max-w-lg ${isDark ? '' : 'shadow-xl'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>院校详细分析</h3>
                <button 
                  onClick={() => setSelectedSchool(null)}
                  className={`text-2xl ${textMuted} hover:${textSecondary}`}
                >
                  ×
                </button>
              </div>
              
              <div className={`text-lg font-bold mb-2 ${textPrimary}`}>
                {selectedSchool.name}
                <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                  selectedSchool.level === '985' ? 'bg-red-500/20 text-red-400' :
                  selectedSchool.level === '211' ? 'bg-orange-500/20 text-orange-400' :
                  selectedSchool.level === '双一流' ? 'bg-blue-500/20 text-blue-400' :
                  isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                }`}>
                  {selectedSchool.level}
                </span>
              </div>
              <p className={`text-sm ${textSecondary}`}>{selectedSchool.province} · {selectedSchool.nature}</p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <span className={`text-xs ${textMuted}`}>2025年分数线</span>
                  <div className={`text-xl font-bold mt-1 ${textPrimary}`}>{selectedSchool.score2025 || '-'}</div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <span className={`text-xs ${textMuted}`}>2024年分数线</span>
                  <div className={`text-xl font-bold mt-1 ${textPrimary}`}>{selectedSchool.score2024 || '-'}</div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <span className={`text-xs ${textMuted}`}>2023年分数线</span>
                  <div className={`text-xl font-bold mt-1 ${textPrimary}`}>{selectedSchool.score2023 || '-'}</div>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <span className={`text-xs ${textMuted}`}>参考位次</span>
                  <div className={`text-xl font-bold mt-1 ${textPrimary}`}>{selectedSchool.refRank || '-'}</div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className={`text-sm font-semibold mb-3 ${textSecondary}`}>趋势分析</h4>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    selectedSchool.trendAnalysis.trend === 'up'
                      ? isDark ? 'bg-red-500/15' : 'bg-red-50'
                      : selectedSchool.trendAnalysis.trend === 'down'
                      ? isDark ? 'bg-green-500/15' : 'bg-green-50'
                      : isDark ? 'bg-gray-500/15' : 'bg-gray-50'
                  }`}>
                    {selectedSchool.trendAnalysis.trend === 'up' && <TrendingUp className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />}
                    {selectedSchool.trendAnalysis.trend === 'down' && <TrendingDown className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />}
                    {selectedSchool.trendAnalysis.trend === 'stable' && <Minus className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />}
                    <span className={`font-medium ${textPrimary}`}>
                      {selectedSchool.trendAnalysis.trend === 'up' ? '分数上涨' : 
                       selectedSchool.trendAnalysis.trend === 'down' ? '分数下降' : '分数平稳'}
                    </span>
                  </div>
                  <div className={`text-sm ${textSecondary}`}>
                    趋势值: <span className={`font-medium ${textPrimary}`}>{selectedSchool.trendAnalysis.trendValue.toFixed(2)}</span>
                  </div>
                  <div className={`text-sm ${textSecondary}`}>
                    波动系数: <span className={`font-medium ${textPrimary}`}>{selectedSchool.trendAnalysis.volatility.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className={`text-sm font-semibold mb-3 ${textSecondary}`}>录取概率评估</h4>
                <div className="flex items-center gap-4">
                  <div className={`flex-1 h-4 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                    <div 
                      className={`h-full rounded-full ${
                        selectedSchool.probFactors.finalProbability >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        selectedSchool.probFactors.finalProbability >= 60 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                        selectedSchool.probFactors.finalProbability >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-rose-500'
                      }`}
                      style={{ width: `${selectedSchool.probFactors.finalProbability}%` }}
                    />
                  </div>
                  <span className={`text-xl font-bold ${textPrimary}`}>{selectedSchool.probFactors.finalProbability}%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={`${textMuted}`}>基础概率</span>
                    <div className={`font-medium ${textPrimary}`}>{selectedSchool.probFactors.baseProbability}%</div>
                  </div>
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={`${textMuted}`}>趋势系数</span>
                    <div className={`font-medium ${textPrimary}`}>{selectedSchool.probFactors.trendCoefficient.toFixed(3)}</div>
                  </div>
                  <div className={`p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={`${textMuted}`}>波动系数</span>
                    <div className={`font-medium ${textPrimary}`}>{selectedSchool.probFactors.volatilityCoefficient.toFixed(3)}</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedSchool(null)}
                className={`w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all`}
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}