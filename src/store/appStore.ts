import { create } from 'zustand';
import type { SchoolScore, VolunteerResult } from '../utils/volunteerUtils';
import { loadSchoolDataFromSupabase } from '../utils/supabaseDataLoader';
import { SCHOOL_DATA, AVAILABLE_REGIONS } from '../data/schoolData';
import { getProvinceConfig, type ProvinceConfig } from '../data/provinceConfigs';

type Theme = 'light' | 'dark';

export type StrategyType = '激进' | '稳妥' | '保守' | '个性化';

export interface StrategyConfig {
  name: string;
  chongRatio: number;
  wenRatio: number;
  baoRatio: number;
  chongScoreDiff: number;
  wenScoreDiff: number;
  baoScoreDiff: number;
  description: string;
  color: string;
}

export const STRATEGY_CONFIGS: Record<StrategyType, StrategyConfig> = {
  '激进': {
    name: '激进',
    chongRatio: 0.5,
    wenRatio: 0.35,
    baoRatio: 0.15,
    chongScoreDiff: 15,
    wenScoreDiff: 5,
    baoScoreDiff: 8,
    description: '冲刺更多高分院校',
    color: 'from-red-500 to-orange-500',
  },
  '稳妥': {
    name: '稳妥',
    chongRatio: 0.3,
    wenRatio: 0.5,
    baoRatio: 0.2,
    chongScoreDiff: 10,
    wenScoreDiff: 3,
    baoScoreDiff: 15,
    description: '均衡分配，适合大多数考生',
    color: 'from-amber-500 to-yellow-500',
  },
  '保守': {
    name: '保守',
    chongRatio: 0.15,
    wenRatio: 0.35,
    baoRatio: 0.5,
    chongScoreDiff: 5,
    wenScoreDiff: 1,
    baoScoreDiff: 20,
    description: '侧重保底院校，降低风险',
    color: 'from-green-500 to-emerald-500',
  },
  '个性化': {
    name: '个性化',
    chongRatio: 0.3,
    wenRatio: 0.4,
    baoRatio: 0.3,
    chongScoreDiff: 15,
    wenScoreDiff: 5,
    baoScoreDiff: 15,
    description: '结合专业偏好，定制专属方案',
    color: 'from-blue-500 to-purple-500',
  },
};

interface AppState {
  // 主题
  theme: Theme;
  isDark: boolean;
  
  // 当前地区
  currentRegion: string;
  availableRegions: string[];
  provinceConfig: ProvinceConfig | null;
  
  // 输入参数
  baseScore: number | null;
  scoreRange: number;
  subject: number;
  selectedSubjects: string[];
  totalVolunteers: number;
  // 志愿策略
  strategy: StrategyType;
  selectedLevels: string[];
  selectedProvinces: string[];
  selectedMajorCategories: string[];
  selectedNatures: string[];
  selectedMajors: string[];
  excludedMajors: string[];
  
  // 数据状态
  schoolData: SchoolScore[];
  isLoading: boolean;
  error: string | null;
  
  // 一分一段数据
  rankInfo: {
    score: number | null;
    rank: number | null;
    categoryRank: number | null;
    category: '物理类' | '历史类' | '普通类' | null;
    percentile: number | null;
    totalCandidates: number | null;
    year2025: number | null;
    year2024: number | null;
    year2023: number | null;
    dataSource: string | null;
    note: string | null;
    isQuerying: boolean;
  };
  
  // 生成结果
  results: VolunteerResult[];
  
