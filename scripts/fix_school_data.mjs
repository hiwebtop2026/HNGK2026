import fs from 'fs';
import path from 'path';

const filePath = path.join('src', 'data', 'schoolData.ts');
const content = fs.readFileSync(filePath, 'utf-8');

console.log(`原始文件行数: ${content.split('\n').length}`);

// 找出所有不同的 province 值
const provinceMatches = content.match(/province:\s*'([^']+)'/g);
const provinceValues = [...new Set((provinceMatches || []).map(m => m.match(/'([^']+)'/)[1]))];
console.log(`\n修复前 province 值分布:`);
provinceValues.forEach(v => {
  const count = (content.match(new RegExp(`province:\\s*'${v}'`, 'g')) || []).length;
  console.log(`  ${v}: ${count} 次`);
});

// 找出所有不同的 region 值
const regionMatches = content.match(/region:\s*'([^']+)'/g);
const regionValues = [...new Set((regionMatches || []).map(m => m.match(/'([^']+)'/)[1]))];
console.log(`\nregion 值分布:`);
regionValues.forEach(v => {
  const count = (content.match(new RegExp(`region:\\s*'${v}'`, 'g')) || []).length;
  console.log(`  ${v}: ${count} 次`);
});

// 修复逻辑：将 province 字段改为与 region 字段一致
// 对于海南数据，region 是 '海南'，所以 province 也应该是 '海南'

let fixedContent = content;

// 统计修复次数
let fixCount = 0;

// 遍历每一行，找到 region 为 '海南' 的记录，并将其 province 改为 '海南'
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // 检查这一行是否在 region: '海南' 的记录中
  // 需要看上下文，找到整个对象定义
  if (line.includes("region: '海南'")) {
    // 在这个对象中找到 province 字段并修改
    // 找到这个对象的开始和结束
    let objStart = i;
    let braceCount = 0;
    
    // 向前找到对象开始
    for (let j = i; j >= 0; j--) {
      if (lines[j].includes('{')) {
        objStart = j;
        break;
      }
    }
    
    // 在对象范围内找到 province 字段并修改
    for (let j = objStart; j <= Math.min(objStart + 15, lines.length - 1); j++) {
      const provinceMatch = lines[j].match(/province:\s*'([^']+)'/);
      if (provinceMatch) {
        const oldProvince = provinceMatch[1];
        if (oldProvince !== '海南') {
          lines[j] = lines[j].replace(/province:\s*'[^']+'/, "province: '海南'");
          fixCount++;
          console.log(`  修复第 ${j + 1} 行: province 从 '${oldProvince}' 改为 '海南'`);
        }
        break;
      }
    }
  }
}

fixedContent = lines.join('\n');

console.log(`\n修复完成，共修复 ${fixCount} 处 province 字段`);

// 验证修复结果
const fixedProvinceMatches = fixedContent.match(/province:\s*'([^']+)'/g);
const fixedProvinceValues = [...new Set((fixedProvinceMatches || []).map(m => m.match(/'([^']+)'/)[1]))];
console.log(`\n修复后 province 值分布:`);
fixedProvinceValues.forEach(v => {
  const count = (fixedContent.match(new RegExp(`province:\\s*'${v}'`, 'g')) || []).length;
  console.log(`  ${v}: ${count} 次`);
});

// 写入修复后的文件
fs.writeFileSync(filePath, fixedContent, 'utf-8');
console.log(`\n文件已写入: ${filePath}`);