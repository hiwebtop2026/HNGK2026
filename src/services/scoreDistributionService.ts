import { supabase } from '../lib/supabase';
import { cacheService } from './cacheService';

export interface ScoreDistribution {
  id: string;
  year: number;
  score: number;
  cumulative_count: number;
  rank: number;
  category: string;
  created_at: string;
}

export const scoreDistributionService = {
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

  async getRankByScore(score: number, year: number, category?: string): Promise<number | null> {
    return cacheService.get('getRankByScore', async () => {
      if (!supabase) return null;

      let query = supabase
        .from('score_distribution')
        .select('rank')
        .eq('year', year)
        .gte('score', score)
        .order('score', { ascending: false })
        .limit(1);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('根据分数查询位次失败:', error);
        return null;
      }

      return data?.[0]?.rank || null;
    }, score, year, category);
  },

  async getScoreByRank(rank: number, year: number, category?: string): Promise<number | null> {
    return cacheService.get('getScoreByRank', async () => {
      if (!supabase) return null;

      let query = supabase
        .from('score_distribution')
        .select('score')
        .eq('year', year)
        .gte('rank', rank)
        .order('rank', { ascending: true })
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
    }, rank, year, category);
  },

  async getCategories(year: number): Promise<string[]> {
    return cacheService.get('getCategories', async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('score_distribution')
        .select('category', { count: 'exact', head: false });

      if (error) {
        console.error('获取类别列表失败:', error);
        return [];
      }

      return [...new Set((data || []).map((item: any) => item.category).filter(Boolean))];
    }, year);
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

    cacheService.clearByPrefix('getByYear');
    cacheService.clearByPrefix('getRankByScore');
    cacheService.clearByPrefix('getScoreByRank');
    cacheService.clearByPrefix('getCategories');

    return { success: true };
  },

  async clearYear(year: number): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Supabase未配置' };

    const { error } = await supabase
      .from('score_distribution')
      .delete()
      .eq('year', year);

    if (error) {
      console.error('清空年份数据失败:', error);
      return { success: false, error: error.message };
    }

    cacheService.clearByPrefix('getByYear');
    cacheService.clearByPrefix('getRankByScore');
    cacheService.clearByPrefix('getScoreByRank');
    cacheService.clearByPrefix('getCategories');

    return { success: true };
  },
  
  clearCache(): void {
    cacheService.clearByPrefix('getByYear');
    cacheService.clearByPrefix('getRankByScore');
    cacheService.clearByPrefix('getScoreByRank');
    cacheService.clearByPrefix('getCategories');
  },
};