import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('=== 测试天津数据 ===');
  
  const { data, error } = await supabase
    .from('major_scores')
    .select('school_name, subject_requirement, min_score, year')
    .eq('province', '天津');
  
  if (error) {
    console.error('查询失败:', error);
    return;
  }
  
  console.log('总记录数:', data.length);
  
  const schools = [...new Set(data.map(d => d.school_name))];
  console.log('不同学校数:', schools.length);
  
  const byYear = {};
  const bySubject = {};
  data.forEach(d => {
    byYear[d.year] = (byYear[d.year] || 0) + 1;
    const req = d.subject_requirement || '无';
    bySubject[req] = (bySubject[req] || 0) + 1;
  });
  
  console.log('按年份分布:', byYear);
  console.log('选科要求分布（前10）:', Object.entries(bySubject).slice(0, 10));
  
  console.log('');
  console.log('=== 前10条记录 ===');
  data.slice(0, 10).forEach(d => {
    console.log(`${d.school_name} | ${d.year} | ${d.min_score} | ${d.subject_requirement}`);
  });
}

test().catch(console.error);
