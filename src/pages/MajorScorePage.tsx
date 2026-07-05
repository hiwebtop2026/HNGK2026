import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Filter, Download, BookOpen,
  TrendingUp, TrendingDown, Minus, BarChart3, Calendar,
  ChevronDown, X, CheckCircle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface MajorScore {
  id?: string;
  school_name: string;
  school_code?: string;
  province?: string;
  level?: string;
  major_name: string;
  major_group?: string;
  subject_requirement?: string;
  year: number;
  min_score?: number;
  min_rank?: number;
  avg_score?: number;
  batch?: string;
  batch_line?: number;
  batch_line_diff?: number;
  person_count?: number;
  source?: string;
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useAppStore();
  return (
    <button
      onClick={toggleTheme}
      className={`p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
    >
      <BarChart3 className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-gray-600'}`} />
    </button>
  );
}

export function MajorScorePage() {
  const navigate = useNavigate();
  const { isDark } = useAppStore();
  
  const [schoolName, setSchoolName] = useState('');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [data, setData] = useState<MajorScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const years = [2023, 2024, 2025];
  const batches = ['', '本科批', '本科提前批'];
  const subjects = ['', '不限', '物理必选', '物+化(2科必选)', '必选物理'];
  
  const textPrimary = isDark ? 'text-white' : 'text-gray-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textMuted = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-white/5' : 'bg-white';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-200';
  const inputFocus = isDark ? 'focus:ring-primary-500/50 focus:border-primary-500/50' : 'focus:ring-primary-500/30 focus:border-primary-400';
  
  async function fetchData() {
    setLoading(true);
    setShowAll(false);
    
    try {
      let query = supabase.from('major_scores').select('*');
      
      if (schoolName) {
        query = query.ilike('school_name', `%${schoolName}%`);
      }
      if (selectedYear) {
        query = query.eq('year', selectedYear);
      }
      if (selectedBatch) {
        query = query.eq('batch', selectedBatch);
      }
      if (selectedSubject) {
        query = query.ilike('subject_requirement', `%${selectedSubject}%`);
      }
      
      query = query.order('min_score', { ascending: false });
      
      const { data: result, error } = await query;
      
      if (error) {
        console.error('查询失败:', error);
        setData([]);
      } else {
        setData(result || []);
      }
    } catch (error) {
      console.error('查询失败:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }
  
  async function fetchAllData() {
    setLoading(true);
    setShowAll(true);
    
    try {
      const { data: result, error } = await supabase
        .from('major_scores')
        .select('*')
        .order('school_name')
        .order('year', { ascending: false })
        .order('min_score', { ascending: false });
      
      if (error) {
        console.error('查询失败:', error);
        setData([]);
      } else {
        setData(result || []);
      }
    } catch (error) {
      console.error('查询失败:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchData();
    }
  }, [selectedYear, selectedBatch, selectedSubject]);
  
  const handleBack = () => {
    navigate('/');
  };
  
  const getScoreTrend = (item: MajorScore) => {
    if (!item.min_rank) return 'stable';
    if (item.year === 2025) return 'stable';
    return 'stable';
  };
  
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* 顶部导航 */}
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
              <h1 className={`text-xl font-bold ${textPrimary}`}>专业录取分数线</h1>
              <p className={`text-xs ${textSecondary}`}>查询2023-2025年各院校专业录取数据</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      {/* 搜索筛选区 */}
      <div className={`glass mx-6 mt-6 rounded-2xl p-6 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>院校名称</label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
              <input
                type="text"
                placeholder="输入院校名称..."
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${inputBg} ${inputBorder} border ${inputFocus} text-sm outline-none transition-all ${textPrimary}`}
              />
              {schoolName && (
                <button
                  onClick={() => setSchoolName('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>年份</label>
            <div className="relative">
              <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className={`w-full pl-10 pr-8 py-2.5 rounded-xl ${inputBg} ${inputBorder} border ${inputFocus} text-sm outline-none transition-all ${textPrimary} appearance-none cursor-pointer`}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>批次</label>
            <div className="relative">
              <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className={`w-full pl-10 pr-8 py-2.5 rounded-xl ${inputBg} ${inputBorder} border ${inputFocus} text-sm outline-none transition-all ${textPrimary} appearance-none cursor-pointer`}
              >
                {batches.map(batch => (
                  <option key={batch} value={batch}>{batch || '全部批次'}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>选科要求</label>
            <div className="relative">
              <BookOpen className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className={`w-full pl-10 pr-8 py-2.5 rounded-xl ${inputBg} ${inputBorder} border ${inputFocus} text-sm outline-none transition-all ${textPrimary} appearance-none cursor-pointer`}
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject || '全部选科'}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>搜索</span>
          </button>
          
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>查看全部</span>
          </button>
          
          {data.length > 0 && (
            <div className={`ml-auto text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-2`}>
              <CheckCircle className="w-4 h-4" />
              共 {data.length} 条记录
            </div>
          )}
        </div>
      </div>
      
      {/* 数据统计 */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`glass rounded-xl p-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <p className={`text-xs ${textMuted}`}>总记录数</p>
            <p className={`text-2xl font-bold ${textPrimary}`}>{data.length}</p>
          </div>
          <div className={`glass rounded-xl p-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <p className={`text-xs ${textMuted}`}>当前年份</p>
            <p className={`text-2xl font-bold ${textPrimary}`}>{selectedYear}年</p>
          </div>
          <div className={`glass rounded-xl p-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <p className={`text-xs ${textMuted}`}>数据来源</p>
            <p className={`text-2xl font-bold ${textPrimary}`}>夸克高考</p>
          </div>
        </div>
      </div>
      
      {/* 数据表格 */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className={`glass rounded-xl overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
              <p className={textSecondary}>数据加载中...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="py-20 text-center">
              <BookOpen className={`w-16 h-16 ${textMuted} mx-auto mb-4`} />
              <p className={textSecondary}>未找到相关数据</p>
              <p className={`text-sm ${textMuted} mt-2`}>请尝试调整搜索条件</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>院校名称</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>专业名称</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>年份</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>最低分</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>最低位次</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>平均分</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>批次线差</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>选科要求</th>
                    <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${textSecondary}`}>录取人数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.map((item, idx) => {
                    const trend = getScoreTrend(item);
                    return (
                      <tr
                        key={item.id || idx}
                        className={`hover:bg-gray-50/50 transition-colors ${isDark ? 'hover:bg-white/5' : ''}`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap ${textPrimary}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${item.level === '985' ? 'bg-red-100 text-red-600' : item.level === '211' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                              {item.level}
                            </span>
                            {item.school_name}
                          </div>
                        </td>
                        <td className={`px-6 py-4 ${textPrimary}`}>
                          <div className="max-w-xs truncate" title={item.major_name}>
                            {item.major_name}
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${textSecondary}`}>
                          {item.year}年
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-semibold ${textPrimary}`}>
                          {item.min_score ?? '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${textSecondary}`}>
                          {item.min_rank ?? '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${textSecondary}`}>
                          {item.avg_score ?? '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${item.batch_line_diff && item.batch_line_diff > 0 ? 'text-green-600' : textSecondary}`}>
                          {item.batch_line_diff ? `+${item.batch_line_diff}` : '-'}
                        </td>
                        <td className={`px-6 py-4 ${textSecondary}`}>
                          <span className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                            {item.subject_requirement || '不限'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${textSecondary}`}>
                          {item.person_count ?? '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* 底部提示 */}
      <div className="max-w-7xl mx-auto px-6 mt-6 mb-12">
        <div className={`glass rounded-xl p-6 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>数据说明</h3>
              <ul className={`mt-2 space-y-1 text-sm ${textSecondary}`}>
                <li>• 专业录取分数线数据来源于夸克高考，仅供参考</li>
                <li>• 批次线差 = 最低分 - 批次控制线</li>
                <li>• 选科要求标注为"不限"表示无特殊选科限制</li>
                <li>• 点击"查看全部"可获取所有院校的专业分数线数据</li>
                <li>• 点击"保存到数据库"可将当前数据同步到云端数据库</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}