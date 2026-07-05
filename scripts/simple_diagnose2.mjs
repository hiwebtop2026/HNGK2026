import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== 海南数据诊断 - 第二部分 ===\n');
  
  // 检查所有相关表
  const tables = ['admission_scores', 'major_scores', 'score_distribution', 'subject_requirements'];
  
  for (const table of tables) {
    console.log(`\n${table} 表:`);
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`  总记录数: ${count ?? 0}`);
    
    const { data, error } = await supabase.from(table).select('*').limit(3);
    if (error) {
      console.log(`  查询错误: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`  前3条记录:`);
      data.forEach((d, i) => console.log(`    ${i+1}:`, JSON.stringify(d).substring(0, 150)));
    } else {
      console.log(`  无数据`);
    }
  }
  
  // 检查是否有表存在
  console.log('\n\n检查数据库表列表...');
  try {
    const { data: schemaData, error: schemaError } = await supabase.rpc('get_all_tables');
    if (schemaData) {
      console.log('数据库中的表:');
      schemaData.forEach((t) => console.log(`  ${t}`));
    } else {
      console.log(`无法获取表列表: ${schemaError?.message}`);
    }
  } catch (e) {
    console.log('RPC调用失败:', e.message);
  }
  
  // 尝试直接查询
  console.log('\n\n尝试直接查询admission_scores...');
  const { data: rawData, error: rawError } = await supabase
    .from('admission_scores')
    .select('school_name, province, year, score');
  
  console.log(`返回数据: ${rawData?.length ?? 0} 条`, rawError ? `(错误: ${rawError.message})` : '');
  
  // 检查RLS状态
  console.log('\n\n检查RLS状态...');
  try {
    const { data: rlsResult, error: rlsError } = await supabase.rpc('check_rls_status', { table_name: 'admission_scores' });
    console.log('RLS检查结果:', rlsResult || rlsError?.message);
  } catch (e) {
    console.log('RLS检查失败:', e.message);
  }
  
  // 尝试禁用RLS
  console.log('\n\n尝试禁用RLS...');
  try {
    const { error: disableError } = await supabase.rpc('disable_rls', { table_name: 'admission_scores' });
    console.log('禁用RLS结果:', disableError ? `失败: ${disableError.message}` : '成功');
  } catch (e) {
    console.log('禁用RLS失败:', e.message);
  }
  
  // 再次查询
  console.log('\n\n禁用RLS后再次查询...');
  const { data: afterData, error: afterError } = await supabase
    .from('admission_scores')
    .select('school_name, province, year, score');
  
  console.log(`返回数据: ${afterData?.length ?? 0} 条`, afterError ? `(错误: ${afterError.message})` : '');
  
  console.log('\n=== 诊断完成 ===');
}

diagnose().catch(console.error);