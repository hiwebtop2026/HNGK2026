import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('=== 验证天津数据 ===');
  
  console.log('');
  console.log('--- 1. 检查 major_scores 表 ---');
  const { data: majorData, error: majorError } = await supabase
    .from('major_scores')
    .select('school_name, province, year, min_score')
    .eq('province', '天津');
  
  if (majorError) {
    console.error('major_scores 查询失败:', majorError);
  } else {
    console.log('major_scores 天津记录数:', majorData?.length || 0);
    const schools = [...new Set((majorData || []).map(d => d.school_name))];
    console.log('major_scores 天津学校数:', schools.length);
    
    const byYear = {};
    (majorData || []).forEach(d => {
      byYear[d.year] = (byYear[d.year] || 0) + 1;
    });
    console.log('按年份分布:', byYear);
  }
  
  console.log('');
  console.log('--- 2. 检查 admission_scores 表 ---');
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
  console.log('--- 3. 检查合并后学校数 ---');
  if (majorData && admissionData) {
    const allSchools = new Set([
      ...(majorData || []).map(d => d.school_name),
      ...(admissionData || []).map(d => d.school_name)
    ]);
    console.log('合并后总学校数:', allSchools.size);
  }
  
  console.log('');
  console.log('--- 4. 检查前20所学校 ---');
  if (majorData && majorData.length > 0) {
    const uniqueSchools = [...new Set((majorData || []).map(d => d.school_name))];
    uniqueSchools.slice(0, 20).forEach((name, i) => {
      const schoolData = (majorData || []).filter(d => d.school_name === name);
      const minScore2025 = schoolData.filter(d => d.year === 2025).map(d => d.min_score).sort()[0];
      const minScore2024 = schoolData.filter(d => d.year === 2024).map(d => d.min_score).sort()[0];
      const minScore2023 = schoolData.filter(d => d.year === 2023).map(d => d.min_score).sort()[0];
      console.log(`${i+1}. ${name} | 2025:${minScore2025} | 2024:${minScore2024} | 2023:${minScore2023}`);
    });
  }
}

test().catch(console.error);
