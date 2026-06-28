import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import fs from 'fs';

const SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SCHOOLS = [
  '清华大学',
  '北京大学',
  '复旦大学',
  '上海交通大学',
  '浙江大学',
  '中国人民大学',
  '南京大学',
  '武汉大学',
  '西安交通大学',
  '华中科技大学',
];

async function fetchMajorScores(schoolName) {
  console.log(`正在抓取: ${schoolName}`);
  
  try {
    const response = await axios.get('https://blm-api.quark.cn/blm/pc-gaokao/api/schoolMajorScore/getSchoolMajorScore', {
      params: {
        school_name: schoolName,
        year: '2025',
        province: '',
        batch: '',
        major_name: '',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://vt.quark.cn/blm/pc-gaokao-1089/index',
      },
    });
    
    const data = response.data;
    
    if (!data || !data.data || !Array.isArray(data.data.list)) {
      console.log(`  未找到数据: ${schoolName}`);
      return [];
    }
    
    const records = data.data.list.map(item => ({
      school_name: schoolName,
      school_code: item.school_code || '',
      province: item.province_name || '',
      level: item.school_type || '',
      major_name: item.major_name || '',
      major_group: item.major_group_name || '',
      subject_requirement: item.subject_requirement || '',
      year: parseInt(item.year) || 2025,
      min_score: item.min_score ? parseInt(item.min_score) : null,
      min_rank: item.min_rank ? parseInt(item.min_rank) : null,
      avg_score: item.avg_score ? parseInt(item.avg_score) : null,
      batch: item.batch_name || '',
      source: '夸克高考',
    }));
    
    console.log(`  获取到 ${records.length} 条专业数据`);
    return records;
    
  } catch (error) {
    console.error(`  抓取失败: ${schoolName}`, error.message);
    return [];
  }
}

async function saveToSupabase(records) {
  if (records.length === 0) return;
  
  try {
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from('major_scores').insert(batch);
      
      if (error) {
        console.error('插入失败:', error.message);
        return;
      }
      
      console.log(`  成功插入 ${batch.length} 条记录`);
    }
    
    console.log(`  共插入 ${records.length} 条记录`);
    
  } catch (error) {
    console.error('保存失败:', error.message);
  }
}

async function main() {
  console.log('开始抓取院校专业录取分数线...\n');
  
  let allRecords = [];
  
  for (const school of SCHOOLS) {
    const records = await fetchMajorScores(school);
    allRecords = [...allRecords, ...records];
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n共抓取到 ${allRecords.length} 条数据`);
  
  fs.writeFileSync('major_scores_backup.json', JSON.stringify(allRecords, null, 2));
  console.log('已备份到 major_scores_backup.json');
  
  await saveToSupabase(allRecords);
  
  console.log('\n抓取完成！');
}

main().catch(console.error);