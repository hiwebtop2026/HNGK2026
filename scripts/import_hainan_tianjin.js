import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

const API_KEY = SERVICE_ROLE_KEY || ANON_KEY;
const KEY_TYPE = SERVICE_ROLE_KEY ? 'service_role' : 'anon';

const DATA_DIRS = [
  { path: join('data', 'hainan_scores'), province: '海南' },
  { path: join('data', 'tianjin_scores'), province: '天津' },
];

const supabase = createClient(SUPABASE_URL, API_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function readAllJsonFiles() {
  console.log('📖 读取海南和天津数据文件...');
  const allData = [];
  const schoolYearMap = new Map();

  for (const dirConfig of DATA_DIRS) {
    const dirPath = join(__dirname, '..', dirConfig.path);
    console.log(`   扫描目录: ${dirPath}`);

    let files;
    try {
      files = readdirSync(dirPath).filter(f => f.endsWith('.json') && f.includes('专业分数线'));
    } catch (e) {
      console.log(`   ⚠️ 目录不存在或无法读取: ${e.message}`);
      continue;
    }

    console.log(`   找到 ${files.length} 个文件`);

    for (const file of files) {
      try {
        const filePath = join(dirPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (!Array.isArray(data)) {
          console.log(`   ⚠️ ${file} 不是数组，跳过`);
          continue;
        }

        const match = file.match(/^(.+?)_(\d{4})_专业分数线/);
        const fileSchool = match ? match[1] : '';
        const fileYear = match ? parseInt(match[2]) : null;

        for (const item of data) {
          if (!item.school_name || !item.major_name) {
            continue;
          }

          const year = item.year || fileYear;

          const record = {
            school_name: item.school_name || fileSchool,
            year: year,
            major_name: item.major_name,
            major_group: item.major_group || null,
            min_score: item.min_score || null,
            min_rank: item.min_rank || null,
            person_count: item.person_count || null,
            batch: item.batch || '本科批',
            major_description: item.major_description || null,
            subject_requirement: item.subject_requirement || null,
            province: item.province || dirConfig.province,
          };

          allData.push(record);

          const key = `${record.school_name}|${record.province}|${year}`;
          if (!schoolYearMap.has(key)) {
            schoolYearMap.set(key, 0);
          }
          schoolYearMap.set(key, schoolYearMap.get(key) + 1);
        }
      } catch (e) {
        console.log(`   ❌ 读取 ${file} 失败: ${e.message}`);
      }
    }
  }

  console.log(`   共读取 ${allData.length} 条记录`);
  console.log(`   涉及 ${schoolYearMap.size} 个院校-省份-年份组合`);

  return { allData, schoolYearMap };
}

function getSchoolNames(schoolYearMap) {
  const schools = new Set();
  for (const key of schoolYearMap.keys()) {
    const school = key.split('|')[0];
    schools.add(school);
  }
  return Array.from(schools);
}

async function deleteOldRecords() {
  console.log('\n🗑️  删除海南和天津的旧数据...');

  const { data: hainanData, error: hainanError } = await supabase
    .from('major_scores')
    .delete()
    .eq('province', '海南');

  if (hainanError) {
    console.log(`   ⚠️ 删除海南数据失败: ${hainanError.message}`);
  } else {
    console.log(`   ✅ 已删除海南旧数据`);
  }

  const { data: tianjinData, error: tianjinError } = await supabase
    .from('major_scores')
    .delete()
    .eq('province', '天津');

  if (tianjinError) {
    console.log(`   ⚠️ 删除天津数据失败: ${tianjinError.message}`);
  } else {
    console.log(`   ✅ 已删除天津旧数据`);
  }
}

async function insertData(allData) {
  console.log('\n📥 插入新数据...');
  const batchSize = 100;
  let successCount = 0;
  let failCount = 0;
  let failErrors = new Set();

  for (let i = 0; i < allData.length; i += batchSize) {
    const batch = allData.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allData.length / batchSize);

    try {
      const { data, error } = await supabase
        .from('major_scores')
        .insert(batch);

      if (error) {
        console.log(`   ❌ 批次 ${batchNum}/${totalBatches} 失败: ${error.message}`);
        failCount += batch.length;
        failErrors.add(error.message);
        continue;
      }

      successCount += batch.length;

      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        console.log(`   进度: ${batchNum}/${totalBatches} 批次, 成功 ${successCount} 条`);
      }
    } catch (e) {
      console.log(`   ❌ 批次 ${batchNum}/${totalBatches} 异常: ${e.message}`);
      failCount += batch.length;
      failErrors.add(e.message);
    }
  }

  console.log(`\n📊 导入结果:`);
  console.log(`   ✅ 成功: ${successCount} 条`);
  console.log(`   ❌ 失败: ${failCount} 条`);

  if (failErrors.size > 0) {
    console.log(`   失败原因:`);
    for (const err of failErrors) {
      console.log(`     - ${err}`);
    }
  }

  return { successCount, failCount };
}

