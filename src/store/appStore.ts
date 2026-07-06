import { create } from 'zustand';
import type { SchoolScore, VolunteerResult } from '../utils/volunteerUtils';
import { loadSchoolDataFromSupabase } from '../utils/supabaseDataLoader';
import { SCHOOL_DATA, AVAILABLE_REGIONS } from '../data/schoolData';
import { getProvinceConfig, type ProvinceConfig } from '../data/provinceConfigs';
import { STRATEGY_CONFIGS, type StrategyType } from '../config/strategyConfig';

// 重新导出策略配置，保持向后兼容（HomePage.tsx 等从 appStore 导入）
export { STRATEGY_CONFIGS };
export type { StrategyType };

type Theme = 'light' | 'dark';

interface UserPreferences {
  baseScore: number | null;
  subject: number;
  selectedSubjects: string[];
  scoreRange: number;
  totalVolunteers: number;
  strategy: StrategyType;
  currentRegion: string;
  selectedLevels: string[];
  selectedProvinces: string[];
  selectedMajorCategories: string[];
  selectedNatures: string[];
  selectedMajors: string[];
  excludedMajors: string[];
}

const USER_PREFS_KEY = 'gaokao_user_preferences';

function saveUserPreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    if (import.meta.env.DEV) console.warn('保存用户偏好失败:', error);
  }
}