  // 操作方法
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setBaseScore: (score: number | null) => void;
  setScoreRange: (range: number) => void;
  setSubject: (subject: number) => void;
  setSelectedSubjects: (subjects: string[]) => void;
  toggleSelectedSubject: (subject: string) => void;
  setTotalVolunteers: (count: number) => void;
  setStrategy: (strategy: StrategyType) => void;
  toggleNature: (nature: string) => void;
  toggleLevel: (level: string) => void;
  toggleProvince: (province: string) => void;
  toggleMajorCategory: (categoryId: string) => void;
  toggleMajor: (major: string) => void;
  toggleExcludedMajor: (major: string) => void;
  clearAllMajors: () => void;
  clearAllExcludedMajors: () => void;
  clearAllProvinces: () => void;
  selectAllProvinces: () => void;
  toggleRegion: (provinces: string[]) => void;
  setSchoolData: (data: SchoolScore[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (results: VolunteerResult[]) => void;
  setRankInfo: (info: Partial<AppState['rankInfo']>) => void;
  setCurrentRegion: (region: string) => Promise<void>;
  reset: () => void;
  loadFromSupabase: (province?: string) => Promise<void>;
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  const savedTheme = localStorage.getItem('theme') as Theme | null;
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useAppStore = create<AppState>((set, get) => {
  const initialTheme = getInitialTheme();
  
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(initialTheme);
  }
  
  return {
    // 主题
    theme: initialTheme,
    isDark: initialTheme === 'dark',
    
    // 默认值
    baseScore: null,
    scoreRange: 15,
    subject: 54,
    selectedSubjects: [],
    totalVolunteers: 30,
    // 当前地区（默认海南）
    currentRegion: '海南',
    availableRegions: AVAILABLE_REGIONS,
    provinceConfig: getProvinceConfig('海南') || null,
    // 志愿策略（默认稳妥）
    strategy: '稳妥',
    selectedLevels: ['985', '211', '双一流', '普通本科'],
    selectedProvinces: [],
    selectedMajorCategories: [],
    selectedNatures: [],
    selectedMajors: [],
    excludedMajors: [],
    
    // 数据状态
    schoolData: [],
    isLoading: false,
    error: null,
    
    // 一分一段数据
    rankInfo: {
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
        isQuerying: false,
      },
    
    // 结果
    results: [],
    
    // 主题方法
    toggleTheme: () => {
      const currentTheme = get().theme;
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      set({ theme: newTheme, isDark: newTheme === 'dark' });
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
    },
    
    setTheme: (theme) => {
      set({ theme, isDark: theme === 'dark' });
      localStorage.setItem('theme', theme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    },
    
    // 方法
    setBaseScore: (score) => set({ baseScore: score }),
    setScoreRange: (range) => set({ scoreRange: range }),
    setSubject: (subject) => set({ subject: subject }),
    setSelectedSubjects: (subjects) => set({ selectedSubjects: subjects }),
    toggleSelectedSubject: (subject) => {
      const current = get().selectedSubjects;
      if (current.includes(subject)) {
        set({ selectedSubjects: current.filter(s => s !== subject) });
      } else {
        set({ selectedSubjects: [...current, subject] });
      }
    },
    setTotalVolunteers: (count) => set({ totalVolunteers: count }),
    setStrategy: (strategy) => set({ strategy }),
    toggleNature: (nature) => {
      const current = get().selectedNatures;
      if (current.includes(nature)) {
        set({ selectedNatures: current.filter(n => n !== nature) });
      } else {
        set({ selectedNatures: [...current, nature] });
      }
    },
    toggleLevel: (level) => {
      const current = get().selectedLevels;
      if (current.includes(level)) {
        set({ selectedLevels: current.filter(l => l !== level) });
      } else {
        set({ selectedLevels: [...current, level] });
      }
    },
    toggleProvince: (province) => {
      const current = get().selectedProvinces;
      if (current.includes(province)) {
        set({ selectedProvinces: current.filter(p => p !== province) });
      } else {
        set({ selectedProvinces: [...current, province] });
      }
    },
    toggleMajorCategory: (categoryId) => {
      const current = get().selectedMajorCategories;
      if (current.includes(categoryId)) {
        set({ selectedMajorCategories: current.filter(c => c !== categoryId) });
      } else {
        set({ selectedMajorCategories: [...current, categoryId] });
      }
    },
    toggleMajor: (major) => {
      const current = get().selectedMajors;
      if (current.includes(major)) {
        set({ selectedMajors: current.filter(m => m !== major) });
      } else {
        set({ selectedMajors: [...current, major] });
      }
    },
    toggleExcludedMajor: (major) => {
      const current = get().excludedMajors;
      if (current.includes(major)) {
        set({ excludedMajors: current.filter(m => m !== major) });
      } else {
        set({ excludedMajors: [...current, major] });
      }
    },
    clearAllMajors: () => set({ selectedMajors: [] }),
    clearAllExcludedMajors: () => set({ excludedMajors: [] }),
    clearAllProvinces: () => set({ selectedProvinces: [] }),
    selectAllProvinces: () => {
      const { schoolData } = get();
      const allProvinces = [...new Set(schoolData.map(s => s.province))];
      set({ selectedProvinces: allProvinces });
    },
    toggleRegion: (provinces) => {
      const current = get().selectedProvinces;
      const allSelected = provinces.every(p => current.includes(p));
      if (allSelected) {
        set({ selectedProvinces: current.filter(p => !provinces.includes(p)) });
      } else {
        const merged = [...new Set([...current, ...provinces])];
        set({ selectedProvinces: merged });
      }
    },
    setSchoolData: (data) => set({ schoolData: data }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error: error }),
    setResults: (results) => set({ results: results }),
    setRankInfo: (info) => set(state => ({
      rankInfo: { ...state.rankInfo, ...info }
    })),
    setCurrentRegion: async (region) => {
      set({
        currentRegion: region,
        provinceConfig: getProvinceConfig(region) || null,
        results: [],
        baseScore: null,
        // 切换地区时重置选科组合，强制用户重新选择
        selectedSubjects: [],
        rankInfo: {
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
          isQuerying: false,
        },
      });

      await get().loadFromSupabase(region);
    },
    loadFromSupabase: async (province?: string) => {
      const targetProvince = province || get().currentRegion || '海南';
      console.log(`[DEBUG][appStore] 开始加载${targetProvince}数据`);
      set({ isLoading: true, error: null });
      try {
        const data = await loadSchoolDataFromSupabase(targetProvince);
        console.log(`[DEBUG][appStore] 加载${targetProvince}数据完成，返回 ${data.length} 条记录`);
        if (data.length === 0) {
          console.warn(`[loadFromSupabase] ${targetProvince} 地区云端数据为空，请检查数据库是否已导入数据`);
        }
        if (data.length > 0) {
          console.log(`[DEBUG][appStore] 前5条记录: ${data.slice(0, 5).map(s => s.name).join(', ')}`);
        }
        set({ schoolData: data, isLoading: false });
        console.log(`[DEBUG][appStore] schoolData已更新，当前长度: ${data.length}`);
      } catch (err) {
        console.error(`[loadFromSupabase] 加载 ${targetProvince} 数据失败:`, err);
        set({ error: `从云端加载${targetProvince}数据失败：${err instanceof Error ? err.message : '未知错误'}`, isLoading: false });
      }
    },
    reset: () => set({
      baseScore: null,
      scoreRange: 15,
      subject: 54,
      selectedSubjects: [],
      totalVolunteers: 30,
      currentRegion: '海南',
      availableRegions: AVAILABLE_REGIONS,
      provinceConfig: getProvinceConfig('海南') || null,
      strategy: '稳妥',
      selectedLevels: ['985', '211', '双一流', '普通本科'],
      selectedProvinces: [],
      selectedMajorCategories: [],
      selectedNatures: [],
      selectedMajors: [],
      excludedMajors: [],
      results: [],
      error: null,
    }),
  };
});