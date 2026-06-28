import { supabase, TABLES } from '../lib/supabase';

export interface AdmissionScore {
  id: string;
  year: number;
  group_code: string;
  group_name: string;
  school_name: string;
  school_code: string;
  group_number: string;
  subject_requirement: string;
  score: number;
  plan_count?: number;
  admission_count?: number;
  batch_type: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectRequirement {
  code: string;
  description: string;
  subjects: string;
  requirement_type: string;
}

export interface SchoolScoreStats {
  school_name: string;
  school_code: string;
  years_count: number;
  min_score: number;
  max_score: number;
  avg_score: number;
  score_2023?: number;
  score_2024?: number;
  score_2025?: number;
}

export interface GroupScoreChange {
  group_code: string;
  group_name: string;
  school_name: string;
  subject_requirement: string;
  score_2023?: number;
  score_2024?: number;
  score_2025?: number;
  change_23_24?: number;
  change_24_25?: number;
}

export const admissionScoreService = {
  async getByYear(year: number): Promise<AdmissionScore[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from(TABLES.ADMISSION_SCORES)
      .select('*')
      .eq('year', year)
      .order('score', { ascending: false });
    
    if (error) {
      console.error('获取投档分数线失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getBySchool(schoolName: string): Promise<AdmissionScore[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from(TABLES.ADMISSION_SCORES)
      .select('*')
      .ilike('school_name', `%${schoolName}%`)
      .order('year', { ascending: false })
      .order('score', { ascending: false });
    
    if (error) {
      console.error('获取学校投档分数线失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getByScoreRange(minScore: number, maxScore: number, year?: number): Promise<AdmissionScore[]> {
    if (!supabase) return [];
    
    let query = supabase
      .from(TABLES.ADMISSION_SCORES)
      .select('*')
      .gte('score', minScore)
      .lte('score', maxScore);
    
    if (year) {
      query = query.eq('year', year);
    }
    
    const { data, error } = await query.order('score', { ascending: false });
    
    if (error) {
      console.error('获取分数段投档线失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getSchoolStats(schoolName?: string): Promise<SchoolScoreStats[]> {
    if (!supabase) return [];
    
    let query = supabase
      .from('admission_score_stats')
      .select('*');
    
    if (schoolName) {
      query = query.ilike('school_name', `%${schoolName}%`);
    }
    
    const { data, error } = await query.order('avg_score', { ascending: false });
    
    if (error) {
      console.error('获取学校统计失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getGroupScoreChanges(schoolName?: string): Promise<GroupScoreChange[]> {
    if (!supabase) return [];
    
    let query = supabase
      .from('group_score_changes')
      .select('*');
    
    if (schoolName) {
      query = query.ilike('school_name', `%${schoolName}%`);
    }
    
    const { data, error } = await query.order('school_name', { ascending: true });
    
    if (error) {
      console.error('获取专业组分数变化失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getSubjectRequirement(code: string): Promise<SubjectRequirement | null> {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from(TABLES.SUBJECT_REQUIREMENTS)
      .select('*')
      .eq('code', code)
      .limit(1);
    
    if (error) {
      console.error('获取科目要求失败:', error);
      return null;
    }
    
    return data?.[0] || null;
  },

  async getAllSubjectRequirements(): Promise<SubjectRequirement[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from(TABLES.SUBJECT_REQUIREMENTS)
      .select('*');
    
    if (error) {
      console.error('获取所有科目要求失败:', error);
      return [];
    }
    
    return data || [];
  },

  async searchSchools(keyword: string, year?: number): Promise<AdmissionScore[]> {
    if (!supabase) return [];
    
    let query = supabase
      .from(TABLES.ADMISSION_SCORES)
      .select('*')
      .ilike('school_name', `%${keyword}%`);
    
    if (year) {
      query = query.eq('year', year);
    }
    
    const { data, error } = await query.order('score', { ascending: false }).limit(50);
    
    if (error) {
      console.error('搜索学校失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getYearStats(year: number): Promise<{ min_score: number; max_score: number; avg_score: number; count: number } | null> {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from(TABLES.ADMISSION_SCORES)
      .select('score')
      .eq('year', year);
    
    if (error) {
      console.error('获取年份统计失败:', error);
      return null;
    }
    
    if (!data || data.length === 0) return null;
    
    const scores = data.map(d => d.score);
    return {
      min_score: Math.min(...scores),
      max_score: Math.max(...scores),
      avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    };
  },
};