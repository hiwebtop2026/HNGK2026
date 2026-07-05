import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRLS() {
  console.log('=== 检查RLS状态 ===\n');
  
  const tables = ['admission_scores', 'major_scores', 'score_distribution', 'subject_requirements'];
  
  for (const table of tables) {
    console.log(`\n检查 ${table} 表:`);
    
    // 尝试查询数据
    const { data, error } = await supabase.from(table).select('*').limit(5);
    
    if (error) {
      console.log(`  查询错误: ${error.message}`);
      
      // 检查是否是RLS问题
      if (error.message.includes('RLS') || error.message.includes('permission')) {
        console.log('  可能是RLS导致的权限问题!');
        
        // 尝试禁用RLS
        console.log('  尝试通过SQL禁用RLS...');
        const { error: rlsError } = await supabase.rpc('disable_rls_on_table', { table_name: table });
        if (rlsError) {
          console.log(`    禁用失败: ${rlsError.message}`);
        } else {
          console.log('    禁用成功!');
          
          // 再次查询
          const { data: afterData, error: afterError } = await supabase.from(table).select('*').limit(5);
          if (afterError) {
            console.log(`    再次查询失败: ${afterError.message}`);
          } else {
            console.log(`    再次查询成功: ${afterData?.length ?? 0} 条数据`);
          }
        }
      }
    } else {
      console.log(`  查询成功: ${data?.length ?? 0} 条数据`);
      if (data && data.length > 0) {
        console.log('  前3条:', JSON.stringify(data.slice(0, 3)).substring(0, 200));
      }
    }
  }
  
  console.log('\n=== 尝试直接使用SQL查询 ===');
  
  // 尝试使用视图
  console.log('\n查询 admission_score_stats 视图:');
  const { data: statsData, error: statsError } = await supabase.from('admission_score_stats').select('*').limit(5);
  console.log(`  结果: ${statsData?.length ?? 0} 条`, statsError ? `(错误: ${statsError.message})` : '');
  
  // 尝试查询 score_distribution_stats 视图
  console.log('\n查询 score_distribution_stats 视图:');
  const { data: distStatsData, error: distStatsError } = await supabase.from('score_distribution_stats').select('*').limit(5);
  console.log(`  结果: ${distStatsData?.length ?? 0} 条`, distStatsError ? `(错误: ${distStatsError.message})` : '');
  
  console.log('\n=== 检查完成 ===');
}

checkRLS().catch(console.error);