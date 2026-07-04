import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, GraduationCap, ChevronRight, MapPin, Award, Sparkles, Target, Zap, BookOpen,
  Cpu, Radio, Lightbulb, Stethoscope, TrendingUp, Scale, Palette, Database, RefreshCw,
  Trophy, Users, Sun, Moon, School, Info, LogOut, User, AlertCircle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useUsageStore } from '../store/usageStore';
import { filterSchools, filterSchoolsAsync, loadSchoolDataFromExcel } from '../utils/volunteerUtils';
import { parseSubjectRequirement, MAJOR_CATEGORIES, matchMajorCategories, SUBJECT_LIST } from '../utils/dataUtils';
import { fetchRankInfo } from '../utils/dataUtils';
import { SCHOOL_DATA, PROVINCES, SCHOOL_LEVELS, SCHOOL_NATURES, REGION_GROUPS } from '../data/schoolData';
import { ALL_MAJORS, MAJOR_CATEGORIES as ALL_MAJOR_CATEGORIES, getMajorsByCategory } from '../data/majorData';

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
    isAuthenticated,
    user,
    logout,
    checkAuth,
  } = useAuthStore();
  const { logGeneratePlan, logAction } = useUsageStore();
  const {
    baseScore,
    scoreRange,
    subject,
    selectedSubjects,
    totalVolunteers,
    chongCount,
    wenCount,
    baoCount,
    useCustomTierCounts,
    chongScoreDiff,
    wenScoreDiff,
    baoScoreDiff,
    useCustomTierScoreDiffs,
    selectedLevels,
    selectedProvinces,
    selectedMajorCategories,
    selectedNatures,
    selectedMajors,
    excludedMajors,
    schoolData,
    rankInfo,
    isDark,
    error,
    currentRegion,
    availableRegions,
    provinceConfig,
    setBaseScore,
    setScoreRange,
    setSubject,
    toggleSelectedSubject,
    setTotalVolunteers,
    setChongCount,
    setWenCount,
    setBaoCount,
    setUseCustomTierCounts,
    setChongScoreDiff,
    setWenScoreDiff,
    setBaoScoreDiff,
    setUseCustomTierScoreDiffs,
    toggleNature,
    toggleLevel,
    toggleProvince,
    toggleMajorCategory,
    toggleMajor,
    toggleExcludedMajor,
    clearAllMajors,
    clearAllExcludedMajors,
    clearAllProvinces,
    selectAllProvinces,
    toggleRegion,
    setSchoolData,
    setLoading,
    setError,
    setResults,
    setRankInfo,
    setCurrentRegion,
    loadFromSupabase,
  } = useAppStore();
  
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // 检查认证状态并设置页面标题
  useEffect(() => {
    document.title = '智能高考志愿助理';
    checkAuth();
  }, [checkAuth]);

  // 页面初始化时主动加载当前地区数据（解决schoolData为空导致无法生成志愿的问题）
  useEffect(() => {
    // 清除旧的一分一段表缓存（修复历史遗留的空结果缓存问题）
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('gaokao_cache:getRankByScore') || 
            key.startsWith('gaokao_cache:getStats') ||
            key.startsWith('gaokao_cache:getByProvinceAndYear') ||
            key.startsWith('gaokao_cache:getByYear')) {
          localStorage.removeItem(key);
          console.debug('[Cache] 清除旧缓存:', key);
        }
      });
    } catch (e) {
      console.warn('[Cache] 清除缓存失败:', e);
    }

    const state = useAppStore.getState();
    if (state.schoolData.length === 0) {
      loadFromSupabase(state.currentRegion);
    }
    // 仅在首次挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 计算冲稳保总数
  const tierTotalCount = chongCount + wenCount + baoCount;
  const isTierCountValid = tierTotalCount <= totalVolunteers;
  
  useEffect(() => {
    const { minScore = 200, maxScore = 750 } = provinceConfig || {};
    if (baseScore !== null && baseScore >= minScore && baseScore <= maxScore) {
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
        
        fetchRankInfo(baseScore, subject, currentRegion).then(info => {
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
  }, [baseScore, subject, currentRegion, provinceConfig, setRankInfo]);
  
  const availableCount = useMemo(() => {
    const data = schoolData.length > 0 ? schoolData : SCHOOL_DATA;
    return data.filter(s => {
      if (subject !== undefined && s.subject !== subject) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(s.level)) return false;
      if (selectedNatures.length > 0 && !selectedNatures.includes(s.nature)) return false;
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
  }, [baseScore, scoreRange, subject, selectedLevels, selectedNatures, selectedProvinces, selectedMajorCategories, schoolData]);
  
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
      
      // 记录文件上传行为
      if (isAuthenticated) {
        logAction('upload_data', {
          file_name: uploadedFile.name,
          file_size: uploadedFile.size,
          records_count: data.length,
        });
      }
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
  
  const handleGenerate = async () => {
    // 检查认证状态
    if (!isAuthenticated) {
      setError('请先注册账号以使用志愿生成功能');
      return;
    }

    // 检查选科组合（必填）
    if (selectedSubjects.length === 0) {
      setError('请先选择选考科目组合后再使用志愿生成功能');
      return;
    }

    const state = useAppStore.getState();
    const { schoolData, baseScore, scoreRange, subject, totalVolunteers, selectedLevels, selectedProvinces, selectedMajorCategories, selectedNatures, chongCount, wenCount, baoCount, useCustomTierCounts, chongScoreDiff, wenScoreDiff, baoScoreDiff, useCustomTierScoreDiffs } = state;

    const { minScore = 200, maxScore = 750 } = provinceConfig || {};
    if (baseScore === null || baseScore < minScore || baseScore > maxScore) {
      setError(`请输入合理的分数范围（${minScore}-${maxScore}分）`);
      return;
    }

    // 如果使用自定义冲稳保数量，检查总数是否有效
    if (useCustomTierCounts && (chongCount + wenCount + baoCount) > totalVolunteers) {
      setError('冲稳保总数超出志愿数量限制，请调整分配');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let currentSchoolData = schoolData;

      // 数据为空时主动从云端加载当前地区数据
      if (currentSchoolData.length === 0) {
        await loadFromSupabase(currentRegion);
        currentSchoolData = useAppStore.getState().schoolData;
      }

      if (currentSchoolData.length === 0) {
        setError(`${currentRegion}地区暂无投档数据，请导入该地区数据后再使用志愿生成功能`);
        setLoading(false);
        return;
      }

      const results = await filterSchoolsAsync(
        currentSchoolData,
        baseScore,
        scoreRange,
        subject,
        totalVolunteers,
        selectedLevels,
        selectedProvinces,
        selectedMajorCategories,
        selectedNatures,
        useCustomTierCounts ? chongCount : undefined,
        useCustomTierCounts ? wenCount : undefined,
        useCustomTierCounts ? baoCount : undefined,
        useCustomTierScoreDiffs ? chongScoreDiff : undefined,
        useCustomTierScoreDiffs ? wenScoreDiff : undefined,
        useCustomTierScoreDiffs ? baoScoreDiff : undefined,
        selectedSubjects,
        selectedMajors,
        excludedMajors
      );

      if (results.length === 0) {
        setError('未找到符合条件的院校，请调整分数范围或科目要求');
        return;
      }

      setResults(results);
      
      // 记录志愿生成行为
      if (isAuthenticated) {
        logGeneratePlan(baseScore, subject, totalVolunteers, results.length, {
          score_range: scoreRange,
          chong_count: useCustomTierCounts ? chongCount : Math.ceil(totalVolunteers * 0.3),
          wen_count: useCustomTierCounts ? wenCount : Math.ceil(totalVolunteers * 0.4),
          bao_count: useCustomTierCounts ? baoCount : Math.max(0, totalVolunteers - Math.ceil(totalVolunteers * 0.3) - Math.ceil(totalVolunteers * 0.4)),
          selected_levels_count: selectedLevels.length,
          selected_provinces_count: selectedProvinces.length,
          selected_categories_count: selectedMajorCategories.length,
          selected_subjects_count: selectedSubjects.length,
        });
      }
      
      navigate('/result');
    } catch (error) {
      console.error('生成志愿方案失败:', error);
      setError('生成志愿方案失败，请重试');
    } finally {
      setLoading(false);
    }
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
                <span className={`font-bold text-lg ${textPrimary}`}>智能高考志愿助理</span>
              </div>
              <div className="flex items-center gap-4">
                {/* 用户信息显示 */}
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                      isDark ? 'bg-white/5' : 'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm ${textSecondary}`}>
                        {user.email}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/auth');
                      }}
                      className={`flex items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                        isDark
                        ? 'bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400'
                        : 'bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600'
                      }`}
                      title="退出登录"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">退出</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/auth')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      isDark
                      ? 'bg-primary-500/20 hover:bg-primary-500/30 text-primary-400'
                      : 'bg-primary-50 hover:bg-primary-100 text-primary-600'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">登录/注册</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/majorscore')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    isDark
                    ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">专业分数线</span>
                </button>
                <ThemeToggle />
              </div>
            </div>
            
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 ${isDark ? '' : 'shadow-sm'}`}>
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>AI 智能志愿推荐系统</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                <span className="text-gradient">{currentRegion}高考志愿</span>
                <br className="md:hidden" />
                <span className={textPrimary}> 智能生成系统</span>
              </h1>
              <p className={`${textSecondary} text-lg max-w-2xl mx-auto`}>
                基于近三年投档分数线，结合 AI 算法智能推荐，一键生成个性化志愿方案
              </p>
            </div>
          </div>
        </header>

        {/* 顶部地区与选科组合栏（页首固定区域） */}
        <div className="max-w-6xl mx-auto px-6 mb-6">
          <div className={`glass rounded-2xl p-4 md:p-5 animate-fade-in ${isDark ? '' : 'shadow-md'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* 地区选择 */}
              <div className="flex items-center gap-3 lg:min-w-[220px]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${textMuted} mb-1`}>高考地区</p>
                  <div className="relative">
                    <select
                      value={currentRegion}
                      onChange={(e) => setCurrentRegion(e.target.value)}
                      className={`appearance-none w-full px-4 py-2.5 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} text-sm font-medium ${inputFocus} outline-none cursor-pointer pr-9`}
                    >
                      {availableRegions.map((region) => (
                        <option key={region} value={region} className={isDark ? 'bg-gray-900' : 'bg-white'}>
                          {region}高考
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none opacity-50" />
                  </div>
                </div>
              </div>

              {/* 分隔线 */}
              <div className={`hidden lg:block w-px self-stretch ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

              {/* 选考科目 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    <p className={`text-xs font-medium ${textSecondary}`}>
                      选考科目
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedSubjects.length === 0
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-green-500/20 text-green-500'
                      }`}>
                        {selectedSubjects.length === 0 ? '未选' : `${selectedSubjects.length}科`}
                      </span>
                    </p>
                  </div>
                  {selectedSubjects.length > 0 && (
                    <p className={`text-xs ${textMuted} hidden md:block`}>
                      ✓ {selectedSubjects.map(c => SUBJECT_LIST.find(s => s.code === c)?.name).join('、')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_LIST.map((sub) => (
                    <button
                      key={sub.code}
                      onClick={() => toggleSelectedSubject(sub.code)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedSubjects.includes(sub.code)
                          ? `bg-gradient-to-r ${sub.color} text-white shadow-md`
                          : isDark
                          ? 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-gray-300'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-300 hover:text-gray-700'
                      }`}
                    >
                      <span>{sub.icon}</span>
                      <span>{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 考试模式与总分提示 */}
            {provinceConfig && (
              <div className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-x-5 gap-y-1 text-xs ${textSecondary} ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <span>📋 考试模式：{provinceConfig.examMode === '3+3' ? '3+3 新高考' : provinceConfig.examMode === '3+1+2' ? '3+1+2 新高考' : '3+X 传统高考'}</span>
                <span>📊 总分：{provinceConfig.totalScore}分</span>
                {provinceConfig && !provinceConfig.dataAvailable && (
                  <span className={isDark ? 'text-yellow-400' : 'text-yellow-600'}>⚠️ 该省份数据暂未开放</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <main className="max-w-6xl mx-auto px-6 pb-16">
          {/* 未认证提示卡片 */}
          {!isAuthenticated && (
            <div className={`glass rounded-2xl p-6 mb-6 animate-fade-in ${
              isDark
              ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-1`}>请先注册账号</h3>
                    <p className={`text-sm ${textSecondary}`}>
                      注册账号后即可使用志愿生成、导出等功能，更好地规划你的高考志愿
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/auth')}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] transition-all flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>立即注册</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

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
              ) : schoolData.length > 0 ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Database className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>{currentRegion}数据已加载</p>
                    <p className={`text-sm ${textSecondary}`}>2023-2025年{currentRegion}投档分数线（{schoolData.length} 条记录）</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${textPrimary}`}>{currentRegion}暂无数据</p>
                    <p className={`text-sm ${textSecondary}`}>请上传Excel文件导入该地区投档分数线数据</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：主要参数 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 分数设置与位次信息卡片 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover relative transition-all ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
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
                {(() => {
                    const { minScore = 200, maxScore = 750 } = provinceConfig || {};
                    return baseScore !== null && baseScore >= minScore && baseScore <= maxScore;
                  })() && (
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
                        {rankInfo.isQuerying ? `正在从${currentRegion}省考试局获取位次信息...` : `${currentRegion}省2026年高考位次参考`}
                      </p>
                    </div>
                    
                    {rankInfo.isQuerying ? (
                      <div className="space-y-2">
                        <div className={`w-full h-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" style={{ width: '70%' }} />
                        </div>
                        <p className={`text-xs ${textSecondary}`}>正在查询{currentRegion}2026年一分一段表数据...</p>
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
                                  <div className={`text-xs ${textSecondary}`}>{currentRegion}省位次</div>
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
                    ) : (
                      <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-orange-400" />
                        <p className={`text-sm font-medium ${textPrimary} mb-1`}>
                          {currentRegion}一分一段表数据暂未录入
                        </p>
                        <p className={`text-xs ${textSecondary}`}>
                          {rankInfo.note || '请选择其他地区或稍后再试'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 选考科目要求与志愿数量 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>选科要求与志愿数量</h2>
                    <p className={`text-sm ${textSecondary}`}>设置院校选科要求筛选与志愿数量</p>
                  </div>
                </div>

                {/* 已选科目摘要（只读展示，请在页面顶部修改） */}
                <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-sm ${
                  selectedSubjects.length === 0
                    ? (isDark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700')
                    : (isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-50 text-gray-700')
                }`}>
                  <GraduationCap className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {selectedSubjects.length === 0
                      ? '未选择选科组合，请在页面顶部完成选择'
                      : `当前选科：${selectedSubjects.map(c => SUBJECT_LIST.find(s => s.code === c)?.name).join('、')}`
                    }
                  </span>
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

              {/* 冲稳保志愿分配 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.25s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>冲稳保志愿分配</h2>
                    <p className={`text-sm ${textSecondary}`}>自定义各档次志愿数量</p>
                  </div>
                </div>

                {/* 开关：是否自定义分配 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>自定义分配数量</span>
                    <span className={`text-xs ${textMuted}`}>（关闭则自动按比例分配）</span>
                  </div>
                  <button
                    onClick={() => setUseCustomTierCounts(!useCustomTierCounts)}
                    className={`relative w-12 h-6 rounded-full transition-all ${
                      useCustomTierCounts
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : isDark
                        ? 'bg-white/10'
                        : 'bg-gray-200'
                    }`}
                  >
                    <div className={`absolute w-5 h-5 rounded-full bg-white shadow-md top-0.5 transition-all ${
                      useCustomTierCounts ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {/* 自定义数量输入框 */}
                {useCustomTierCounts && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {/* 冲数量 */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-red-400' : 'text-red-600'
                        }`}>冲刺志愿</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={totalVolunteers}
                            value={chongCount}
                            onChange={(e) => setChongCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all text-center font-bold`}
                          />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>个</span>
                        </div>
                      </div>

                      {/* 稳数量 */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-amber-400' : 'text-amber-600'
                        }`}>稳妥志愿</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={totalVolunteers}
                            value={wenCount}
                            onChange={(e) => setWenCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all text-center font-bold`}
                          />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>个</span>
                        </div>
                      </div>

                      {/* 保数量 */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          isDark ? 'text-green-400' : 'text-green-600'
                        }`}>保底志愿</label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={totalVolunteers}
                            value={baoCount}
                            onChange={(e) => setBaoCount(Math.max(0, parseInt(e.target.value) || 0))}
                            className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all text-center font-bold`}
                          />
                          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>个</span>
                        </div>
                      </div>
                    </div>

                    {/* 总数显示 */}
                    <div className={`flex items-center justify-between p-3 rounded-xl ${
                      isTierCountValid
                        ? isDark
                        ? 'bg-white/5'
                        : 'bg-gray-50'
                        : isDark
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <span className={`text-sm ${textSecondary}`}>
                        当前总数：<span className={`font-bold ${isTierCountValid ? textPrimary : (isDark ? 'text-red-400' : 'text-red-600')}`}>{tierTotalCount}</span> 个
                      </span>
                      <span className={`text-sm ${textMuted}`}>
                        限制：<span className={`font-medium ${textSecondary}`}>{totalVolunteers}</span> 个
                      </span>
                    </div>

                    {/* 错误提示 */}
                    {!isTierCountValid && (
                      <div className={`flex items-center gap-2 p-3 rounded-xl ${
                        isDark
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-red-50 border border-red-200 text-red-600'
                      }`}>
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">总数超出限制，请调整分配数量</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 未开启自定义时显示提示 */}
                {!useCustomTierCounts && (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-sm ${textSecondary} mb-2`}>
                      默认分配比例：
                    </p>
                    <div className="flex justify-center gap-6">
                      <div className="text-center">
                        <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>冲 {chongCount}个</span>
                        <span className={`text-xs ${textMuted}`}>（30%）</span>
                      </div>
                      <div className="text-center">
                        <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>稳 {wenCount}个</span>
                        <span className={`text-xs ${textMuted}`}>（40%）</span>
                      </div>
                      <div className="text-center">
                        <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>保 {baoCount}个</span>
                        <span className={`text-xs ${textMuted}`}>（30%）</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 冲稳保分数差自定义 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>冲稳保分数差设置</h2>
                    <p className={`text-sm ${textSecondary}`}>自定义各档次的分数阈值（冲超过X分，稳上下X分，保低于X分）</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>自定义分数差</span>
                    <span className={`text-xs ${textMuted}`}>（关闭则使用默认值）</span>
                  </div>
                  <button
                    onClick={() => setUseCustomTierScoreDiffs(!useCustomTierScoreDiffs)}
                    className={`relative w-12 h-6 rounded-full transition-all ${
                      useCustomTierScoreDiffs
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                        : isDark
                        ? 'bg-white/10'
                        : 'bg-gray-200'
                    }`}
                  >
                    <div className={`absolute w-5 h-5 rounded-full bg-white shadow-md top-0.5 transition-all ${
                      useCustomTierScoreDiffs ? 'left-6.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                {useCustomTierScoreDiffs && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-red-400' : 'text-red-600'
                      }`}>冲刺分数差（+分）</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={chongScoreDiff}
                          onChange={(e) => setChongScoreDiff(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                          className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all text-center font-bold`}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>分</span>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      }`}>稳妥分数差（±分）</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={wenScoreDiff}
                          onChange={(e) => setWenScoreDiff(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                          className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all text-center font-bold`}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>分</span>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        isDark ? 'text-green-400' : 'text-green-600'
                      }`}>保底分数差（-分）</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={baoScoreDiff}
                          onChange={(e) => setBaoScoreDiff(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                          className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-xl ${textPrimary} ${inputFocus} outline-none transition-all text-center font-bold`}
                        />
                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textMuted}`}>分</span>
                      </div>
                    </div>
                  </div>
                )}

                {!useCustomTierScoreDiffs && (
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-sm ${textSecondary} mb-2`}>
                      默认分数差：
                    </p>
                    <div className="flex justify-center gap-6">
                      <div className="text-center">
                        <span className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>冲 +{chongScoreDiff}分</span>
                      </div>
                      <div className="text-center">
                        <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>稳 ±{wenScoreDiff}分</span>
                      </div>
                      <div className="text-center">
                        <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>保 -{baoScoreDiff}分</span>
                      </div>
                    </div>
                  </div>
                )}
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
              
              {/* 专业偏好筛选 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.35s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-md">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className={`text-lg font-semibold ${textPrimary}`}>专业偏好</h2>
                    <p className={`text-sm ${textSecondary}`}>选择你想学的专业（绿色）和不想学的专业（红色）</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* 想学的专业 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-medium ${textPrimary}`}>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          想学的专业
                        </span>
                      </h3>
                      {selectedMajors.length > 0 && (
                        <button
                          onClick={clearAllMajors}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          清空
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedMajors.map((major) => (
                        <span
                          key={major}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium"
                        >
                          {major}
                          <button
                            onClick={() => toggleMajor(major)}
                            className="hover:text-green-900 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {selectedMajors.length === 0 && (
                        <span className={`text-sm ${textSecondary}`}>点击下方专业添加到想学列表</span>
                      )}
                    </div>
                  </div>
                  
                  {/* 不想学的专业 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-medium ${textPrimary}`}>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          不想学的专业
                        </span>
                      </h3>
                      {excludedMajors.length > 0 && (
                        <button
                          onClick={clearAllExcludedMajors}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          清空
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {excludedMajors.map((major) => (
                        <span
                          key={major}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-medium"
                        >
                          {major}
                          <button
                            onClick={() => toggleExcludedMajor(major)}
                            className="hover:text-red-900 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {excludedMajors.length === 0 && (
                        <span className={`text-sm ${textSecondary}`}>点击下方专业添加到排除列表</span>
                      )}
                    </div>
                  </div>
                  
                  {/* 专业选择列表 */}
                  <div>
                    <div className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'
                    }`}>
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>点击专业在三种状态间切换：<span className="text-gray-400">未选</span> → <span className="text-green-500 font-medium">想学</span> → <span className="text-red-500 font-medium">不想学</span> → <span className="text-gray-400">未选</span></span>
                    </div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {ALL_MAJOR_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            const majorsInCategory = getMajorsByCategory(category);
                            majorsInCategory.forEach((m) => {
                              if (!selectedMajors.includes(m.name) && !excludedMajors.includes(m.name)) {
                                toggleMajor(m.name);
                              }
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            isDark
                              ? 'bg-white/10 text-gray-300 hover:bg-white/20'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          全选{category}
                        </button>
                      ))}
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {ALL_MAJORS.map((major) => {
                        const isSelected = selectedMajors.includes(major.name);
                        const isExcluded = excludedMajors.includes(major.name);
                        return (
                          <button
                            key={major.name}
                            onClick={() => {
                              if (isSelected) {
                                // 想学 → 不想学（先取消想学，再添加到排除）
                                toggleMajor(major.name);
                                toggleExcludedMajor(major.name);
                              } else if (isExcluded) {
                                // 不想学 → 未选
                                toggleExcludedMajor(major.name);
                              } else {
                                // 未选 → 想学
                                toggleMajor(major.name);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                              isSelected
                                ? 'bg-green-100 border border-green-300'
                                : isExcluded
                                ? 'bg-red-100 border border-red-300'
                                : isDark
                                ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                                : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isSelected ? 'bg-green-500' : isExcluded ? 'bg-red-500' : 'bg-gray-400'
                                }`}
                              ></span>
                              <span className={`font-medium text-sm ${
                                isSelected ? 'text-green-700' : isExcluded ? 'text-red-700' : textPrimary
                              }`}>
                                {major.name}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {major.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${
                                major.heat === 'hot' ? 'text-orange-500' : major.heat === 'warm' ? 'text-blue-500' : 'text-gray-400'
                              }`}>
                                {major.heat === 'hot' ? '热门' : major.heat === 'warm' ? '适中' : '冷门'}
                              </span>
                              <span className={`text-xs font-medium ${
                                isSelected ? 'text-green-600' : isExcluded ? 'text-red-600' : 'text-gray-400'
                              }`}>
                                {isSelected ? '想学' : isExcluded ? '不想学' : '未选'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
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

              {/* 院校性质筛选 */}
              <div className={`glass rounded-2xl p-6 animate-slide-up card-hover ${isDark ? '' : 'shadow-md'}`} style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <Award className="w-4 h-5 text-white" />
                  </div>
                  <h3 className={`font-semibold ${textPrimary}`}>院校性质</h3>
                </div>
                <div className="space-y-2">
                  {SCHOOL_NATURES.map((nature) => {
                    const isSelected = selectedNatures.includes(nature);
                    return (
                      <button
                        key={nature}
                        onClick={() => toggleNature(nature)}
                        className={`w-full px-4 py-3 rounded-xl border text-left font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? isDark
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400'
                            : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300 text-purple-700'
                            : isDark
                            ? 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800'
                        }`}
                      >
                        <span>{nature}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow-sm">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className={`mt-3 text-xs ${textMuted}`}>已选 {selectedNatures.length} 个性质</p>
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
          <div className={`mt-8 glass rounded-2xl p-6 animate-slide-up transition-all ${isDark ? '' : 'shadow-lg'}`} style={{ animationDelay: '0.35s' }}>
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
                disabled={useAppStore.getState().isLoading || availableCount === 0 || baseScore === null || selectedSubjects.length === 0 || (provinceConfig && !provinceConfig.dataAvailable)}
                className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white rounded-xl font-semibold text-lg shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                <span>一键生成志愿方案</span>
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/analysis')}
                disabled={baseScore === null || selectedSubjects.length === 0}
                className="w-full md:w-auto px-10 py-3 glass text-lg font-medium rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-5 h-5" />
                <span>数据分析中心</span>
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