function loadUserPreferences(): UserPreferences | null {
  try {
    const saved = localStorage.getItem(USER_PREFS_KEY);
    if (saved) {
      return JSON.parse(saved) as UserPreferences;
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('加载用户偏好失败:', error);
  }
  return null;
}

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
  savePreferences: () => void;
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
  const savedPrefs = loadUserPreferences();
  
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(initialTheme);
  }
  
  const getInitialValue = <T>(key: keyof UserPreferences, defaultValue: T): T => {
    if (savedPrefs && savedPrefs[key] !== undefined) {
      return savedPrefs[key] as T;
    }
    return defaultValue;
  };
  
  return {
    // 主题
    theme: initialTheme,
    isDark: initialTheme === 'dark',
    
    // 默认值（优先从localStorage加载）
    baseScore: getInitialValue('baseScore', null),
    scoreRange: getInitialValue('scoreRange', 15),
    subject: getInitialValue('subject', 54),
    selectedSubjects: getInitialValue('selectedSubjects', []),
    totalVolunteers: getInitialValue('totalVolunteers', 30),
    // 当前地区（默认海南）
    currentRegion: getInitialValue('currentRegion', '海南'),
    availableRegions: AVAILABLE_REGIONS,
    provinceConfig: getProvinceConfig(getInitialValue('currentRegion', '海南')) || null,
    // 志愿策略（默认稳妥）
    strategy: getInitialValue('strategy', '稳妥'),
    selectedLevels: getInitialValue('selectedLevels', ['985', '211', '双一流', '普通本科']),
    selectedProvinces: getInitialValue('selectedProvinces', []),
    selectedMajorCategories: getInitialValue('selectedMajorCategories', []),
    selectedNatures: getInitialValue('selectedNatures', []),
    selectedMajors: getInitialValue('selectedMajors', []),
    excludedMajors: getInitialValue('excludedMajors', []),
    
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
    
    // 保存用户偏好到localStorage
    savePreferences: () => {
      const state = get();
      const prefs: UserPreferences = {
        baseScore: state.baseScore,
        subject: state.subject,
        selectedSubjects: state.selectedSubjects,
        scoreRange: state.scoreRange,
        totalVolunteers: state.totalVolunteers,
        strategy: state.strategy,
        currentRegion: state.currentRegion,
        selectedLevels: state.selectedLevels,
        selectedProvinces: state.selectedProvinces,
        selectedMajorCategories: state.selectedMajorCategories,
        selectedNatures: state.selectedNatures,
        selectedMajors: state.selectedMajors,
        excludedMajors: state.excludedMajors,
      };
      saveUserPreferences(prefs);
    },
    
    // 方法（自动保存用户偏好）
    setBaseScore: (score) => {
      set({ baseScore: score });
      get().savePreferences();
    },
    setScoreRange: (range) => {
      set({ scoreRange: range });
      get().savePreferences();
    },
    setSubject: (subject) => {
      set({ subject: subject });
      get().savePreferences();
    },
    setSelectedSubjects: (subjects) => {
      set({ selectedSubjects: subjects });
      get().savePreferences();
    },
    toggleSelectedSubject: (subject) => {
      const current = get().selectedSubjects;
      if (current.includes(subject)) {
        set({ selectedSubjects: current.filter(s => s !== subject) });
      } else {
        set({ selectedSubjects: [...current, subject] });
      }
      get().savePreferences();
    },
    setTotalVolunteers: (count) => {
      set({ totalVolunteers: count });
      get().savePreferences();
    },
    setStrategy: (strategy) => {
      set({ strategy });
      get().savePreferences();
    },
    toggleNature: (nature) => {
      const current = get().selectedNatures;
      if (current.includes(nature)) {
        set({ selectedNatures: current.filter(n => n !== nature) });
      } else {
        set({ selectedNatures: [...current, nature] });
      }
      get().savePreferences();
    },
    toggleLevel: (level) => {
      const current = get().selectedLevels;
      if (current.includes(level)) {
        set({ selectedLevels: current.filter(l => l !== level) });
      } else {
        set({ selectedLevels: [...current, level] });
      }
      get().savePreferences();
    },
    toggleProvince: (province) => {
      const current = get().selectedProvinces;
      if (current.includes(province)) {
        set({ selectedProvinces: current.filter(p => p !== province) });
      } else {
        set({ selectedProvinces: [...current, province] });
      }
      get().savePreferences();
    },
    toggleMajorCategory: (categoryId) => {
      const current = get().selectedMajorCategories;
      if (current.includes(categoryId)) {
        set({ selectedMajorCategories: current.filter(c => c !== categoryId) });
      } else {
        set({ selectedMajorCategories: [...current, categoryId] });
      }
      get().savePreferences();
    },
    toggleMajor: (major) => {
      const current = get().selectedMajors;
      if (current.includes(major)) {
        set({ selectedMajors: current.filter(m => m !== major) });
      } else {
        set({ selectedMajors: [...current, major] });
      }
      get().savePreferences();
    },
    toggleExcludedMajor: (major) => {
      const current = get().excludedMajors;
      if (current.includes(major)) {
        set({ excludedMajors: current.filter(m => m !== major) });
      } else {
        set({ excludedMajors: [...current, major] });
      }
      get().savePreferences();
    },
    clearAllMajors: () => {
      set({ selectedMajors: [] });
      get().savePreferences();
    },
    clearAllExcludedMajors: () => {
      set({ excludedMajors: [] });
      get().savePreferences();
    },
    clearAllProvinces: () => {
      set({ selectedProvinces: [] });
      get().savePreferences();
    },
    selectAllProvinces: () => {
      const { schoolData } = get();
      const allProvinces = [...new Set(schoolData.map(s => s.province))];
      set({ selectedProvinces: allProvinces });
      get().savePreferences();
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
      get().savePreferences();
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
      get().savePreferences();

      await get().loadFromSupabase(region);
    },
    loadFromSupabase: async (province?: string) => {
      const targetProvince = province || get().currentRegion || '海南';
      if (import.meta.env.DEV) console.log(`[DEBUG][appStore] 开始加载${targetProvince}数据`);
      set({ isLoading: true, error: null });
      try {
        const data = await loadSchoolDataFromSupabase(targetProvince);
        if (import.meta.env.DEV) console.log(`[DEBUG][appStore] 加载${targetProvince}数据完成，返回 ${data.length} 条记录`);
        if (data.length === 0) {
          if (import.meta.env.DEV) console.warn(`[loadFromSupabase] ${targetProvince} 地区云端数据为空，请检查数据库是否已导入数据`);
        }
        if (data.length > 0) {
          if (import.meta.env.DEV) console.log(`[DEBUG][appStore] 前5条记录: ${data.slice(0, 5).map(s => s.name).join(', ')}`);
        }
        set({ schoolData: data, isLoading: false });
        if (import.meta.env.DEV) console.log(`[DEBUG][appStore] schoolData已更新，当前长度: ${data.length}`);
      } catch (err) {
        if (import.meta.env.DEV) console.error(`[loadFromSupabase] 加载 ${targetProvince} 数据失败:`, err);
        set({ error: `从云端加载${targetProvince}数据失败：${err instanceof Error ? err.message : '未知错误'}`, isLoading: false });
      }
    },
    reset: () => {
      set({
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
      });
      get().savePreferences();
    },
  };
});