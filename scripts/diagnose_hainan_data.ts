import { supabase } from '../src/lib/supabase';

async function diagnose() {
  console.log('=== 海南数据诊断脚本 ===\n');
  
  if (!supabase) {
    console.error('Supabase 未配置！');
    return;
  }
  
  console.log('1. 检查 admission_scores 表数据\n');
  
  // 检查总数
  const { count, error: countError } = await supabase
    .from('admission_scores')
    .select('*', { count: 'exact', head: true });
  
  console.log(`总记录数: ${count ?? '未知'}`, countError ? `(错误: ${countError.message})` : '');
  
  // 按省份分组
  const { data: provinceData, error: provinceError } = await supabase
    .from('admission_scores')
    .select('province, COUNT(*) as cnt')
    .group('province');
  
  console.log('\n按省份分布:');
  if (provinceData) {
    provinceData.forEach((item: any) => {
      console.log(`  ${item.province}: ${item.cnt} 条`);
    });
  } else {
    console.log(`  查询失败: ${provinceError?.message}`);
  }
  
  // 按年份分组
  const { data: yearData, error: yearError } = await supabase
    .from('admission_scores')
    .select('year, COUNT(*) as cnt')
    .group('year')
    .order('year', { ascending: true });
  
  console.log('\n按年份分布:');
  if (yearData) {
    yearData.forEach((item: any) => {
      console.log(`  ${item.year}年: ${item.cnt} 条`);
    });
  } else {
    console.log(`  查询失败: ${yearError?.message}`);
  }
  
  // 检查海南2025年数据
  const { data: hainan2025, error: hainanError } = await supabase
    .from('admission_scores')
    .select('school_name, score')
    .eq('province', '海南')
    .eq('year', 2025)
    .order('score', { ascending: false })
    .limit(10);
  
  console.log('\n海南2025年前10条高分数据:');
  if (hainan2025) {
    hainan2025.forEach((item: any, index: number) => {
      console.log(`  ${index + 1}. ${item.school_name}: ${item.score}分`);
    });
  } else {
    console.log(`  查询失败: ${hainanError?.message}`);
  }
  
  // 检查major_scores表
  console.log('\n\n2. 检查 major_scores 表数据\n');
  
  const { count: majorCount, error: majorCountError } = await supabase
    .from('major_scores')
    .select('*', { count: 'exact', head: true });
  
  console.log(`总记录数: ${majorCount ?? '未知'}`, majorCountError ? `(错误: ${majorCountError.message})` : '');
  
  const { data: majorProvinceData, error: majorProvinceError } = await supabase
    .from('major_scores')
    .select('province, COUNT(*) as cnt')
    .group('province');
  
  console.log('\n按省份分布:');
  if (majorProvinceData) {
    majorProvinceData.forEach((item: any) => {
      console.log(`  ${item.province}: ${item.cnt} 条`);
    });
  } else {
    console.log(`  查询失败: ${majorProvinceError?.message}`);
  }
  
  // 检查score_distribution表
  console.log('\n\n3. 检查 score_distribution 表数据\n');
  
  const { count: distCount, error: distCountError } = await supabase
    .from('score_distribution')
    .select('*', { count: 'exact', head: true });
  
  console.log(`总记录数: ${distCount ?? '未知'}`, distCountError ? `(错误: ${distCountError.message})` : '');
  
  const { data: distProvinceData, error: distProvinceError } = await supabase
    .from('score_distribution')
    .select('province, year, COUNT(*) as cnt')
    .group('province, year');
  
  console.log('\n按省份和年份分布:');
  if (distProvinceData) {
    distProvinceData.forEach((item: any) => {
      console.log(`  ${item.province} ${item.year}年: ${item.cnt} 条`);
    });
  } else {
    console.log(`  查询失败: ${distProvinceError?.message}`);
  }
  
  // 检查海南600分的位次数据
  const { data: rankData, error: rankError } = await supabase
    .from('score_distribution')
    .select('score, min_rank, max_rank, category, cumulative_count')
    .eq('province', '海南')
    .eq('year', 2026)
    .gte('score', 595)
    .lte('score', 605)
    .order('score', { ascending: false });
  
  console.log('\n海南2026年600分左右位次数据:');
  if (rankData) {
    rankData.forEach((item: any) => {
      console.log(`  分数${item.score}: 位次${item.min_rank}-${item.max_rank}, 累计${item.cumulative_count}, 类别${item.category}`);
    });
  } else {
    console.log(`  查询失败: ${rankError?.message}`);
  }
  
  // 检查RLS状态
  console.log('\n\n4. 检查表权限和RLS状态\n');
  
  const { data: rlsData, error: rlsError } = await supabase
    .rpc('get_table_rls_status');
  
  if (rlsData) {
    rlsData.forEach((item: any) => {
      console.log(`  ${item.table_name}: RLS=${item.rls_enabled ? '启用' : '禁用'}, 策略数=${item.policy_count}`);
    });
  } else {
    console.log(`  无法查询RLS状态: ${rlsError?.message}`);
    console.log('  (可能需要创建get_table_rls_status存储过程)');
  }
  
  console.log('\n=== 诊断完成 ===');
}

diagnose().catch(console.error);