async function verifyImport() {
  console.log('\n🔍 验证导入结果...');

  const provinces = ['海南', '天津'];
  for (const province of provinces) {
    const { data: totalData, error: totalError } = await supabase
      .from('major_scores')
      .select('id')
      .eq('province', province);

    if (totalError) {
      console.log(`   ⚠️ 验证 ${province} 失败: ${totalError.message}`);
      continue;
    }

    const { data: sampleData, error: sampleError } = await supabase
      .from('major_scores')
      .select('school_name, year, major_name, min_score')
      .eq('province', province)
      .order('min_score', { ascending: false })
      .limit(5);

    console.log(`\n   ${province}: ${totalData?.length || 0} 条记录（示例）:`);
    if (sampleData && sampleData.length > 0) {
      for (const item of sampleData) {
        console.log(`     ${item.school_name} (${item.year}): ${item.major_name} - ${item.min_score}分`);
      }
    }
  }

  console.log(`\n   验证完成`);
}

async function main() {
  console.log('========================================');
  console.log('  海南、天津专业分数线数据导入工具');
  console.log('========================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`API Key 类型: ${KEY_TYPE}`);
  console.log(`数据目录: ${DATA_DIRS.map(d => d.path).join(', ')}`);

  if (KEY_TYPE !== 'service_role') {
    console.log('\n⚠️  警告: 未使用 service_role key');
    console.log('   如果导入失败（RLS 错误），请设置环境变量 SUPABASE_SERVICE_ROLE_KEY');
    console.log('   或在 Supabase SQL Editor 执行:');
    console.log('   ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;');
  }

  console.log('');

  const { allData, schoolYearMap } = readAllJsonFiles();

  if (allData.length === 0) {
    console.log('\n❌ 没有数据可导入，退出');
    return;
  }

  const schoolNames = getSchoolNames(schoolYearMap);
  console.log(`\n🏛️  涉及 ${schoolNames.length} 所院校`);

  console.log('\n📊 省份统计:');
  const provinceStats = {};
  allData.forEach(item => {
    provinceStats[item.province] = (provinceStats[item.province] || 0) + 1;
  });
  for (const [province, count] of Object.entries(provinceStats)) {
    console.log(`   - ${province}: ${count} 条记录`);
  }

  await deleteOldRecords();

  const { successCount, failCount } = await insertData(allData);

  if (successCount > 0) {
    await verifyImport();
  }

  console.log('\n========================================');
  console.log('  导入完成！');
  console.log('========================================');

  if (failCount > 0 && KEY_TYPE !== 'service_role') {
    console.log('\n💡 如果导入失败，请尝试以下方法之一:');
    console.log('   1. 设置环境变量: $env:SUPABASE_SERVICE_ROLE_KEY="你的service_role_key"');
    console.log('   2. 在 Supabase SQL Editor 禁用 RLS:');
    console.log('      ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;');
  }
}

main().catch(console.error);