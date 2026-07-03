import { supabase } from '../lib/supabase';
import { cacheService } from './cacheService';

export interface ScoreDistribution {
  id: string;
  province: string;
  year: number;
  score: number;
  count: number;
  cumulative_count: number;
  min_rank: number;
  max_rank: number;
  rank: number;
  category: string;
  created_at: string;
}

export const scoreDistributionService = {
  async getByProvinceAndYear(province: string, year: number, category?: string): Promise<ScoreDistribution[]> {
    return cacheService.get('getByProvinceAndYear', async () => {
      if (!supabase) return [];

      let query = supabase
        .from('score_distribution')
        .select('*')
        .eq('province', province)
        .eq('year', year)
        .order('score', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取一分一段表失败:', error);
        return [];
      }

      return data || [];
    }, province, year, category);
  },

  async getByYear(year: number, category?: string): Promise<ScoreDistribution[]> {
    return cacheService.get('getByYear', async () => {
      if (!supabase) return [];

      let query = supabase
        .from('score_distribution')
        .select('*')
        .eq('year', year)
        .order('score', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('获取一分一段表失败:', error);
        return [];
      }

      return data || [];
    }, year, category);
  },

  async getRankByScore(province: string, score: number, year: number, category?: string): Promise<{minRank: number, maxRank: number, count: number, cumulativeCount: number} | null> {
    if (!supabase) return null;

    let query = supabase
      .from('score_distribution')
      .select('min_rank, max_rank, count, cumulative_count')
      .eq('province', province)
      .eq('year', year)
      .eq('score', score)
      .limit(1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('根据分数查询位次失败:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const row = data[0];
    return {
      minRank: row.min_rank,
      maxRank: row.max_rank,
      count: row.count,
      cumulativeCount: row.cumulative_count
    };
  },

  async getScoreByRank(province: string, rank: number, year: number, category?: string): Promise<number | null> {
    return cacheService.get('getScoreByRank', async () => {
      if (!supabase) return null;

      let query = supabase
        .from('score_distribution')
        .select('score')
        .eq('province', province)
        .eq('year', year)
        .gte('min_rank', rank)
        .order('min_rank', { ascending: true })
        .limit(1);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('根据位次查询分数失败:', error);
        return null;
      }

      return data?.[0]?.score || null;
    }, province, rank, year, category);
  },

  async getCategories(province: string, year: number): Promise<string[]> {
    return cacheService.get('getCategories', async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('score_distribution')
        .select('category', { count: 'exact', head: false })
        .eq('province', province)
        .eq('year', year);

      if (error) {
        console.error('获取类别列表失败:', error);
        return [];
      }

      return [...new Set((data || []).map((item: any) => item.category).filter(Boolean))];
    }, province, year);
  },

  async getStats(province: string, year: number): Promise<any> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('score_distribution')
      .select('MIN(score) as min_score, MAX(score) as max_score, SUM(count) as total_students, MAX(cumulative_count) as max_cumulative')
      .eq('province', province)
      .eq('year', year)
      .limit(1);

    if (error) {
      console.error('获取统计信息失败:', error);
      return null;
    }

    return data?.[0] || null;
  },

  async insertBatch(data: Omit<ScoreDistribution, 'id' | 'created_at'>[]): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase未配置' };

    const { error } = await supabase
      .from('score_distribution')
      .insert(data);

    if (error) {
      console.error('批量插入一分一段表失败:', error);
      return { success: false, error: error.message };
    }

    this.clearCache();

    return { success: true };
  },

  async clearYear(province: string, year: number): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase未配置' };

    const { error } = await supabase
      .from('score_distribution')
      .delete()
      .eq('province', province)
      .eq('year', year);

    if (error) {
      console.error('清空年份数据失败:', error);
      return { success: false, error: error.message };
    }

    this.clearCache();

    return { success: true };
  },
  
  clearCache(): void {
    cacheService.clearByPrefix('getByProvinceAndYear');
    cacheService.clearByPrefix('getByYear');
    cacheService.clearByPrefix('getRankByScore');
    cacheService.clearByPrefix('getScoreByRank');
    cacheService.clearByPrefix('getCategories');
    cacheService.clearByPrefix('getStats');
  },
};
