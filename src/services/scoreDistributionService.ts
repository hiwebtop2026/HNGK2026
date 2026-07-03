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
    if (!supabase) {
      console.warn('[getRankByScore] Supabase 客户端未配置');
      return null;
    }

    console.debug(`[getRankByScore] 查询: province=${province}, score=${score}, year=${year}, category=${category ?? 'undefined'}`);

    // 第一次尝试：精确匹配分数
    let query = supabase
      .from('score_distribution')
      .select('min_rank, max_rank, count, cumulative_count, score, category')
      .eq('province', province)
      .eq('year', year)
      .eq('score', score)
      .limit(1);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getRankByScore] 查询失败:', error);
      return null;
    }

    if (data && data.length > 0) {
      const row = data[0];
      console.debug(`[getRankByScore] 精确匹配成功: score=${row.score}, rank=${row.min_rank}-${row.max_rank}, category=${row.category}`);
      return {
        minRank: row.min_rank,
        maxRank: row.max_rank,
        count: row.count,
        cumulativeCount: row.cumulative_count
      };
    }

    // 第二次尝试：分数高于表中最高分时，取最高分的位次
    console.debug(`[getRankByScore] 精确匹配失败，尝试查找最高分位次（score >= ${score}）`);
    let fallbackQuery = supabase
      .from('score_distribution')
      .select('min_rank, max_rank, count, cumulative_count, score, category')
      .eq('province', province)
      .eq('year', year)
      .gte('score', score)
      .order('score', { ascending: true })
      .limit(1);

    if (category) {
      fallbackQuery = fallbackQuery.eq('category', category);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;

    if (fallbackError) {
      console.error('[getRankByScore] 查找最高分位次失败:', fallbackError);
      return null;
    }

    if (!fallbackData || fallbackData.length === 0) {
      console.debug(`[getRankByScore] 未找到 score >= ${score} 的记录，数据可能不存在`);
      return null;
    }

    const row = fallbackData[0];
    console.debug(`[getRankByScore] 使用最高分位次: score=${row.score}, rank=${row.min_rank}-${row.max_rank}`);
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
    if (!supabase) {
      console.warn('[getStats] Supabase 客户端未配置');
      return null;
    }

    console.debug(`[getStats] 查询统计: province=${province}, year=${year}`);

    const { data, error } = await supabase
      .from('score_distribution')
      .select('MIN(score) as min_score, MAX(score) as max_score, SUM(count) as total_students, MAX(cumulative_count) as max_cumulative')
      .eq('province', province)
      .eq('year', year)
      .limit(1);

    if (error) {
      console.error('[getStats] 查询失败:', error);
      return null;
    }

    const stats = data?.[0] || null;
    console.debug(`[getStats] 结果:`, stats);
    return stats;
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
