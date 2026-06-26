import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, AlertCircle, Zap, Target, Shield, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { exportToExcel } from '../utils/volunteerUtils';
import { parseSubjectRequirement, matchMajorCategories, MAJOR_CATEGORIES } from '../utils/dataUtils';

export function ResultPage() {
  const navigate = useNavigate();
  const { results, baseScore, scoreRange, subject, totalVolunteers, reset } = useAppStore();
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
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          text: 'text-orange-400',
          badge: 'bg-gradient-to-r from-orange-500 to-red-500',
        };
      case '稳':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          badge: 'bg-gradient-to-r from-yellow-500 to-amber-500',
        };
      case '保':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          text: 'text-green-400',
          badge: 'bg-gradient-to-r from-green-500 to-emerald-500',
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          badge: 'bg-gray-500',
        };
    }
  };
  
  const getScoreDiff = (refScore: number) => {
    const diff = refScore - baseScore;
    if (diff > 0) return { icon: <TrendingUp className="w-3 h-3" />, text: `+${diff}`, color: 'text-red-400' };
    if (diff < 0) return { icon: <TrendingDown className="w-3 h-3" />, text: `${diff}`, color: 'text-green-400' };
    return { icon: <Minus className="w-3 h-3" />, text: '0', color: 'text-gray-400' };
  };
  
  if (results.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-10 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 text-lg mb-6">暂无志愿方案数据</p>
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl translate-y-1/2" />
      </div>
      
      <div className="relative z-10">
        {/* 头部 */}
        <header className="glass border-b border-white/10 py-4 sticky top-0 z-50 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">志愿方案结果</h1>
                <p className="text-xs text-gray-400">为你智能生成 {results.length} 个志愿</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>导出Excel</span>
            </button>
          </div>
        </header>
        
        {/* 主内容区 */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* 参数信息条 */}
          <div className="glass rounded-2xl p-5 mb-8">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">基准分数</span>
                <span className="text-white font-bold text-lg">{baseScore} 分</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-gray-400">分数范围</span>
                <span className="text-white font-medium">±{scoreRange} ({baseScore - scoreRange} - {baseScore + scoreRange})</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-gray-400">科目要求</span>
                <span className="text-white font-medium">{parseSubjectRequirement(subject)}</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-gray-400">志愿数量</span>
                <span className="text-white font-medium">{totalVolunteers} 个</span>
              </div>
            </div>
          </div>
          
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-gray-400">总志愿数</p>
              </div>
              <p className="text-3xl font-bold text-gradient">{results.length}</p>
            </div>
            
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-gray-400">冲志愿</p>
              </div>
              <p className="text-3xl font-bold text-orange-400">{chongCount}</p>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                  style={{ width: `${(chongCount / results.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-gray-400">稳志愿</p>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{wenCount}</p>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                  style={{ width: `${(wenCount / results.length) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-gray-400">保志愿</p>
              </div>
              <p className="text-3xl font-bold text-green-400">{baoCount}</p>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                  style={{ width: `${(baoCount / results.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* 筛选标签 */}
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-4 h-4 text-gray-400" />
            {['all', '冲', '稳', '保'].map((tier) => (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTier === tier
                    ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25'
                    : 'glass text-gray-400 hover:text-gray-300'
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
              
              return (
                <div
                  key={volunteer.index}
                  className={`glass rounded-2xl p-5 border ${tierStyle.border} hover:shadow-lg transition-all group`}
                >
                  <div className="flex items-start gap-5">
                    {/* 序号和档次 */}
                    <div className="flex flex-col items-center gap-2">
                      <span className={`text-2xl font-bold ${tierStyle.text}`}>
                        {String(volunteer.index).padStart(2, '0')}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${tierStyle.badge}`}>
                        {volunteer.tier}
                      </span>
                    </div>
                    
                    {/* 院校信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-white truncate">{volunteer.name}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">院校代码：{volunteer.code}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-white">{volunteer.refScore}</p>
                            <div className={`flex items-center justify-center gap-1 text-xs ${scoreDiff.color}`}>
                              {scoreDiff.icon}
                              <span>{scoreDiff.text}分</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          volunteer.level === '985' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          volunteer.level === '211' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          volunteer.level === '双一流' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {volunteer.level}
                        </span>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                          {volunteer.province}
                        </span>
                        {majorCats.slice(0, 2).map(catId => {
                          const cat = MAJOR_CATEGORIES.find(c => c.id === catId);
                          if (!cat) return null;
                          return (
                            <span key={catId} className="px-2 py-0.5 rounded-md text-xs bg-primary-500/20 text-primary-400 border border-primary-500/30">
                              {cat.name}
                            </span>
                          );
                        })}
                      </div>
                      
                      {/* 历年分数线 */}
                      <div className="flex items-center gap-6 mb-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">2025</p>
                          <p className="text-sm font-medium text-gray-300">{volunteer.score2025 ?? '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">2024</p>
                          <p className="text-sm font-medium text-gray-300">{volunteer.score2024 ?? '-'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">2023</p>
                          <p className="text-sm font-medium text-gray-300">{volunteer.score2023 ?? '-'}</p>
                        </div>
                      </div>
                      
                      {/* 专业推荐 */}
                      {volunteer.majorRecommendations && volunteer.majorRecommendations.length > 0 && (
                        <div className={`${tierStyle.bg} rounded-xl p-4 border ${tierStyle.border}`}>
                          <p className="text-xs font-medium text-gray-400 mb-2">专业推荐（录取概率）</p>
                          <div className="grid grid-cols-2 gap-2">
                            {volunteer.majorRecommendations.slice(0, 4).map((major, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    major.admissionTier === '保底' ? 'bg-green-500' :
                                    major.admissionTier === '稳妥' ? 'bg-yellow-500' : 'bg-orange-500'
                                  }`} />
                                  <span className="text-sm text-gray-300 truncate">{major.name}</span>
                                </div>
                                <span className={`text-xs font-bold flex-shrink-0 ${
                                  major.admissionTier === '保底' ? 'text-green-400' :
                                  major.admissionTier === '稳妥' ? 'text-yellow-400' : 'text-orange-400'
                                }`}>
                                  {Math.round(major.probability)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 推荐理由 */}
                      <p className="text-sm text-gray-400 mt-4 leading-relaxed">
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
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">冲志愿</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                投档线高于考生分数，录取概率较低，建议作为冲刺目标谨慎填报，名额不宜过多。
              </p>
            </div>
            
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">稳志愿</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                投档线与考生分数接近，录取把握较大，是志愿填报的核心选择，建议占主要比例。
              </p>
            </div>
            
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-white">保志愿</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                投档线低于考生分数，录取概率很高，确保不会滑档的保底选择，建议合理设置。
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
