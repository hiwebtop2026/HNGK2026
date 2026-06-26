import { create } from 'zustand';
import type { SchoolScore, VolunteerResult } from '../utils/volunteerUtils';

interface AppState {
  // 输入参数
  baseScore: number | null;
  scoreRange: number;
  subject: number;
  totalVolunteers: number;
  selectedLevels: string[];
  selectedProvinces: string[];
  selectedMajorCategories: string[];
  
  // 数据状态
  schoolData: SchoolScore[];
  isLoading: boolean;
  error: string | null;
  
  // 生成结果
  results: VolunteerResult[];
  
  // 操作方法
  setBaseScore: (score: number | null) => void;
  setScoreRange: (range: number) => void;
  setSubject: (subject: number) => void;
  setTotalVolunteers: (count: number) => void;
  toggleLevel: (level: string) => void;
  toggleProvince: (province: string) => void;
  toggleMajorCategory: (categoryId: string) => void;
  clearAllProvinces: () => void;
  selectAllProvinces: () => void;
  toggleRegion: (provinces: string[]) => void;
  setSchoolData: (data: SchoolScore[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResults: (results: VolunteerResult[]) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // 默认值
  baseScore: null,
  scoreRange: 15,
  subject: 54,
  totalVolunteers: 30,
  selectedLevels: ['985', '211', '双一流', '普通本科'],
  selectedProvinces: [],
  selectedMajorCategories: [],
  
  // 数据状态
  schoolData: [],
  isLoading: false,
  error: null,
  
  // 结果
  results: [],
  
  // 方法
  setBaseScore: (score) => set({ baseScore: score }),
  setScoreRange: (range) => set({ scoreRange: range }),
  setSubject: (subject) => set({ subject: subject }),
  setTotalVolunteers: (count) => set({ totalVolunteers: count }),
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
  reset: () => set({
    baseScore: null,
    scoreRange: 15,
    subject: 54,
    totalVolunteers: 30,
    selectedLevels: ['985', '211', '双一流', '普通本科'],
    selectedProvinces: [],
    selectedMajorCategories: [],
    results: [],
    error: null,
  }),
}));