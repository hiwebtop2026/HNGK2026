import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

async function main() {
  console.log('检查RLS状态和数据...\n');

  const serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const serviceResult = await serviceClient.from('major_scores').select('count(*)');
  console.log(`使用 service_role key 查询: ${serviceResult.data?.[0]?.count || 0} 条`);
  if (serviceResult.error) {
    console.log(`  错误: ${serviceResult.error.message}`);
  }

  const anonResult = await anonClient.from('major_scores').select('count(*)');
  console.log(`使用 anon key 查询: ${anonResult.data?.[0]?.count || 0} 条`);
  if (anonResult.error) {
    console.log(`  错误: ${anonResult.error.message}`);
  }

  if (serviceResult.data?.[0]?.count > 0 && anonResult.data?.[0]?.count === 0) {
    console.log('\n⚠️ 数据存在但RLS阻止了访问');
    console.log('正在禁用RLS...');
    const { error } = await serviceClient.rpc('alter_table', {
      table_name: 'major_scores',
      action: 'disable_rls'
    });
    
    if (error) {
      console.log(`❌ RPC调用失败: ${error.message}`);
      console.log('尝试使用SQL方式...');
    }
  }

  console.log('\n✅ 检查完成');
}

main().catch(console.error);