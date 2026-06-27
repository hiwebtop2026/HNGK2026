import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, GraduationCap, ChevronRight, MapPin, Award, Sparkles, Target, Zap, BookOpen,
  Cpu, Radio, Lightbulb, Stethoscope, TrendingUp, Scale, Palette, Database, RefreshCw,
  Trophy, Users, Sun, Moon, School, Info
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { filterSchools, loadSchoolDataFromExcel } from '../utils/volunteerUtils';
import { parseSubjectRequirement, MAJOR_CATEGORIES, matchMajorCategories } from '../utils/dataUtils';
import { fetchRankInfo } from '../utils/dataUtils';
import { SCHOOL_DATA, PROVINCES, SCHOOL_LEVELS, REGION_GROUPS } from '../data/schoolData';

const majorIcons: Record<string, React.ReactNode> = {
  cs: <Cpu className="w-5 h-5" />,
  ee: <Radio className="w-5 h-5" />,
  edu: <BookOpen className="w-5 h-5" />,
  elec: <Zap className="w-5 h-5" />,
  med: <Stethoscope className="w-5 h-5" />,
  fin: <TrendingUp className="w-5 h-5" />,
  law: <Scale className="w-5 h-5" />,
  art: <Palette className="w-5 h-5" />,
};

function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();
  
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn group"
      aria-label="切换主题"
      title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
    >
      <div className="theme-toggle-thumb shadow-lg">
        {theme === 'dark' ? (
          <Sun className="w-3.5 h-3.5 text-white" />
        ) : (
          <Moon className="w-3.5 h-3.5 text-white" />
        )}
      </div>
    </button>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const {
    baseScore,
    scoreRange,
    subject,
    totalVolunteers,
    selectedLevels,
    selectedProvinces,
    selectedMajorCategories,
    schoolData,
    rankInfo,
    isDark,
    error,
    setBaseScore,
    setScoreRange,
    setSubject,
    setTotalVolunteers,
    toggleLevel,
    toggleProvince,
    toggleMajorCategory,
    clearAllProvinces,
    selectAllProvinces,
    toggleRegion,
    setSchoolData,
    setLoading,
    setError,
    setResults,
    setRankInfo,
  } = useAppStore();
  
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  useEffect(() => {
    setSchoolData(SCHOOL_DATA);
  }, [setSchoolData]);
  
  useEffect(() => {
    if (baseScore !== null && baseScore >= 300 && baseScore <= 900) {
      const timer = setTimeout(() => {
        setRankInfo({ 
          isQuerying: true, 
          score: null, 
          rank: null,
          categoryRank: null,
          category: null,
          percentile: null, 
          totalCandidates: null,
          year2025: null, 
          year2024: null, 
          year2023: null,
          dataSource: null,
          note: null,
        });
        
        fetchRankInfo(baseScore, subject).then(info => {
          setRankInfo({
            isQuerying: false,
            score: info.score,
            rank: info.rank,
            categoryRank: info.categoryRank ?? null,
            category: info.category ?? null,
            percentile: info.percentile,
            totalCandidates: info.totalCandidates,
            year2025: info.year2025,
            year2024: info.year2024,
            year2023: info.year2023,
            dataSource: info.dataSource,
            note: info.note,
          });
        });
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setRankInfo({ 
        isQuerying: false, 
        score: null, 
        rank: null,
        categoryRank: null,
        category: null,
        percentile: null, 
        totalCandidates: null,
        year2025: null, 
        year2024: null, 
        year2023: null,
        dataSource: null,
        note: null,
      });
    }
  }, [baseScore, subject, setRankInfo]);
  
  const availableCount = useMemo(() => {
    const data = schoolData.length > 0 ? schoolData : SCHOOL_DATA;
    return data.filter(s => {
      if (subject !== undefined && s.subject !== subject) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(s.level)) return false;
      if (selectedProvinces.length > 0 && !selectedProvinces.includes(s.province)) return false;
      if (selectedMajorCategories.length > 0) {
        const cats = matchMajorCategories(s.name);
        if (!selectedMajorCategories.some(c => cats.includes(c))) return false;
      }
      if (baseScore !== null) {
        const refScore = s.score2025 ?? s.score2024 ?? s.score2023 ?? 0;
        return refScore >= baseScore - scoreRange && refScore <= baseScore + scoreRange;
      }
      return true;
    }).length;
  }, [baseScore, scoreRange, subject, selectedLevels, selectedProvinces, selectedMajorCategories, schoolData]);
  
  const scoreRangeOptions = [10, 15, 20, 25, 30];
  const volunteerOptions = [15, 20, 30, 45];
  
  const subjectOptions = useMemo(() => {
    const data = schoolData.length > 0 ? schoolData : SCHOOL_DATA;
    const subjects = [...new Set(data.map(s => s.subject))];
    return subjects.sort((a, b) => {
      if (a === 0) return -1;
      if (b === 0) return 1;
      return String(a).length - String(b).length || a - b;
    });
  }, [schoolData]);
  
  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    
    try {
      const data = await loadSchoolDataFromExcel(uploadedFile);
      setSchoolData(data);
    } catch {
      setError('文件解析失败，请确保文件格式正确');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  
  const handleGenerate = () => {
    const state = useAppStore.getState();
    const { schoolData, baseScore, scoreRange, subject, totalVolunteers, selectedLevels, selectedProvinces, selectedMajorCategories } = state;
    
    if (schoolData.length === 0) {
      setError('请先上传投档分数线数据文件');
      return;
    }
    
    if (baseScore === null || baseScore < 480 || baseScore > 900) {
      setError('请输入合理的分数范围（480-900分）');
      return;
    }
    
    const results = filterSchools(schoolData, baseScore, scoreRange, subject, totalVolunteers, selectedLevels, selectedProvinces, selectedMajorCategories);
    
    if (results.length === 0) {
      setError('未找到符合条件的院校，请调整分数范围或科目要求');
      return;
    }
    
    setResults(results);
    navigate('/result');
  };
  
  const textPrimary = isDark ? 'text-white' : 'text-gray-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-white/5' : 'bg-white';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const inputFocus = isDark ? 'focus:ring-primary-500/50 focus:border-primary-500/50' : 'focus:ring-primary-500/30 focus:border-primary-400';
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${isDark ? 'bg-primary-500/20' : 'bg-primary-400/20'} rounded-full blur-3xl -translate-y-1/2`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${isDark ? 'bg-accent-500/20' : 'bg-accent-400/20'} rounded-full blur-3xl translate-y-1/2`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${isDark ? 'bg-purple-500/10' : 'bg-purple-400/10'} rounded-full blur-3xl`} />
      </div>
      
      <div className="relative z-10">
        {/* 头部 */}
        <header className="py-8 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <School className="w-5 h-5 text-white" />
                </div>
                <span className={`font-bold text-lg ${textPrimary}`}>高考志愿助手</span>
              </div>
              <ThemeToggle />
            </div>
            
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 ${isDark ? '' : 'shadow-sm'}`}>
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>AI 智能志愿推荐系统</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                <span className="text-gradient">海南高考志愿</span>
                <br className="md:hidden" />
                <span className={textPrimary}> 智能生成系统</span>
              </h1>
              <p className={`${textSecondary} text-lg max-w-2xl mx-auto`}>
                基于近三年投档分数线，结合 AI 算法智能推荐，一键生成个性化志愿方案
              </p>
            </div>
          </div>
        </header>
        
        {/* 主内容区 */}
        <main className="max-w-6xl mx-auto px-6 pb-16">
          {/* 数据上传卡片 */}
          <div className={`glass rounded-2xl p-6 mb-6 animate-fade-in card-hover ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${textPrimary}`}>投档分数线数据</h2>
                <p className={`text-sm ${textSecondary}`}>支持 Excel 文件上传</p>
              </div>
            </div>
            
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-primary-500 bg-primary-500/10'
                  : isDark
                  ? 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                  : 'border-gray-200 hover:border-primary-300 bg-gray-50/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              
              {file ? (
                <div className="flex items-center justify-center gap-3 text-green-500">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>{file.name}</p>
                    <p className={`text-sm ${textSecondary}`}>数据已加载完成</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-500" />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>默认数据已加载</p>
                    <p className={`text-sm ${textSecondary}`}>2023-2025年海南投档分数线（{SCHOOL_DATA.length} 条记录）</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：主要参数 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 分数设置卡片 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>分数设置</h2>
                    <p className={`text-sm ${textSecondary}`}>输入你的高考分数和浮动范围</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>高考分数</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={baseScore ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setBaseScore(null);
                          } else {
                            const num = parseInt(val);
                            setBaseScore(isNaN(num) ? null : num);
                          }
                        }}
                        className={`w-full px-5 py-4 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} text-xl font-bold ${inputFocus} outline-none transition-all`}
                        placeholder="输入高考分数"
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${textMuted} text-sm`}>分</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>分数浮动范围（±分）</label>
                    <div className="flex gap-2">
                      {scoreRangeOptions.map((range) => (
                        <button
                          key={range}
                          onClick={() => setScoreRange(range)}
                          className={`flex-1 px-3 py-3 rounded-xl border font-medium transition-all ${
                            scoreRange === range
                              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white border-transparent shadow-lg shadow-primary-500/25'
                              : isDark
                              ? 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-300'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300 hover:text-gray-700'
                          }`}
                        >
                          ±{range}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 位次信息显示区域 */}
                {baseScore !== null && baseScore >= 480 && baseScore <= 900 && (
                  <div className={`mt-6 rounded-xl p-5 border ${
                    isDark 
                      ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20' 
                      : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                        {rankInfo.isQuerying ? (
                          <RefreshCw className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Database className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <p className={`text-sm font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                        {rankInfo.isQuerying ? '正在从海南省考试局获取位次信息...' : '海南省2026年高考位次参考'}
                      </p>
                    </div>
                    
                    {rankInfo.isQuerying ? (
                      <div className="space-y-2">
                        <div className={`w-full h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" style={{ width: '70%' }} />
                        </div>
                        <p className={`text-xs ${textSecondary}`}>正在查询海南省2023-2025年一分一段数据...</p>
                      </div>
                    ) : rankInfo.rank !== null ? (
                      <div>
                        {/* 突出显示位次信息 - 使用渐变背景卡片 */}
                        <div className={`rounded-xl p-5 mb-4 border ${
                          isDark
                            ? 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border-white/10'
                            : 'bg-gradient-to-br from-white to-gray-50 backdrop-blur-sm border-gray-200'
                        }`}>
                          <div className="grid grid-cols-3 gap-6 text-center">
                            {/* 省内位次 - 重点突出 */}
                            <div className="relative group">
                              <div className={`absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity ${
                                isDark ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' : 'bg-gradient-to-r from-yellow-100 to-orange-100'
                              }`} />
                              <div className="relative">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <Trophy className="w-5 h-5 text-yellow-500" />
                                  <div className={`text-xs ${textSecondary}`}>海南省位次</div>
                                </div>
                                <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg">
                                  {rankInfo.rank.toLocaleString()}
                                </div>
                                <div className={`text-xs ${textMuted} mt-1`}>名（全体考生）</div>
                              </div>
                            </div>
                            
                            {/* 分科位次 */}
                            {rankInfo.categoryRank && (
                              <div className="relative group">
                                <div className={`absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isDark ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20' : 'bg-gradient-to-r from-blue-100 to-indigo-100'
                                }`} />
                                <div className="relative">
                                  <div className="flex items-center justify-center gap-2 mb-2">
                                    <Target className="w-5 h-5 text-blue-500" />
                                    <div className={`text-xs ${textSecondary}`}>{rankInfo.category}位次</div>
                                  </div>
                                  <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 drop-shadow-lg">
                                    {rankInfo.categoryRank.toLocaleString()}
                                  </div>
                                  <div className={`text-xs ${textMuted} mt-1`}>名（选科类）</div>
                                </div>
                              </div>
                            )}
                            
                            {/* 超过考生百分比 */}
                            <div className="relative group">
                              <div className={`absolute inset-0 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity ${
                                isDark ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20' : 'bg-gradient-to-r from-green-100 to-emerald-100'
                              }`} />
                              <div className="relative">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <Users className="w-5 h-5 text-green-500" />
                                  <div className={`text-xs ${textSecondary}`}>超过考生</div>
                                </div>
                                <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 drop-shadow-lg">
                                  {rankInfo.percentile}%
                                </div>
                                <div className={`text-xs ${textMuted} mt-1`}>的考生</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 历年同分数参考 - 显示历年对应分数 */}
                        <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <div className={`text-xs ${textSecondary} mb-2 flex items-center gap-1`}>
                            <TrendingUp className="w-3 h-3" />
                            <span>历年同位次对应分数参考</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className={`rounded-lg py-2 ${isDark ? 'bg-white/5' : 'bg-white border border-gray-100'}`}>
                              <div className={`text-xs ${textMuted} mb-1`}>2025年</div>
                              <div className={`text-sm font-bold ${textPrimary}`}>{rankInfo.year2025}分</div>
                              <div className={`text-xs ${textMuted}`}>（估）</div>
                            </div>
                            <div className={`rounded-lg py-2 ${isDark ? 'bg-white/5' : 'bg-white border border-gray-100'}`}>
                              <div className={`text-xs ${textMuted} mb-1`}>2024年</div>
                              <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{rankInfo.year2024}分</div>
                              <div className={`text-xs ${textMuted}`}>（估）</div>
                            </div>
                            <div className={`rounded-lg py-2 ${isDark ? 'bg-white/5' : 'bg-white border border-gray-100'}`}>
                              <div className={`text-xs ${textMuted} mb-1`}>2023年</div>
                              <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{rankInfo.year2023}分</div>
                              <div className={`text-xs ${textMuted}`}>（估）</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 数据来源和免责声明 */}
                        <div className="mt-3 space-y-1">
                          <div className={`flex items-center justify-center gap-2 text-xs ${textMuted}`}>
                            <Database className="w-3 h-3" />
                            <span>数据来源：{rankInfo.dataSource}</span>
                          </div>
                          <div className={`text-xs ${textMuted} text-center`}>
                            {rankInfo.note}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* 科目与志愿数量 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>选考科目与志愿数量</h2>
                    <p className={`text-sm ${textSecondary}`}>选择你的选考科目组合</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>选考科目要求</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(parseInt(e.target.value))}
                      className={`w-full px-4 py-3.5 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all appearance-none cursor-pointer`}
                    >
                      {subjectOptions.map((s) => (
                        <option key={s} value={s} className={isDark ? 'bg-gray-900' : 'bg-white'}>
                          {parseSubjectRequirement(s)}（{s}）
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3`}>志愿数量</label>
                    <div className="flex gap-2">
                      {volunteerOptions.map((count) => (
                        <button
                          key={count}
                          onClick={() => setTotalVolunteers(count)}
                          className={`flex-1 px-3 py-3.5 rounded-xl border font-medium transition-all ${
                            totalVolunteers === count
                              ? 'bg-gradient-to-r from-accent-600 to-accent-500 text-white border-transparent shadow-lg shadow-accent-500/25'
                              : isDark
                              ? 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-300'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-accent-300 hover:text-gray-700'
                          }`}
                        >
                          {count}个
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 专业类别筛选 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>重点专业方向</h2>
                    <p className={`text-sm ${textSecondary}`}>选择你感兴趣的专业类别（可多选，不选则全部）</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {MAJOR_CATEGORIES.map((category) => {
                    const isSelected = selectedMajorCategories.includes(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => toggleMajorCategory(category.id)}
                        className={`p-4 rounded-xl border transition-all text-left group ${
                          isSelected
                            ? 'border-transparent shadow-lg'
                            : isDark
                            ? 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                            : 'border-gray-200 hover:border-primary-300 bg-white'
                        }`}
                        style={isSelected ? {
                          background: isDark
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(217,70,239,0.2))'
                            : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(217,70,239,0.1))',
                          boxShadow: isDark ? '0 0 20px rgba(99, 102, 241, 0.2)' : '0 0 20px rgba(99, 102, 241, 0.1)',
                        } : {}}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 ${
                          isSelected ? 'scale-110' : ''
                        } transition-transform text-white`}>
                          {majorIcons[category.id]}
                        </div>
                        <p className={`font-medium text-sm ${isSelected ? textPrimary : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {category.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {selectedMajorCategories.length > 0 && (
                  <p className="mt-4 text-sm text-primary-500 font-medium">
                    已选择 {selectedMajorCategories.length} 个专业方向
                  </p>
                )}
              </div>
            </div>
            
            {/* 右侧：筛选条件 */}
            <div className="space-y-6">
              {/* 院校层次 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-md">
                    <Award className="w-4 h-5 text-white" />
                  </div>
                  <h3 className={`font-semibold ${textPrimary}`}>院校层次</h3>
                </div>
                <div className="space-y-2">
                  {SCHOOL_LEVELS.map((level) => {
                    const isSelected = selectedLevels.includes(level);
                    return (
                      <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        className={`w-full px-4 py-3 rounded-xl border text-left font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? isDark
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-500'
                            : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 text-yellow-700'
                            : isDark
                            ? 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
                        }`}
                      >
                        <span>{level}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center shadow-sm">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className={`mt-3 text-xs ${textMuted}`}>已选 {selectedLevels.length} 个层次</p>
              </div>
              
              {/* 地域选择 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.25s' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-md">
                      <MapPin className="w-4 h-5 text-white" />
                    </div>
                    <h3 className={`font-semibold ${textPrimary}`}>地域选择</h3>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={selectAllProvinces}
                      className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
                    >
                      全选
                    </button>
                    <span className={textMuted}>|</span>
                    <button
                      onClick={clearAllProvinces}
                      className={`${textMuted} hover:${textSecondary} font-medium transition-colors`}
                    >
                      清空
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {REGION_GROUPS.map((region) => {
                    const allSelected = region.provinces.every(p => selectedProvinces.includes(p));
                    const someSelected = region.provinces.some(p => selectedProvinces.includes(p));
                    return (
                      <button
                        key={region.name}
                        onClick={() => toggleRegion(region.provinces)}
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${
                          allSelected
                            ? isDark
                            ? 'bg-green-500/20 border-green-500/30 text-green-400'
                            : 'bg-green-50 border-green-300 text-green-700'
                            : someSelected
                            ? isDark
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-green-50/50 border-green-200 text-green-600'
                            : isDark
                            ? 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <span>{region.name}</span>
                        <span className="text-xs opacity-70">{region.provinces.length}省</span>
                      </button>
                    );
                  })}
                </div>
                
                <div className={`max-h-32 overflow-y-auto space-y-1 scrollbar-thin p-1 rounded-lg ${isDark ? '' : 'bg-gray-50/50'}`}>
                  {PROVINCES.map((province) => {
                    const isSelected = selectedProvinces.includes(province);
                    return (
                      <button
                        key={province}
                        onClick={() => toggleProvince(province)}
                        className={`w-full px-3 py-2 rounded-lg text-sm transition-all text-left ${
                          isSelected
                            ? isDark
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-green-100 text-green-700'
                            : isDark
                            ? 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                      >
                        {province}
                      </button>
                    );
                  })}
                </div>
                <p className={`mt-3 text-xs ${textMuted}`}>
                  已选 {selectedProvinces.length} 个地区 {selectedProvinces.length === 0 && '（默认全部）'}
                </p>
              </div>
              
              {/* 提示卡片 */}
              <div className={`glass rounded-2xl p-5 animate-slide-up ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.35s' }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className={`font-medium text-sm ${textPrimary} mb-1`}>温馨提示</h4>
                    <p className={`text-xs ${textSecondary} leading-relaxed`}>
                      志愿填报需综合考虑兴趣、就业、地域等多方面因素。本系统推荐结果仅供参考，请结合实际情况谨慎填报。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 统计与生成按钮 */}
          <div className={`mt-8 glass rounded-2xl p-6 animate-slide-up ${isDark ? '' : 'shadow-lg'}`} style={{ animationDelay: '0.4s' }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className={`text-sm ${textSecondary} mb-1`}>符合条件</p>
                  <p className="text-3xl font-bold text-gradient">{availableCount}</p>
                  <p className={`text-xs ${textMuted}`}>条院校记录</p>
                </div>
                <div className={`w-px h-16 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className={`text-sm ${textSecondary} space-y-1`}>
                  <p>分数范围：<span className={`${textPrimary} font-medium`}>{baseScore !== null ? `${baseScore - scoreRange} - ${baseScore + scoreRange} 分` : '待输入'}</span></p>
                  <p>科目要求：<span className={`${textPrimary} font-medium`}>{parseSubjectRequirement(subject)}</span></p>
                </div>
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={useAppStore.getState().isLoading || availableCount === 0 || baseScore === null}
                className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white rounded-xl font-semibold text-lg shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                <span>一键生成志愿方案</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            {error && (
              <div className={`mt-4 p-4 rounded-xl text-sm ${
                isDark 
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                {error}
              </div>
            )}
          </div>
          
          {/* 使用说明 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '📊', title: '智能算法', desc: '基于历年分数线，科学计算录取概率' },
              { icon: '🎯', title: '精准推荐', desc: '冲稳保三档合理分配，志愿更科学' },
              { icon: '📥', title: '一键导出', desc: '支持Excel导出，方便查看与调整' },
            ].map((item, i) => (
              <div key={i} className={`glass rounded-xl p-5 text-center animate-slide-up card-hover ${isDark ? '' : 'shadow-sm'}`} style={{ animationDelay: `${0.45 + i * 0.1}s` }}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h4 className={`font-semibold ${textPrimary} mb-1`}>{item.title}</h4>
                <p className={`text-sm ${textSecondary}`}>{item.desc}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
