import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIRS = [
  { path: path.join('data', 'hainan_scores'), province: '海南', maxScore: 900 },
  { path: path.join('data', 'tianjin_scores'), province: '天津', maxScore: 750 },
];

function readAllData(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json') && f.includes('专业分数线'));
  const allData = {};
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const match = file.match(/^(.+?)_(\d{4})_专业分数线/);
      if (match) {
        const school = match[1];
        const year = parseInt(match[2]);
        if (!allData[school]) allData[school] = {};
        allData[school][year] = data;
      }
    } catch (e) {
      console.log(`  ⚠ 读取 ${file} 失败: ${e.message}`);
    }
  }
  
  return allData;
}

function checkDuplicateYears(data, province) {
  console.log(`\n=== ${province} - 检查年份数据重复 ===`);
  let duplicateCount = 0;
  const duplicates = [];
  
  for (const [school, years] of Object.entries(data)) {
    const yearList = Object.keys(years).sort();
    
    for (let i = 0; i < yearList.length; i++) {
      for (let j = i + 1; j < yearList.length; j++) {
        const year1 = parseInt(yearList[i]);
        const year2 = parseInt(yearList[j]);
        const data1 = JSON.stringify(years[year1]);
        const data2 = JSON.stringify(years[year2]);
        
        if (data1 === data2 && years[year1].length > 0) {
          duplicateCount++;
          duplicates.push({ school, year1, year2, count: years[year1].length });
        }
      }
    }
  }
  
  if (duplicateCount > 0) {
    console.log(`  ❌ 发现 ${duplicateCount} 组重复数据:`);
    for (const d of duplicates.slice(0, 20)) {
      console.log(`    ${d.school}: ${d.year1}年与${d.year2}年数据完全相同 (${d.count}条)`);
    }
    if (duplicates.length > 20) {
      console.log(`    ... 还有 ${duplicates.length - 20} 组重复数据`);
    }
  } else {
    console.log(`  ✅ 未发现年份数据重复`);
  }
  
  return duplicates;
}

function checkScoreRange(data, province, maxScore) {
  console.log(`\n=== ${province} - 检查分数范围 ===`);
  let invalidCount = 0;
  const invalidRecords = [];
  
  for (const [school, years] of Object.entries(data)) {
    for (const [year, records] of Object.entries(years)) {
      for (const record of records) {
        if (record.min_score !== null && record.min_score !== undefined) {
          if (record.min_score < 100 || record.min_score > maxScore) {
            invalidCount++;
            invalidRecords.push({
              school,
              year: parseInt(year),
              major: record.major_name,
              score: record.min_score,
              province: record.province
            });
          }
        }
      }
    }
  }
  
  if (invalidCount > 0) {
    console.log(`  ❌ 发现 ${invalidCount} 条分数范围异常的数据:`);
    for (const r of invalidRecords.slice(0, 20)) {
      console.log(`    ${r.school}(${r.year}): ${r.major} - ${r.score}分 (省份: ${r.province})`);
    }
    if (invalidRecords.length > 20) {
      console.log(`    ... 还有 ${invalidRecords.length - 20} 条异常数据`);
    }
  } else {
    console.log(`  ✅ 所有分数都在合理范围内 (0-${maxScore})`);
  }
  
  return invalidRecords;
}

function checkProvinceConsistency(data, expectedProvince) {
  console.log(`\n=== ${expectedProvince} - 检查省份字段一致性 ===`);
  let mismatchCount = 0;
  const mismatches = [];
  
  for (const [school, years] of Object.entries(data)) {
    for (const [year, records] of Object.entries(years)) {
      for (const record of records) {
        if (record.province && record.province !== expectedProvince) {
          mismatchCount++;
          mismatches.push({
            school,
            year: parseInt(year),
            major: record.major_name,
            expected: expectedProvince,
            actual: record.province
          });
        }
      }
    }
  }
  
  if (mismatchCount > 0) {
    console.log(`  ❌ 发现 ${mismatchCount} 条省份字段不一致的数据:`);
    for (const m of mismatches.slice(0, 20)) {
      console.log(`    ${m.school}(${m.year}): ${m.major} - 期望:${m.expected}, 实际:${m.actual}`);
    }
    if (mismatches.length > 20) {
      console.log(`    ... 还有 ${mismatches.length - 20} 条不一致数据`);
    }
  } else {
    console.log(`  ✅ 所有数据省份字段一致`);
  }
  
  return mismatches;
}

function checkEmptyRecords(data, province) {
  console.log(`\n=== ${province} - 检查空数据文件 ===`);
  let emptyCount = 0;
  const emptyFiles = [];
  
  for (const [school, years] of Object.entries(data)) {
    for (const [year, records] of Object.entries(years)) {
      if (!records || records.length === 0) {
        emptyCount++;
        emptyFiles.push({ school, year: parseInt(year) });
      }
    }
  }
  
  if (emptyCount > 0) {
    console.log(`  ⚠ 发现 ${emptyCount} 个空数据文件:`);
    for (const e of emptyFiles.slice(0, 10)) {
      console.log(`    ${e.school}_${e.year}_专业分数线.json`);
    }
    if (emptyFiles.length > 10) {
      console.log(`    ... 还有 ${emptyFiles.length - 10} 个空文件`);
    }
  } else {
    console.log(`  ✅ 未发现空数据文件`);
  }
  
  return emptyFiles;
}

function deleteDuplicateFiles(duplicates, basePath) {
  console.log(`\n=== 删除重复数据文件 ===`);
  let deleted = 0;
  
  for (const d of duplicates) {
    const filePath = path.join(__dirname, '..', basePath, `${d.school}_${d.year1}_专业分数线.json`);
    try {
      fs.unlinkSync(filePath);
      deleted++;
      console.log(`  ✅ 删除: ${d.school}_${d.year1}_专业分数线.json`);
    } catch (e) {
      console.log(`  ❌ 删除失败: ${filePath}`);
    }
  }
  
  console.log(`  共删除 ${deleted} 个文件`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('📊 高考专业分数线数据验证工具');
  console.log('='.repeat(70));
  
  let allDuplicates = [];
  
  for (const dirConfig of DATA_DIRS) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📍 验证 ${dirConfig.province} 数据`);
    console.log(`${'='.repeat(70)}`);
    
    const dirPath = path.join(__dirname, '..', dirConfig.path);
    console.log(`  数据目录: ${dirPath}`);
    
    if (!fs.existsSync(dirPath)) {
      console.log(`  ❌ 目录不存在`);
      continue;
    }
    
    const data = readAllData(dirPath);
    console.log(`  院校数: ${Object.keys(data).length}`);
    
    const duplicates = checkDuplicateYears(data, dirConfig.province);
    checkScoreRange(data, dirConfig.province, dirConfig.maxScore);
    checkProvinceConsistency(data, dirConfig.province);
    checkEmptyRecords(data, dirConfig.province);
    
    allDuplicates = allDuplicates.concat(duplicates.map(d => ({ ...d, path: dirConfig.path })));
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('📋 验证报告');
  console.log(`${'='.repeat(70)}`);
  console.log(`总重复数据组数: ${allDuplicates.length}`);
  
  if (allDuplicates.length > 0) {
    console.log(`\n建议：删除重复的旧年份数据文件，重新采集`);
    console.log(`是否删除? (手动删除以下文件):`);
    for (const d of allDuplicates) {
      console.log(`  data/${d.path}/${d.school}_${d.year1}_专业分数线.json`);
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('验证完成！');
  console.log(`${'='.repeat(70)}`);
}

main().catch(console.error);
