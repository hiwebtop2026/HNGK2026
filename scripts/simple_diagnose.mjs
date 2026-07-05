import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  console.log('=== 海南数据诊断 ===\n');
  
  // 测试连接
  console.log('1. 测试数据库连接...');
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('   连接成功!', error ? `(auth错误: ${error.message})` : '');
  } catch (e) {
    console.log('   连接失败:', e.message);
    return;
  }
  
  // 检查admission_scores表
  console.log('\n2. 检查 admission_scores 表');
  const { count: admCount } = await supabase.from('admission_scores').select('*', { count: 'exact', head: true });
  console.log(`   总记录数: ${admCount ?? 0}`);
  
  const { data: admProvince } = await supabase.from('admission_scores').select('province').limit(5);
  console.log('   前5条province值:', admProvince?.map(a => a.province).join(', ') || '无数据');
  
  // 按province分组
  const { data: admGroup } = await supabase.from('admission_scores').select('province, COUNT(*) as cnt').group('province');
  console.log('   按省份分布:');
  admGroup?.forEach(g => console.log(`     ${g.province}: ${g.cnt}`));
  
  // 检查海南数据
  console.log('\n3. 检查海南数据');
  const { data: hainanData, error: hainanError } = await supabase.from('admission_scores').select('school_name, score, year').eq('province', '海南').limit(5);
  console.log(`   查询海南数据: ${hainanData?.length ?? 0} 条`, hainanError ? `(错误: ${hainanError.message})` : '');
  hainanData?.forEach(d => console.log(`     ${d.school_name} ${d.year}年: ${d.score}分`));
  
  // 检查其他查询方式
  console.log('\n4. 尝试其他查询方式');
  
  // 尝试不带province条件
  const { data: allData } = await supabase.from('admission_scores').select('school_name, province, year, score').limit(10);
  console.log('   不带province条件查询前10条:');
  allData?.forEach(d => console.log(`     ${d.school_name} | ${d.province} | ${d.year} | ${d.score}`));
  
  // 检查major_scores表
  console.log('\n5. 检查 major_scores 表');
  const { count: majorCount } = await supabase.from('major_scores').select('*', { count: 'exact', head: true });
  console.log(`   总记录数: ${majorCount ?? 0}`);
  
  const { data: majorGroup } = await supabase.from('major_scores').select('province, COUNT(*) as cnt').group('province');
  console.log('   按省份分布:');
  majorGroup?.forEach(g => console.log(`     ${g.province}: ${g.cnt}`));
  
  // 检查score_distribution表
  console.log('\n6. 检查 score_distribution 表');
  const { count: distCount } = await supabase.from('score_distribution').select('*', { count: 'exact', head: true });
  console.log(`   总记录数: ${distCount ?? 0}`);
  
  const { data: distGroup } = await supabase.from('score_distribution').select('province, year, COUNT(*) as cnt').group('province, year');
  console.log('   按省份年份分布:');
  distGroup?.forEach(g => console.log(`     ${g.province} ${g.year}: ${g.cnt}`));
  
  console.log('\n=== 诊断完成 ===');
}

diagnose().catch(console.error);