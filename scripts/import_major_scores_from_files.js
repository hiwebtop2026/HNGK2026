/**
 * 从 JSON 文件批量导入专业分数线数据到 Supabase
 *
 * 使用方法：
 *   node scripts/import_major_scores_from_files.js
 *
 * 环境变量：
 *   SUPABASE_SERVICE_ROLE_KEY - service_role key（推荐，可绕过 RLS）
 *
 * 如果没有 service_role key，会使用 publishable/anon key 尝试（需要 RLS 已禁用）
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Supabase 配置
const SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co';

// ⚠️ 安全说明：不要在代码中硬编码密钥
// 使用环境变量 SUPABASE_SERVICE_ROLE_KEY 传入 service_role / secret key
// PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY = "你的key"
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 未配置 service_role 时使用 anon key（仅读取，受 RLS 限制）
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o';

const API_KEY = SERVICE_ROLE_KEY || ANON_KEY;
const KEY_TYPE = SERVICE_ROLE_KEY ? 'service_role' : 'anon';

// JSON 文件所在目录
const DOWNLOADS_DIR = 'C:\\Users\\lhp\\Downloads';

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, API_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * 读取所有专业分数线 JSON 文件
 */
function readAllJsonFiles() {
  console.log('📖 读取 JSON 文件...');
  const files = readdirSync(DOWNLOADS_DIR)
    .filter(f => f.endsWith('.json') && f.includes('专业分数线') && !f.includes('汇总'));

  console.log(`   找到 ${files.length} 个 JSON 文件`);

  const allData = [];
  const schoolYearMap = new Map(); // 记录每所院校的年份

  for (const file of files) {
    try {
      const filePath = join(DOWNLOADS_DIR, file);
      const content = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        console.log(`   ⚠️ ${file} 不是数组，跳过`);
        continue;
      }

      // 从文件名提取院校名和年份（备用）
      const match = file.match(/^(.+?)_(\d{4})_专业分数线/);
      const fileSchool = match ? match[1] : '';
      const fileYear = match ? parseInt(match[2]) : null;

      for (const item of data) {
        // 确保必要字段存在
        if (!item.school_name || !item.major_name) {
          continue;
        }

        // 使用文件名的年份作为备用（确保年份正确）
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
          province: item.province || '海南',
        };

        allData.push(record);

        // 记录院校+年份
        const key = `${record.school_name}|${year}`;
        if (!schoolYearMap.has(key)) {
          schoolYearMap.set(key, 0);
        }
        schoolYearMap.set(key, schoolYearMap.get(key) + 1);
      }
    } catch (e) {
      console.log(`   ❌ 读取 ${file} 失败: ${e.message}`);
    }
  }

  console.log(`   共读取 ${allData.length} 条记录`);
  console.log(`   涉及 ${schoolYearMap.size} 个院校-年份组合`);

  return { allData, schoolYearMap };
}

/**
 * 获取所有涉及的院校名称
 */
function getSchoolNames(schoolYearMap) {
  const schools = new Set();
  for (const key of schoolYearMap.keys()) {
    const school = key.split('|')[0];
    schools.add(school);
  }
  return Array.from(schools);
}

/**
 * 删除这些院校的旧数据（避免重复）
 */
async function deleteOldRecords(schoolNames) {
  console.log('\n🗑️  删除旧数据...');
  let totalDeleted = 0;

  // 逐个院校删除（避免一次删除太多）
  for (const school of schoolNames) {
    try {
      const { data, error } = await supabase
        .from('major_scores')
        .delete()
        .ilike('school_name', school);

      if (error) {
        console.log(`   ⚠️ 删除 ${school} 失败: ${error.message}`);
        continue;
      }

      // supabase delete 返回的被删除记录数不总是可用
      totalDeleted++;
    } catch (e) {
      console.log(`   ⚠️ 删除 ${school} 异常: ${e.message}`);
    }
  }

  console.log(`   ✅ 已处理 ${totalDeleted} 所院校的旧数据删除`);
}

/**
 * 批量插入数据
 */
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

      // 每10批输出一次进度
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

/**
 * 验证导入结果
 */
async function verifyImport(schoolNames) {
  console.log('\n🔍 验证导入结果...');
  let verifiedCount = 0;

  for (const school of schoolNames.slice(0, 5)) { // 只验证前5所
    try {
      const { data, error } = await supabase
        .from('major_scores')
        .select('year, major_name, min_score')
        .ilike('school_name', school)
        .order('year', { ascending: false })
        .order('min_score', { ascending: false })
        .limit(5);

      if (error) {
        console.log(`   ⚠️ 验证 ${school} 失败: ${error.message}`);
        continue;
      }

      console.log(`   ${school}: ${data?.length || 0} 条记录（最多显示5条）`);
      if (data && data.length > 0) {
        for (const item of data) {
          console.log(`     ${item.year} | ${item.major_name} | ${item.min_score}分`);
        }
      }
      verifiedCount++;
    } catch (e) {
      console.log(`   ⚠️ 验证 ${school} 异常: ${e.message}`);
    }
  }

  console.log(`\n   验证完成（已检查 ${verifiedCount} 所院校）`);
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  专业分数线数据导入工具');
  console.log('========================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`API Key 类型: ${KEY_TYPE}`);
  console.log(`JSON 文件目录: ${DOWNLOADS_DIR}`);

  if (KEY_TYPE !== 'service_role') {
    console.log('\n⚠️  警告: 未使用 service_role key');
    console.log('   如果导入失败（RLS 错误），请设置环境变量 SUPABASE_SERVICE_ROLE_KEY');
    console.log('   或在 Supabase SQL Editor 执行:');
    console.log('   ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;');
  }

  console.log('');

  // 1. 读取所有 JSON 文件
  const { allData, schoolYearMap } = readAllJsonFiles();

  if (allData.length === 0) {
    console.log('\n❌ 没有数据可导入，退出');
    return;
  }

  // 2. 获取所有院校名称
  const schoolNames = getSchoolNames(schoolYearMap);
  console.log(`\n🏛️  涉及 ${schoolNames.length} 所院校:`);
  for (const school of schoolNames) {
    const years = Array.from(schoolYearMap.keys())
      .filter(k => k.startsWith(school + '|'))
      .map(k => parseInt(k.split('|')[1]))
      .sort();
    console.log(`   - ${school}: ${years.join(', ')}`);
  }

  // 3. 删除旧数据
  await deleteOldRecords(schoolNames);

  // 4. 插入新数据
  const { successCount, failCount } = await insertData(allData);

  // 5. 验证导入结果
  if (successCount > 0) {
    await verifyImport(schoolNames);
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
