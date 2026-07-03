import { create } from 'zustand';
import type { SchoolScore, VolunteerResult } from '../utils/volunteerUtils';
import { loadSchoolDataFromSupabase } from '../utils/supabaseDataLoader';
import { SCHOOL_DATA, AVAILABLE_REGIONS } from '../data/schoolData';
import { getProvinceConfig, type ProvinceConfig } from '../data/provinceConfigs';

type Theme = 'light' | 'dark';

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
  // 冲稳保数量自定义
  chongCount: number;
  wenCount: number;
  baoCount: number;
  useCustomTierCounts: boolean;
  // 冲稳保分数差自定义
  chongScoreDiff: number;
  wenScoreDiff: number;
  baoScoreDiff: number;
  useCustomTierScoreDiffs: boolean;
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
  setChongCount: (count: number) => void;
  setWenCount: (count: number) => void;
  setBaoCount: (count: number) => void;
  setUseCustomTierCounts: (use: boolean) => void;
  setChongScoreDiff: (diff: number) => void;
  setWenScoreDiff: (diff: number) => void;
  setBaoScoreDiff: (diff: number) => void;
  setUseCustomTierScoreDiffs: (use: boolean) => void;
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
    // 冲稳保默认值（默认30%冲、40%稳、30%保）
    chongCount: 9,
    wenCount: 12,
    baoCount: 9,
    useCustomTierCounts: false,
    // 冲稳保分数差默认值（冲+5分，稳上下3分，保-10分）
    chongScoreDiff: 10,
    wenScoreDiff: 3,
    baoScoreDiff: 10,
    useCustomTierScoreDiffs: false,
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
    setTotalVolunteers: (count) => {
      // 自动计算冲稳保默认比例
      const chong = Math.ceil(count * 0.3);
      const wen = Math.ceil(count * 0.4);
      const bao = count - chong - wen;
      set({ 
        totalVolunteers: count, 
        chongCount: chong, 
        wenCount: wen, 
        baoCount: bao 
      });
    },
    setChongCount: (count) => set({ chongCount: count }),
    setWenCount: (count) => set({ wenCount: count }),
    setBaoCount: (count) => set({ baoCount: count }),
    setUseCustomTierCounts: (use) => set({ useCustomTierCounts: use }),
    setChongScoreDiff: (diff) => set({ chongScoreDiff: diff }),
    setWenScoreDiff: (diff) => set({ wenScoreDiff: diff }),
    setBaoScoreDiff: (diff) => set({ baoScoreDiff: diff }),
    setUseCustomTierScoreDiffs: (use) => set({ useCustomTierScoreDiffs: use }),
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
      set({ isLoading: true, error: null });
      try {
        const data = await loadSchoolDataFromSupabase(targetProvince);
        if (data.length === 0) {
          console.warn(`[loadFromSupabase] ${targetProvince} 地区云端数据为空，请检查数据库是否已导入数据`);
        }
        set({ schoolData: data, isLoading: false });
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
      chongCount: 9,
      wenCount: 12,
      baoCount: 9,
      useCustomTierCounts: false,
      chongScoreDiff: 10,
      wenScoreDiff: 3,
      baoScoreDiff: 10,
      useCustomTierScoreDiffs: false,
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