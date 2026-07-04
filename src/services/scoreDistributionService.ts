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
  },

  async getByYear(year: number, category?: string): Promise<ScoreDistribution[]> {
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
  },

  async getRankByScore(province: string, score: number, year: number, category?: string): Promise<{minRank: number, maxRank: number, count: number, cumulativeCount: number} | null> {
    console.debug(`[getRankByScore] 查询: province=${province}, score=${score}, year=${year}, category=${category ?? 'undefined'}`);

    if (!supabase) {
      console.warn('[getRankByScore] Supabase 客户端未配置');
      return null;
    }

    const is3Plus3Mode = ['海南', '天津', '北京', '上海', '山东', '浙江'].includes(province);
    const categoriesToTry = is3Plus3Mode 
      ? ['普通类', null, '物理类', '历史类']
      : [category, null];

    let dbResult: {minRank: number, maxRank: number, count: number, cumulativeCount: number} | null = null;

    for (const cat of categoriesToTry) {
      let query = supabase
        .from('score_distribution')
        .select('min_rank, max_rank, count, cumulative_count, score, category')
        .eq('province', province)
        .eq('year', year)
        .eq('score', score)
        .limit(1);

      if (cat) {
        query = query.eq('category', cat);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        const row = data[0];
        if (row.min_rank && row.max_rank) {
          dbResult = {
            minRank: row.min_rank,
            maxRank: row.max_rank,
            count: row.count || 0,
            cumulativeCount: row.cumulative_count || row.max_rank
          };
          console.debug(`[getRankByScore] 数据库精确匹配成功: score=${row.score}, rank=${row.min_rank}-${row.max_rank}, category=${row.category}`);
          break;
        }
      }
    }

    if (!dbResult) {
      console.debug(`[getRankByScore] 精确匹配失败，尝试查找分数 >= ${score} 的记录`);
      
      for (const cat of categoriesToTry) {
        let fallbackQuery = supabase
          .from('score_distribution')
          .select('min_rank, max_rank, count, cumulative_count, score, category')
          .eq('province', province)
          .eq('year', year)
          .gte('score', score)
          .order('score', { ascending: true })
          .limit(1);

        if (cat) {
          fallbackQuery = fallbackQuery.eq('category', cat);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;

        if (!fallbackError && fallbackData && fallbackData.length > 0) {
          const row = fallbackData[0];
          if (row.min_rank && row.max_rank) {
            dbResult = {
              minRank: row.min_rank,
              maxRank: row.max_rank,
              count: row.count || 0,
              cumulativeCount: row.cumulative_count || row.max_rank
            };
            console.debug(`[getRankByScore] 使用邻近分数位次: score=${row.score}, rank=${row.min_rank}-${row.max_rank}`);
            break;
          }
        }
      }
    }

    if (!dbResult) {
      console.debug(`[getRankByScore] 尝试查找分数 <= ${score} 的记录作为兜底`);
      
      for (const cat of categoriesToTry) {
        let lowerQuery = supabase
          .from('score_distribution')
          .select('min_rank, max_rank, count, cumulative_count, score, category')
          .eq('province', province)
          .eq('year', year)
          .lte('score', score)
          .order('score', { ascending: false })
          .limit(1);

        if (cat) {
          lowerQuery = lowerQuery.eq('category', cat);
        }

        const { data: lowerData, error: lowerError } = await lowerQuery;

        if (!lowerError && lowerData && lowerData.length > 0) {
          const row = lowerData[0];
          if (row.min_rank && row.max_rank) {
            dbResult = {
              minRank: row.min_rank,
              maxRank: row.max_rank,
              count: row.count || 0,
              cumulativeCount: row.cumulative_count || row.max_rank
            };
            console.debug(`[getRankByScore] 使用较低分数位次: score=${row.score}, rank=${row.min_rank}-${row.max_rank}`);
            break;
          }
        }
      }
    }

    if (dbResult) {
      const stats = await this.getStats(province, year);
      const expectedTotal = province === '海南' ? 81805 : (province === '天津' ? 77488 : null);
      
      if (expectedTotal && dbResult.maxRank > expectedTotal * 1.5) {
        console.warn(`[getRankByScore] 数据库数据异常: maxRank=${dbResult.maxRank} 远大于预期总人数${expectedTotal}，忽略数据库数据`);
        dbResult = null;
      }
      
      if (dbResult && dbResult.minRank > dbResult.maxRank) {
        console.warn(`[getRankByScore] 数据库数据异常: minRank=${dbResult.minRank} > maxRank=${dbResult.maxRank}，忽略数据库数据`);
        dbResult = null;
      }
    }

    if (!dbResult) {
      console.debug(`[getRankByScore] 数据库未找到匹配数据或数据异常，返回null（将使用本地参考数据）`);
    }

    return dbResult;
  },

  async getScoreByRank(province: string, rank: number, year: number, category?: string): Promise<number | null> {
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
  },

  async getCategories(province: string, year: number): Promise<string[]> {
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
  },

  async getStats(province: string, year: number): Promise<any> {
    if (!supabase) {
      console.warn('[getStats] Supabase 客户端未配置');
      return null;
    }

    console.debug(`[getStats] 查询统计: province=${province}, year=${year}`);

    const { data: statsData, error: statsError } = await supabase
      .from('score_distribution_stats')
      .select('*')
      .eq('province', province)
      .eq('year', year)
      .limit(1);

    if (statsData && statsData.length > 0) {
      console.debug(`[getStats] 从视图获取结果:`, statsData[0]);
      return statsData[0];
    }

    console.debug(`[getStats] 视图无结果，直接计算统计`);
    
    const { data: rawData, error: rawError } = await supabase
      .from('score_distribution')
      .select('count, cumulative_count')
      .eq('province', province)
      .eq('year', year);

    if (rawError || !rawData || rawData.length === 0) {
      console.error('[getStats] 查询失败:', rawError);
      return null;
    }

    const totalStudents = rawData.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    const maxCumulative = Math.max(...rawData.map((item: any) => item.cumulative_count || 0));
    
    const result = {
      province,
      year,
      total_students: totalStudents,
      max_cumulative: maxCumulative
    };
    
    console.debug(`[getStats] 计算结果:`, result);
    return result;
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
