import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KEY_DATA: Record<number, { cumulative_count: number }> = {
  680: { cumulative_count: 197 },
  650: { cumulative_count: 1822 },
  600: { cumulative_count: 10077 },
  547: { cumulative_count: 24370 },
  458: { cumulative_count: 52753 },
  300: { cumulative_count: 77488 },
};

async function verifyAndFixCategory() {
  console.log('=== 验证并修复天津2026年一分一段表数据 ===\n');

  const { data: stats, error: statsError } = await supabase
    .from('score_distribution_stats')
    .select('*')
    .eq('province', '天津')
    .eq('year', 2026)
    .limit(1);

  if (statsError) {
    console.error('❌ 获取统计信息失败:', statsError.message);
    return;
  }

  if (!stats || stats.length === 0) {
    console.error('❌ 数据库中未找到天津2026年统计数据');
    return;
  }

  const stat = stats[0];
  console.log('📊 当前数据库统计信息:');
  console.log(`   最高分: ${stat.max_score}`);
  console.log(`   最低分: ${stat.min_score}`);
  console.log(`   总人数: ${stat.total_students}`);
  console.log(`   累计人数: ${stat.max_cumulative}`);
  console.log('');

  let allCorrect = true;
  
  for (const [score, expected] of Object.entries(KEY_DATA)) {
    const { data, error } = await supabase
      .from('score_distribution')
      .select('*')
      .eq('province', '天津')
      .eq('year', 2026)
      .eq('score', parseInt(score))
      .limit(1);

    if (error) {
      console.error(`❌ 查询分数${score}失败:`, error.message);
      allCorrect = false;
      continue;
    }

    if (!data || data.length === 0) {
      console.error(`❌ 数据库中未找到分数${score}的数据`);
      allCorrect = false;
      continue;
    }

    const row = data[0];
    
    if (row.cumulative_count !== expected.cumulative_count) {
      console.error(`❌ 分数${score}分累计人数有误:`);
      console.log(`   数据库: ${row.cumulative_count}`);
      console.log(`   期望值: ${expected.cumulative_count}`);
      allCorrect = false;
    } else {
      console.log(`✅ 分数${score}分累计人数正确: ${row.cumulative_count}人`);
    }

    if (!row.category || row.category !== '普通类') {
      console.warn(`⚠️ 分数${score}分category字段不正确: ${row.category || 'NULL'}`);
    }
  }

  const { data: nullCategoryRows, error: nullError } = await supabase
    .from('score_distribution')
    .select('count(*)')
    .eq('province', '天津')
    .eq('year', 2026)
    .is('category', null);

  if (!nullError && nullCategoryRows && nullCategoryRows.length > 0) {
    const count = nullCategoryRows[0].count;
    if (count > 0) {
      console.log(`\n⚠️ 发现 ${count} 条数据的category为NULL，需要更新`);
      const { error: updateError } = await supabase
        .from('score_distribution')
        .update({ category: '普通类' })
        .eq('province', '天津')
        .eq('year', 2026)
        .is('category', null);

      if (updateError) {
        console.error('❌ 更新category失败:', updateError.message);
      } else {
        console.log('✅ 已成功将所有NULL的category更新为"普通类"');
      }
    }
  }

  console.log('\n=== 验证完成 ===');
  if (allCorrect) {
    console.log('✅ 所有关键数据验证通过！');
  }
}

verifyAndFixCategory().catch(console.error);
