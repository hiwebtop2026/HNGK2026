import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dirs = ['data/hainan_scores', 'data/tianjin_scores'];
let totalFiles = 0;
let totalRecords = 0;
let hasLevelCount = 0;
let hasNatureCount = 0;
let sampleFiles = [];

for (const dir of dirs) {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    totalFiles++;
    const content = readFileSync(join(dir, file), 'utf-8');
    const data = JSON.parse(content);
    
    for (const item of data) {
      totalRecords++;
      if (item.level) hasLevelCount++;
      if (item.nature) hasNatureCount++;
    }
    
    if (sampleFiles.length < 5) {
      sampleFiles.push({ file, hasLevel: data.some(i => i.level), hasNature: data.some(i => i.nature) });
    }
  }
}

console.log('数据文件检查结果:');
console.log('总文件数:', totalFiles);
console.log('总记录数:', totalRecords);
console.log('包含 level 字段的记录数:', hasLevelCount);
console.log('包含 nature 字段的记录数:', hasNatureCount);
console.log('level 覆盖率:', ((hasLevelCount / totalRecords) * 100).toFixed(2) + '%');
console.log('nature 覆盖率:', ((hasNatureCount / totalRecords) * 100).toFixed(2) + '%');
console.log('');
console.log('示例文件:');
for (const s of sampleFiles) {
  console.log('  ' + s.file + ': level=' + s.hasLevel + ', nature=' + s.hasNature);
}