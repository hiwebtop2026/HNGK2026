import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Settings, GraduationCap, ChevronRight, CheckCircle, MapPin, Award } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { filterSchools, loadSchoolDataFromExcel } from '../utils/volunteerUtils';
import { SUBJECT_REQUIREMENTS } from '../utils/dataUtils';
import { SCHOOL_DATA, PROVINCES, SCHOOL_LEVELS, REGION_GROUPS } from '../data/schoolData';

export function HomePage() {
  const navigate = useNavigate();
  const {
    baseScore,
    scoreRange,
    subject,
    totalVolunteers,
    selectedLevels,
    selectedProvinces,
    setBaseScore,
    setScoreRange,
    setSubject,
    setTotalVolunteers,
    toggleLevel,
    toggleProvince,
    clearAllProvinces,
    selectAllProvinces,
    toggleRegion,
    setSchoolData,
    setLoading,
    setError,
    setResults,
  } = useAppStore();
  
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // 启动时自动加载默认数据
  useEffect(() => {
    setSchoolData(SCHOOL_DATA);
  }, [setSchoolData]);
  
  // 计算筛选后可选项数量
  const availableCount = useMemo(() => {
    return SCHOOL_DATA.filter(s => {
      if (subject !== undefined && s.subject !== subject) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(s.level)) return false;
      if (selectedProvinces.length > 0 && !selectedProvinces.includes(s.province)) return false;
      const refScore = s.score2025 ?? s.score2024 ?? s.score2023 ?? 0;
      return refScore >= baseScore - scoreRange && refScore <= baseScore + scoreRange;
    }).length;
  }, [baseScore, scoreRange, subject, selectedLevels, selectedProvinces]);
  
  // 分数范围选项
  const scoreRangeOptions = [10, 15, 20, 25, 30];
  
  // 志愿数选项
  const volunteerOptions = [15, 20, 30, 45];
  
  // 常用科目选项
  const subjectOptions = [54, 45, 0, 4, 56, 87];
  
  // 层次颜色
  const levelColors: Record<string, { bg: string; text: string; border: string }> = {
    '985': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
    '211': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
    '双一流': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    '普通本科': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' },
  };
  
  // 处理文件上传
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
  
  // 拖拽处理
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
  
  // 生成志愿方案
  const handleGenerate = () => {
    const schoolData = useAppStore.getState().schoolData;
    
    if (schoolData.length === 0) {
      setError('请先上传投档分数线数据文件');
      return;
    }
    
    if (baseScore < 480 || baseScore > 900) {
      setError('请输入合理的分数范围（480-900分）');
      return;
    }
    
    const results = filterSchools(schoolData, baseScore, scoreRange, subject, totalVolunteers, selectedLevels, selectedProvinces);
    
    if (results.length === 0) {
      setError('未找到符合条件的院校，请调整分数范围或科目要求');
      return;
    }
    
    setResults(results);
    navigate('/result');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-6 shadow-lg">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <h1 className="text-2xl font-bold">海南高考志愿智能生成系统</h1>
          </div>
          <p className="mt-2 text-blue-100">基于近三年投档分数线，一键生成个性化志愿方案</p>
        </div>
      </header>
      
      {/* 主内容区 */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* 数据上传区 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">上传投档分数线数据</h2>
          </div>
          
          {/* 拖拽上传区 */}
          <div
            className={`relative border-2 rounded-xl p-8 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
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
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">数据已加载完成</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">默认数据已加载</p>
                  <p className="text-sm text-gray-500">2023-2025年海南投档分数线（{SCHOOL_DATA.length}条记录）</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 参数设置区 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-orange-100">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800">志愿生成参数</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 高考分数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                高考分数
              </label>
              <input
                type="number"
                value={baseScore}
                onChange={(e) => setBaseScore(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="输入高考分数"
              />
            </div>
            
            {/* 分数浮动范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分数浮动范围（±分）
              </label>
              <div className="flex gap-2">
                {scoreRangeOptions.map((range) => (
                  <button
                    key={range}
                    onClick={() => setScoreRange(range)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      scoreRange === range
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    ±{range}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 选考科目 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选考科目要求
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {subjectOptions.map((s) => (
                  <option key={s} value={s}>
                    {SUBJECT_REQUIREMENTS[s] || `科目${s}`}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 志愿数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                志愿数量
              </label>
              <div className="flex gap-2">
                {volunteerOptions.map((count) => (
                  <button
                    key={count}
                    onClick={() => setTotalVolunteers(count)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      totalVolunteers === count
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {count}个
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* 院校层次筛选 */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-purple-500" />
              <h3 className="text-sm font-medium text-gray-700">院校层次筛选</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {SCHOOL_LEVELS.map((level) => {
                const isSelected = selectedLevels.includes(level);
                const colors = levelColors[level] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-300' };
                return (
                  <button
                    key={level}
                    onClick={() => toggleLevel(level)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                      isSelected
                        ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm`
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-500">已选 {selectedLevels.length} 个层次</p>
          </div>
          
          {/* 地域选择 */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-500" />
                <h3 className="text-sm font-medium text-gray-700">地域选择</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllProvinces}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  全选
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearAllProvinces}
                  className="text-xs text-gray-500 hover:text-gray-600 font-medium"
                >
                  清空
                </button>
              </div>
            </div>
            
            {/* 按区域快速选择 */}
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">按区域快速选择：</p>
              <div className="flex flex-wrap gap-2">
                {REGION_GROUPS.map((region) => {
                  const allSelected = region.provinces.every(p => selectedProvinces.includes(p));
                  const someSelected = region.provinces.some(p => selectedProvinces.includes(p));
                  return (
                    <button
                      key={region.name}
                      onClick={() => toggleRegion(region.provinces)}
                      className={`px-3 py-1.5 rounded-md border transition-all text-sm font-medium ${
                        allSelected
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : someSelected
                          ? 'bg-green-50/50 text-green-600 border-green-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600'
                      }`}
                    >
                      {region.name}
                      <span className="ml-1 text-xs opacity-70">
                        ({region.provinces.length}省)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* 具体省份选择 */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">具体省份：</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                {PROVINCES.map((province) => {
                  const isSelected = selectedProvinces.includes(province);
                  return (
                    <button
                      key={province}
                      onClick={() => toggleProvince(province)}
                      className={`px-3 py-1.5 rounded-md border transition-all text-sm ${
                        isSelected
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600'
                      }`}
                    >
                      {province}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              已选 {selectedProvinces.length} 个地区 {selectedProvinces.length === 0 && '（默认全部）'}
            </p>
          </div>
          
          {/* 可选院校预览 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">符合条件的院校专业组</p>
              <p className="text-2xl font-bold text-blue-800">{availableCount} <span className="text-sm font-normal">条记录</span></p>
            </div>
            <div className="text-right text-xs text-blue-600">
              <p>分数范围：{baseScore - scoreRange} - {baseScore + scoreRange}分</p>
              <p>科目要求：{SUBJECT_REQUIREMENTS[subject] || subject}</p>
            </div>
          </div>
          
          {/* 生成按钮 */}
          <div className="mt-6">
            <button
              onClick={handleGenerate}
              disabled={useAppStore.getState().isLoading || availableCount === 0}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {useAppStore.getState().isLoading ? (
                <span>正在处理...</span>
              ) : (
                <>
                  <span>一键生成志愿方案</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
          
          {/* 错误提示 */}
          {useAppStore.getState().error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {useAppStore.getState().error}
            </div>
          )}
        </div>
        
        {/* 使用说明 */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-600 space-y-1">
            <li>• 系统已自动加载2023-2025年海南投档分数线数据（共{SCHOOL_DATA.length}条记录），可直接使用</li>
            <li>• 如需更新数据，可拖拽或点击上传新的Excel文件（需包含2023、2024、2025三个年份的数据表）</li>
            <li>• 系统将根据您的分数和科目要求，智能生成包含"冲、稳、保"三档的志愿方案</li>
            <li>• 建议分数浮动范围设置为±15分，可覆盖更多可选院校</li>
            <li>• 生成结果可导出为Excel文件，便于后续参考和调整</li>
          </ul>
        </div>
      </main>
    </div>
  );
}