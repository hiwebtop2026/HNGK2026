import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateDatabase() {
  console.log('=== 更新数据库 group_code ===\n');
  
  // 1. 检查当前 admission_scores 表中的 group_code 格式
  console.log('1. 检查当前 admission_scores 表...');
  const { data: currentData, error: currentError } = await supabase
    .from('admission_scores')
    .select('group_code, province')
    .limit(20);
  
  if (currentError) {
    console.log(`   查询失败: ${currentError.message}`);
    return;
  }
  
  console.log(`   当前数据: ${currentData?.length || 0} 条`);
  if (currentData && currentData.length > 0) {
    console.log('   前10条记录:');
    currentData.slice(0, 10).forEach((d, i) => {
      console.log(`     ${i+1}: group_code=${d.group_code}, province=${d.province}`);
    });
  }
  
  // 2. 统计海南数据的 group_code 前缀情况
  console.log('\n2. 统计海南数据的 group_code 前缀...');
  const { data: hainanData, error: hainanError } = await supabase
    .from('admission_scores')
    .select('group_code')
    .eq('province', '海南');
  
  if (hainanError) {
    console.log(`   查询失败: ${hainanError.message}`);
  } else {
    const prefixStats = {};
    (hainanData || []).forEach(d => {
      const prefix = d.group_code?.substring(0, 2) || 'UNKNOWN';
      prefixStats[prefix] = (prefixStats[prefix] || 0) + 1;
    });
    
    console.log('   group_code 前缀分布:');
    Object.entries(prefixStats).forEach(([prefix, count]) => {
      console.log(`     ${prefix}: ${count} 条`);
    });
    
    // 3. 更新海南数据的 group_code（添加 HL 前缀）
    const needUpdate = hainanData?.filter(d => !d.group_code?.startsWith('HL')) || [];
    console.log(`\n3. 需要更新的海南数据: ${needUpdate.length} 条`);
    
    if (needUpdate.length > 0) {
      console.log('   开始批量更新...');
      const batchSize = 100;
      let updatedCount = 0;
      
      for (let i = 0; i < needUpdate.length; i += batchSize) {
        const batch = needUpdate.slice(i, i + batchSize);
        const updates = batch.map(d => ({
          id: d.id,
          group_code: 'HL' + d.group_code
        }));
        
        const { error: updateError } = await supabase
          .from('admission_scores')
          .upsert(updates, { onConflict: 'id' })
          .execute();
        
        if (updateError) {
          console.log(`     批次 ${i/batchSize + 1}: 更新失败 - ${updateError.message}`);
        } else {
          updatedCount += batch.length;
          console.log(`     批次 ${i/batchSize + 1}: 更新 ${batch.length} 条成功`);
        }
      }
      
      console.log(`   总共更新: ${updatedCount} 条`);
    }
    
    // 4. 检查天津数据
    console.log('\n4. 检查天津数据...');
    const { data: tianjinData, error: tianjinError } = await supabase
      .from('admission_scores')
      .select('group_code')
      .eq('province', '天津');
    
    if (tianjinError) {
      console.log(`   查询失败: ${tianjinError.message}`);
    } else {
      const tjPrefixStats = {};
      (tianjinData || []).forEach(d => {
        const prefix = d.group_code?.substring(0, 2) || 'UNKNOWN';
        tjPrefixStats[prefix] = (tjPrefixStats[prefix] || 0) + 1;
      });
      
      console.log('   group_code 前缀分布:');
      Object.entries(tjPrefixStats).forEach(([prefix, count]) => {
        console.log(`     ${prefix}: ${count} 条`);
      });
    }
  }
  
  // 5. 检查 major_scores 表
  console.log('\n5. 检查 major_scores 表...');
  const { data: majorData, error: majorError } = await supabase
    .from('major_scores')
    .select('group_code, province')
    .limit(10);
  
  if (majorError) {
    console.log(`   查询失败: ${majorError.message}`);
  } else {
    console.log(`   数据量: ${majorData?.length || 0} 条`);
    if (majorData && majorData.length > 0) {
      console.log('   前5条记录:');
      majorData.slice(0, 5).forEach((d, i) => {
        console.log(`     ${i+1}: group_code=${d.group_code}, province=${d.province}`);
      });
    }
  }
  
  console.log('\n=== 更新完成 ===');
}

updateDatabase().catch(console.error);