import { supabase } from '../lib/supabase';

export interface MajorScore {
  id: string;
  school_name: string;
  year: number;
  major_name: string;
  major_group: string | null;
  min_score: number | null;
  min_rank: number | null;
  person_count: number | null;
  batch: string | null;
  major_description: string | null;
  subject_requirement: string | null;
  province: string | null;
  school_code: string | null;
  level: string | null;
  avg_score: number | null;
  batch_line: number | null;
  batch_line_diff: number | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  admission_probability?: number;
  tier?: '冲' | '稳' | '保';
}

export interface SchoolMajorStats {
  school_name: string;
  total_majors: number;
  years: number[];
  min_score: number;
  max_score: number;
  avg_score: number;
}

export interface MajorRecommendationResult {
  school_name: string;
  major_name: string;
  major_group: string | null;
  year: number;
  min_score: number;
  min_rank: number | null;
  person_count: number | null;
  batch: string | null;
  subject_requirement: string | null;
  major_description: string | null;
  admission_probability: number;
  tier: '冲' | '稳' | '保';
}

export const majorScoreService = {
  async getBySchool(schoolName: string): Promise<MajorScore[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('major_scores')
      .select('*')
      .ilike('school_name', `%${schoolName}%`)
      .order('year', { ascending: false })
      .order('min_score', { ascending: false })
      .limit(1000);
    
    if (error) {
      console.error('获取学校专业分数线失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getBySchoolAndYear(schoolName: string, year: number): Promise<MajorScore[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('major_scores')
      .select('*')
      .ilike('school_name', `%${schoolName}%`)
      .eq('year', year)
      .order('min_score', { ascending: false })
      .limit(500);
    
    if (error) {
      console.error('获取学校年度专业分数线失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getByScoreRange(minScore: number, maxScore: number): Promise<MajorScore[]> {
    if (!supabase) return [];
    
    let offset = 0;
    const limit = 1000;
    const allData: MajorScore[] = [];
    
    while (true) {
      const { data, error } = await supabase
        .from('major_scores')
        .select('*')
        .gte('min_score', minScore)
        .lte('min_score', maxScore)
        .order('min_score', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('获取分数段专业分数线失败:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      allData.push(...data);
      if (data.length < limit) break;
      offset += limit;
    }
    
    return allData;
  },

  async getByScoreRangeAndYear(minScore: number, maxScore: number, year: number): Promise<MajorScore[]> {
    if (!supabase) return [];
    
    let offset = 0;
    const limit = 1000;
    const allData: MajorScore[] = [];
    
    while (true) {
      const { data, error } = await supabase
        .from('major_scores')
        .select('*')
        .gte('min_score', minScore)
        .lte('min_score', maxScore)
        .eq('year', year)
        .order('min_score', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('获取分数段专业分数线失败:', error);
        break;
      }
      
      if (!data || data.length === 0) break;
      
      allData.push(...data);
      if (data.length < limit) break;
      offset += limit;
    }
    
    return allData;
  },

  async searchMajors(keyword: string): Promise<MajorScore[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('major_scores')
      .select('*')
      .ilike('major_name', `%${keyword}%`)
      .order('min_score', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('搜索专业失败:', error);
      return [];
    }
    
    return data || [];
  },

  async getSchoolStats(schoolName?: string): Promise<SchoolMajorStats[]> {
    if (!supabase) return [];
    
    let query = supabase
      .from('major_scores')
      .select('school_name, year, min_score')
      .order('school_name', { ascending: true });
    
    if (schoolName) {
      query = query.ilike('school_name', `%${schoolName}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('获取学校统计失败:', error);
      return [];
    }
    
    if (!data || data.length === 0) return [];
    
    const statsMap = new Map<string, SchoolMajorStats>();
    
    for (const item of data) {
      const name = item.school_name;
      const year = item.year;
      const score = item.min_score;
      
      if (!statsMap.has(name)) {
        statsMap.set(name, {
          school_name: name,
          total_majors: 0,
          years: [],
          min_score: score || 999,
          max_score: score || 0,
          avg_score: 0,
        });
      }
      
      const stats = statsMap.get(name)!;
      stats.total_majors++;
      if (!stats.years.includes(year)) {
        stats.years.push(year);
      }
      if (score && score < stats.min_score) stats.min_score = score;
      if (score && score > stats.max_score) stats.max_score = score;
    }
    
    return Array.from(statsMap.values()).map(stats => ({
      ...stats,
      avg_score: Math.round((stats.min_score + stats.max_score) / 2),
    }));
  },

  async getAllSchools(): Promise<string[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('major_scores')
      .select('school_name');
    
    if (error) {
      console.error('获取所有学校失败:', error);
      return [];
    }
    
    const schools = [...new Set((data || []).map(item => item.school_name))];
    return schools.sort();
  },

  async getMajorsBySchool(schoolName: string): Promise<string[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('major_scores')
      .select('major_name')
      .ilike('school_name', `%${schoolName}%`);
    
    if (error) {
      console.error('获取学校专业列表失败:', error);
      return [];
    }
    
    const majors = [...new Set((data || []).map(item => item.major_name))];
    return majors.sort();
  },
};