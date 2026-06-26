import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, GraduationCap, ChevronRight, MapPin, Award, Sparkles, Target, Zap, BookOpen, Cpu, Radio, Lightbulb, Stethoscope, TrendingUp, Scale, Palette, Database, RefreshCw, Trophy, Users, BarChart2 } from 'lucide-react';
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
  
  // 监听分数变化，自动获取位次信息
  useEffect(() => {
    if (baseScore !== null && baseScore >= 480 && baseScore <= 900) {
      const timer = setTimeout(() => {
        setRankInfo({ isQuerying: true, score: null, rank: null, percentile: null, year2025: null, year2024: null, year2023: null });
        
        fetchRankInfo(baseScore, subject).then(info => {
          setRankInfo({
            isQuerying: false,
            score: info.score,
            rank: info.rank,
            percentile: info.percentile,
            year2025: info.year2025,
            year2024: info.year2024,
            year2023: info.year2023,
          });
        });
      }, 500); // 延迟500ms避免频繁请求
      
      return () => clearTimeout(timer);
    } else {
      setRankInfo({ isQuerying: false, score: null, rank: null, percentile: null, year2025: null, year2024: null, year2023: null });
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
    } catch (err) {
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
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10">
        {/* 头部 */}
        <header className="py-10 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-gray-300">AI 智能志愿推荐系统</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">海南高考志愿</span>
              <span className="text-white"> 智能生成系统</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              基于近三年投档分数线，结合 AI 算法智能推荐，一键生成个性化志愿方案
            </p>
          </div>
        </header>
        
        {/* 主内容区 */}
        <main className="max-w-6xl mx-auto px-6 pb-16">
          {/* 数据上传卡片 */}
          <div className="glass rounded-2xl p-6 mb-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">投档分数线数据</h2>
                <p className="text-sm text-gray-400">支持 Excel 文件上传</p>
              </div>
            </div>
            
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
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
                <div className="flex items-center justify-center gap-3 text-green-400">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">数据已加载完成</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">默认数据已加载</p>
                    <p className="text-sm text-gray-400">2023-2025年海南投档分数线（{SCHOOL_DATA.length} 条记录）</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：主要参数 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 分数设置卡片 */}
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">分数设置</h2>
                    <p className="text-sm text-gray-400">输入你的高考分数和浮动范围</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">高考分数</label>
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
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-xl font-bold focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none transition-all"
                        placeholder="输入高考分数"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">分</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">分数浮动范围（±分）</label>
                    <div className="flex gap-2">
                      {scoreRangeOptions.map((range) => (
                        <button
                          key={range}
                          onClick={() => setScoreRange(range)}
                          className={`flex-1 px-3 py-3 rounded-xl border font-medium transition-all ${
                            scoreRange === range
                              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white border-transparent shadow-lg shadow-primary-500/25'
                              : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-300'
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
                  <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        {rankInfo.isQuerying ? (
                          <RefreshCw className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <Database className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-purple-300">
                        {rankInfo.isQuerying ? '正在从掌上高考/夸克高考获取位次信息...' : '位次信息（基于掌上高考/夸克高考数据）'}
                      </p>
                    </div>
                    
                    {rankInfo.isQuerying ? (
                      <div className="space-y-2">
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" style={{ width: '70%' }} />
                        </div>
                        <p className="text-xs text-gray-400">正在查询近三年海南省一分一段数据...</p>
                      </div>
                    ) : rankInfo.rank !== null ? (
                      <div>
                        {/* 突出显示位次信息 - 使用渐变背景卡片 */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-5 mb-4 border border-white/10">
                          <div className="grid grid-cols-3 gap-6 text-center">
                            {/* 省内位次 - 重点突出 */}
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="relative">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <Trophy className="w-5 h-5 text-yellow-400" />
                                  <div className="text-xs text-gray-400">省内位次</div>
                                </div>
                                <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-lg">
                                  {rankInfo.rank.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">名</div>
                              </div>
                            </div>
                            
                            {/* 超过考生百分比 */}
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="relative">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <Users className="w-5 h-5 text-green-400" />
                                  <div className="text-xs text-gray-400">超过考生</div>
                                </div>
                                <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 drop-shadow-lg">
                                  {rankInfo.percentile}%
                                </div>
                                <div className="text-xs text-gray-500 mt-1">的考生</div>
                              </div>
                            </div>
                            
                            {/* 2025分数 */}
                            <div className="relative group">
                              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="relative">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <BarChart2 className="w-5 h-5 text-primary-400" />
                                  <div className="text-xs text-gray-400">2025分数</div>
                                </div>
                                <div className="text-3xl font-extrabold text-white drop-shadow-lg">
                                  {baseScore}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">分</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 历年位次对比 - 次要信息区域 */}
                        <div className="bg-white/5 rounded-lg p-3">
                          <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>历年同位次参考（海南省）</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white/5 rounded-lg py-2">
                              <div className="text-xs text-gray-500 mb-1">2025年</div>
                              <div className="text-sm font-bold text-white">{rankInfo.year2025?.toLocaleString()}</div>
                              <div className="text-xs text-gray-600">名</div>
                            </div>
                            <div className="bg-white/5 rounded-lg py-2">
                              <div className="text-xs text-gray-500 mb-1">2024年</div>
                              <div className="text-sm font-medium text-gray-300">{rankInfo.year2024?.toLocaleString()}</div>
                              <div className="text-xs text-gray-600">名</div>
                            </div>
                            <div className="bg-white/5 rounded-lg py-2">
                              <div className="text-xs text-gray-500 mb-1">2023年</div>
                              <div className="text-sm font-medium text-gray-300">{rankInfo.year2023?.toLocaleString()}</div>
                              <div className="text-xs text-gray-600">名</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 数据来源提示 */}
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                          <Database className="w-3 h-3" />
                          <span>数据来源：掌上高考/夸克高考 · 仅供参考</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              {/* 科目与志愿数量 */}
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">选考科目与志愿数量</h2>
                    <p className="text-sm text-gray-400">选择你的选考科目组合</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">选考科目要求</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(parseInt(e.target.value))}
                      className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {subjectOptions.map((s) => (
                        <option key={s} value={s} className="bg-gray-900">
                          {parseSubjectRequirement(s)}（{s}）
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">志愿数量</label>
                    <div className="flex gap-2">
                      {volunteerOptions.map((count) => (
                        <button
                          key={count}
                          onClick={() => setTotalVolunteers(count)}
                          className={`flex-1 px-3 py-3.5 rounded-xl border font-medium transition-all ${
                            totalVolunteers === count
                              ? 'bg-gradient-to-r from-accent-600 to-accent-500 text-white border-transparent shadow-lg shadow-accent-500/25'
                              : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-300'
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
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">重点专业方向</h2>
                    <p className="text-sm text-gray-400">选择你感兴趣的专业类别（可多选，不选则全部）</p>
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
                            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        }`}
                        style={isSelected ? {
                          background: `linear-gradient(135deg, rgba(99,102,241,0.2), rgba(217,70,239,0.2))`,
                          boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
                        } : {}}
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-3 ${
                          isSelected ? 'scale-110' : ''
                        } transition-transform`}>
                          {majorIcons[category.id]}
                        </div>
                        <p className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {category.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {selectedMajorCategories.length > 0 && (
                  <p className="mt-4 text-sm text-primary-400">
                    已选择 {selectedMajorCategories.length} 个专业方向
                  </p>
                )}
              </div>
            </div>
            
            {/* 右侧：筛选条件 */}
            <div className="space-y-6">
              {/* 院校层次 */}
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Award className="w-4 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-white">院校层次</h3>
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
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-300'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                        }`}
                      >
                        <span>{level}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-500">已选 {selectedLevels.length} 个层次</p>
              </div>
              
              {/* 地域选择 */}
              <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.25s' }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <MapPin className="w-4 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white">地域选择</h3>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={selectAllProvinces}
                      className="text-primary-400 hover:text-primary-300 font-medium"
                    >
                      全选
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      onClick={clearAllProvinces}
                      className="text-gray-500 hover:text-gray-400 font-medium"
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
                            ? 'bg-green-500/20 border-green-500/30 text-green-300'
                            : someSelected
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <span>{region.name}</span>
                        <span className="text-xs opacity-70">{region.provinces.length}省</span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin p-1">
                  {PROVINCES.map((province) => {
                    const isSelected = selectedProvinces.includes(province);
                    return (
                      <button
                        key={province}
                        onClick={() => toggleProvince(province)}
                        className={`w-full px-3 py-2 rounded-lg text-sm transition-all text-left ${
                          isSelected
                            ? 'bg-green-500/20 text-green-300'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        {province}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  已选 {selectedProvinces.length} 个地区 {selectedProvinces.length === 0 && '（默认全部）'}
                </p>
              </div>
            </div>
          </div>
          
          {/* 统计与生成按钮 */}
          <div className="mt-8 glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.35s' }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">符合条件</p>
                  <p className="text-3xl font-bold text-gradient">{availableCount}</p>
                  <p className="text-xs text-gray-500">条院校记录</p>
                </div>
                <div className="w-px h-16 bg-white/10" />
                <div className="text-sm text-gray-400 space-y-1">
                  <p>分数范围：<span className="text-white font-medium">{baseScore !== null ? `${baseScore - scoreRange} - ${baseScore + scoreRange} 分` : '待输入'}</span></p>
                  <p>科目要求：<span className="text-white font-medium">{parseSubjectRequirement(subject)}</span></p>
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
            
            {useAppStore.getState().error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {useAppStore.getState().error}
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
              <div key={i} className="glass rounded-xl p-5 text-center animate-slide-up" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
