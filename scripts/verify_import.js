import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('🔍 验证数据库数据...\n');

  const hainanResult = await supabase.from('major_scores')
    .select('*', { count: 'exact', head: true })
    .eq('province', '海南');
  console.log(`海南: ${hainanResult.count || 0} 条记录`);

  const tianjinResult = await supabase.from('major_scores')
    .select('*', { count: 'exact', head: true })
    .eq('province', '天津');
  console.log(`天津: ${tianjinResult.count || 0} 条记录`);

  const totalResult = await supabase.from('major_scores')
    .select('*', { count: 'exact', head: true });
  console.log(`总计: ${totalResult.count || 0} 条记录\n`);

  const sampleResult = await supabase.from('major_scores')
    .select('school_name, year, major_name, min_score, province')
    .limit(6);
  
  console.log('示例数据:');
  for (const item of sampleResult.data || []) {
    console.log(`  ${item.province} | ${item.school_name} | ${item.year} | ${item.major_name} | ${item.min_score}分`);
  }

  console.log('\n✅ 验证完成');
}

main().catch(console.error);