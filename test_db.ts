import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cuznuwzjtbkmittqfnao.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1em51d3pqdGJrbWl0dHFmbmFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg3Mjg1NjcsImV4cCI6MjAzNDMwNDU2N30.Zh8f2C9B2tK7dM1b3L1hZ8k8n7m5f5G1y9t8b4f3G3H';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('=== 测试天津数据 ===');
  
  console.log('');
  console.log('--- 1. 检查 admission_scores 表 ---');
  const { data: admissionData, error: admissionError } = await supabase
    .from('admission_scores')
    .select('school_name, province, year, score')
    .eq('province', '天津');
  
  if (admissionError) {
    console.error('admission_scores 查询失败:', admissionError);
  } else {
    console.log('admission_scores 天津记录数:', admissionData?.length || 0);
    const schools = [...new Set((admissionData || []).map(d => d.school_name))];
    console.log('admission_scores 天津学校数:', schools.length);
  }
  
  console.log('');
  console.log('--- 2. 检查 major_scores 表 ---');
  const { data: majorData, error: majorError } = await supabase
    .from('major_scores')
    .select('school_name, province, year, min_score, subject_requirement')
    .eq('province', '天津');
  
  if (majorError) {
    console.error('major_scores 查询失败:', majorError);
  } else {
    console.log('major_scores 天津记录数:', majorData?.length || 0);
    const schools = [...new Set((majorData || []).map(d => d.school_name))];
    console.log('major_scores 天津学校数:', schools.length);
    
    const byYear: Record<number, number> = {};
    (majorData || []).forEach(d => {
      byYear[d.year] = (byYear[d.year] || 0) + 1;
    });
    console.log('按年份分布:', byYear);
    
    const nullMinScore = (majorData || []).filter(d => d.min_score === null).length;
    console.log('min_score 为 null 的记录数:', nullMinScore);
  }
  
  console.log('');
  console.log('--- 3. 检查前10条 major_scores 记录 ---');
  if (majorData && majorData.length > 0) {
    majorData.slice(0, 10).forEach((d, i) => {
      console.log(`${i+1}. ${d.school_name} | ${d.year} | ${d.min_score} | ${d.subject_requirement}`);
    });
  }
}

test().catch(console.error);
