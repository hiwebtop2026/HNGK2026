import { useNavigate } from 'react-router-dom';
import { Download, ArrowLeft, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { exportToExcel } from '../utils/volunteerUtils';
import { TIER_COLORS } from '../utils/dataUtils';

export function ResultPage() {
  const navigate = useNavigate();
  const { results, baseScore, scoreRange, totalVolunteers, reset } = useAppStore();
  
  // 统计各档次数量
  const chongCount = results.filter(r => r.tier === '冲').length;
  const wenCount = results.filter(r => r.tier === '稳').length;
  const baoCount = results.filter(r => r.tier === '保').length;
  
  // 导出Excel
  const handleExport = () => {
    const filename = `2026志愿方案_${baseScore}分_${results.length}志愿.xlsx`;
    exportToExcel(results, filename);
  };
  
  // 返回首页
  const handleBack = () => {
    reset();
    navigate('/');
  };
  
  if (results.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">暂无志愿方案数据</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-blue-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">志愿方案结果</h1>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>导出Excel</span>
          </button>
        </div>
      </header>
      
      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* 总志愿数 */}
          <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">总志愿数</p>
            <p className="text-2xl font-bold text-gray-800">{results.length}</p>
          </div>
          
          {/* 冲志愿 */}
          <div className="bg-white rounded-xl p-4 shadow border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <p className="text-sm text-gray-500">冲志愿</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{chongCount}</p>
          </div>
          
          {/* 稳志愿 */}
          <div className="bg-white rounded-xl p-4 shadow border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <p className="text-sm text-gray-500">稳志愿</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{wenCount}</p>
          </div>
          
          {/* 保志愿 */}
          <div className="bg-white rounded-xl p-4 shadow border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <p className="text-sm text-gray-500">保志愿</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{baoCount}</p>
          </div>
        </div>
        
        {/* 参数信息 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
          <div className="flex items-center gap-4 text-sm text-blue-700">
            <span>基准分数：<strong>{baseScore}</strong></span>
            <span>分数范围：<strong>±{scoreRange}</strong> ({baseScore - scoreRange}-{baseScore + scoreRange})</span>
            <span>科目要求：<strong>物理+化学(54)</strong></span>
          </div>
        </div>
        
        {/* 志愿表格 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                <tr>
                  <th className="px-3 py-3 text-center text-sm font-medium">序号</th>
                  <th className="px-3 py-3 text-center text-sm font-medium">档次</th>
                  <th className="px-3 py-3 text-center text-sm font-medium">层次</th>
                  <th className="px-3 py-3 text-center text-sm font-medium">省份</th>
                  <th className="px-3 py-3 text-left text-sm font-medium">院校名称</th>
                  <th className="px-3 py-3 text-center text-sm font-medium">2025</th>
                  <th className="px-3 py-3 text-center text-sm font-medium">2024</th>
                  <th className="px-3 py-3 text-center text-sm font-medium">2023</th>
                  <th className="px-3 py-3 text-left text-sm font-medium">专业推荐（录取概率）</th>
                  <th className="px-3 py-3 text-left text-sm font-medium">推荐理由</th>
                </tr>
              </thead>
              <tbody>
                {results.map((volunteer) => (
                  <tr
                    key={volunteer.index}
                    style={{
                      backgroundColor: TIER_COLORS[volunteer.tier].bg,
                    }}
                    className="border-b border-gray-100 hover:opacity-90 transition-opacity"
                  >
                    <td className="px-3 py-4 text-center font-bold text-gray-800">
                      {volunteer.index}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span
                        className="px-2 py-1 rounded-full font-bold text-sm"
                        style={{
                          backgroundColor: 'white',
                          color: TIER_COLORS[volunteer.tier].text,
                        }}
                      >
                        {volunteer.tier}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        volunteer.level === '985' ? 'bg-red-100 text-red-700' :
                        volunteer.level === '211' ? 'bg-orange-100 text-orange-700' :
                        volunteer.level === '双一流' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {volunteer.level}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center text-sm text-gray-600">
                      {volunteer.province}
                    </td>
                    <td className="px-3 py-4">
                      <div>
                        <p className="font-medium text-gray-800">{volunteer.name}</p>
                        <p className="text-xs text-gray-500">{volunteer.code}</p>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center font-medium text-gray-700">
                      {volunteer.score2025 ?? '-'}
                    </td>
                    <td className="px-3 py-4 text-center font-medium text-gray-700">
                      {volunteer.score2024 ?? '-'}
                    </td>
                    <td className="px-3 py-4 text-center font-medium text-gray-700">
                      {volunteer.score2023 ?? '-'}
                    </td>
                    <td className="px-3 py-4">
                      <div className="space-y-1.5">
                        {volunteer.majorRecommendations?.slice(0, 4).map((major, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                major.admissionTier === '保底' ? 'bg-green-500' :
                                major.admissionTier === '稳妥' ? 'bg-yellow-500' : 'bg-red-400'
                              }`} />
                              <span className="text-sm text-gray-700 truncate">{major.name}</span>
                            </div>
                            <span className={`text-xs font-medium flex-shrink-0 ${
                              major.admissionTier === '保底' ? 'text-green-600' :
                              major.admissionTier === '稳妥' ? 'text-yellow-600' : 'text-red-500'
                            }`}>
                              {Math.round(major.probability)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-600">
                      {volunteer.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* 提示信息 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="font-medium text-orange-700">冲志愿提示</span>
            </div>
            <p className="text-sm text-orange-600">
              投档线高于考生分数，录取概率较低，建议作为冲刺目标谨慎填报。
            </p>
          </div>
          
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-yellow-500" />
              <span className="font-medium text-yellow-700">稳志愿提示</span>
            </div>
            <p className="text-sm text-yellow-600">
              投档线与考生分数接近，录取把握较大，是志愿填报的核心选择。
            </p>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-700">保志愿提示</span>
            </div>
            <p className="text-sm text-green-600">
              投档线低于考生分数，录取概率很高，确保不会滑档的保底选择。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}