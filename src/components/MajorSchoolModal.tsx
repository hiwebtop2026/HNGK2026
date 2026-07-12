import { useEffect, useState } from 'react';
import { X, GraduationCap, TrendingUp, Award, RefreshCw } from 'lucide-react';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';

interface SchoolMajorData {
  school_name: string;
  school_code: string | null;
  level: string | null;
  province: string | null;
  scores: {
    2023: number | null;
    2024: number | null;
    2025: number | null;
  };
  avg_score: number;
  subject_requirement: string | null;
}

interface MajorSchoolModalProps {
  majorName: string;
  isOpen: boolean;
  onClose: () => void;
  province: string;
}

const LEVEL_PRIORITY: Record<string, number> = {
  '985': 4,
  '211': 3,
  '双一流': 2,
  '普通本科': 1,
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '985': {
    bg: 'bg-gradient-to-r from-red-500/20 to-rose-500/20',
    text: 'text-red-500',
    border: 'border-red-500/30',
  },
  '211': {
    bg: 'bg-gradient-to-r from-orange-500/20 to-amber-500/20',
    text: 'text-orange-500',
    border: 'border-orange-500/30',
  },
  '双一流': {
    bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
  },
  '普通本科': {
    bg: 'bg-white/5',
    text: 'text-gray-400',
    border: 'border-white/10',
  },
};

export function MajorSchoolModal({ majorName, isOpen, onClose, province }: MajorSchoolModalProps) {
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<SchoolMajorData[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setSchools([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const rawData = province 
          ? await majorScoreService.searchMajorsByProvince(majorName, province)
          : await majorScoreService.searchMajors(majorName);
        const filteredData = province 
          ? rawData.filter(item => item.province === province)
          : rawData;

        const schoolMap = new Map<string, SchoolMajorData>();

        for (const item of filteredData) {
          const key = item.school_name;
          let school = schoolMap.get(key);

          if (!school) {
            school = {
              school_name: item.school_name,
              school_code: item.school_code,
              level: item.level || '普通本科',
              province: item.province,
              scores: {
                2023: null,
                2024: null,
                2025: null,
              },
              avg_score: 0,
              subject_requirement: item.subject_requirement || null,
            };
            schoolMap.set(key, school);
          }

          if (item.year && item.min_score) {
            school.scores[item.year as keyof typeof school.scores] = item.min_score;
          }

          if (item.subject_requirement) {
            school.subject_requirement = item.subject_requirement;
          }
        }

        const result = Array.from(schoolMap.values()).map(school => {
          const validScores = [school.scores[2023], school.scores[2024], school.scores[2025]].filter(
            (s): s is number => s !== null
          );
          const avg_score = validScores.length > 0
            ? Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length)
            : 0;

          return {
            ...school,
            avg_score,
          };
        });

        result.sort((a, b) => {
          const levelDiff = (LEVEL_PRIORITY[b.level || '普通本科'] || 1) - (LEVEL_PRIORITY[a.level || '普通本科'] || 1);
          if (levelDiff !== 0) return levelDiff;
          return b.avg_score - a.avg_score;
        });

        setSchools(result.slice(0, 20));
      } catch (error) {
        console.error('获取专业院校数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, majorName, province]);

  if (!isOpen) return null;

  const years = [2025, 2024, 2023];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 border border-white/10 shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-lg shadow-green-500/25">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{majorName}</h2>
              <p className="text-sm text-gray-400">按院校层次排序的20所院校及近三年录取分数</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="mt-4 text-gray-400">正在获取数据...</p>
            </div>
          ) : schools.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg">暂无数据</p>
              <p className="text-gray-500 text-sm mt-2">该专业在数据库中暂无院校录取分数记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 px-4 py-3 rounded-xl bg-white/5 text-xs font-medium text-gray-400 sticky top-0 z-10">
                <div className="col-span-4">院校名称</div>
                <div className="col-span-1 text-center">层次</div>
                <div className="col-span-1 text-center">省份</div>
                {years.map(year => (
                  <div key={year} className="col-span-2 text-center">{year}年</div>
                ))}
              </div>

              {schools.map((school, index) => {
                const levelColors = LEVEL_COLORS[school.level || '普通本科'] || LEVEL_COLORS['普通本科'];
                const hasScoreData = years.some(year => school.scores[year] !== null);

                return (
                  <div
                    key={school.school_name}
                    className={`grid grid-cols-12 gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-lg ${
                      isEven(index)
                        ? 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        : 'bg-white/[0.04] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 w-6">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white truncate">{school.school_name}</span>
                        {school.subject_requirement && (
                          <span className="text-xs text-gray-500 ml-2">选科:{school.subject_requirement}</span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-1 flex items-center justify-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${levelColors.bg} ${levelColors.text} ${levelColors.border} border`}>
                        {school.level}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center justify-center">
                      <span className="text-sm text-gray-400">{school.province || '-'}</span>
                    </div>

                    {years.map(year => {
                      const score = school.scores[year];
                      return (
                        <div key={year} className="col-span-2 flex items-center justify-center">
                          {score !== null ? (
                            <div className="flex flex-col items-center">
                              <span className={`text-sm font-bold ${score >= school.avg_score ? 'text-green-400' : 'text-amber-400'}`}>
                                {score}
                              </span>
                              <span className="text-[10px] text-gray-500">分</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-600">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {schools.length > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">数据说明</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 数据按院校层次（985&gt;211&gt;双一流&gt;普通本科）和平均分从高到低排序</li>
                <li>• 绿色分数表示高于近三年平均分，黄色分数表示低于平均分</li>
                <li>• 部分年份数据为空表示该院校当年无该专业招生计划</li>
                <li>• 数据仅供参考，请以官方公布的录取分数线为准</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-400">985院校 {schools.filter(s => s.level === '985').length}所</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-400">211院校 {schools.filter(s => s.level === '211').length}所</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-400">双一流院校 {schools.filter(s => s.level === '双一流').length}所</span>
            </div>
          </div>
          <span className="text-xs text-gray-500">共显示 {schools.length} 所院校</span>
        </div>
      </div>
    </div>
  );
}

function isEven(n: number): boolean {
  return n % 2 === 0;
}