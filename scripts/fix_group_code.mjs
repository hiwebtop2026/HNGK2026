import fs from 'fs';
import path from 'path';

const filePath = path.join('src', 'data', 'schoolData.ts');
const content = fs.readFileSync(filePath, 'utf-8');

console.log(`原始文件行数: ${content.split('\n').length}`);

// 统计现有 code 格式
const codeMatches = content.match(/code:\s*'([^']+)'/g);
const codeValues = [...new Set((codeMatches || []).map(m => m.match(/'([^']+)'/)[1]))];
console.log(`\n现有不同 code 数量: ${codeValues.length}`);
console.log(`前20个 code: ${codeValues.slice(0, 20).join(', ')}`);

// 检查是否已经有 HL 前缀
const hasHLPrefix = codeValues.some(c => c.startsWith('HL'));
const hasTJPrefix = codeValues.some(c => c.startsWith('TJ'));
console.log(`\n已有 HL 前缀: ${hasHLPrefix}`);
console.log(`已有 TJ 前缀: ${hasTJPrefix}`);

// 修改逻辑：将所有 code 改为带省份前缀的格式
// 海南数据: code: '303' -> code: 'HL303'

let fixedContent = content;
let fixCount = 0;

// 使用正则表达式匹配 code 字段并添加 HL 前缀
// 匹配 pattern: code: 'xxx' 其中 xxx 不以 HL 或 TJ 开头
fixedContent = content.replace(/code:\s*'([^']+)'/g, (match, code) => {
  // 如果已经有 HL 或 TJ 前缀，跳过
  if (code.startsWith('HL') || code.startsWith('TJ')) {
    return match;
  }
  
  // 添加 HL 前缀（海南数据）
  fixCount++;
  return `code: 'HL${code}'`;
});

console.log(`\n修复完成，共修改 ${fixCount} 处 code 字段`);

// 验证修复结果
const fixedCodeMatches = fixedContent.match(/code:\s*'([^']+)'/g);
const fixedCodeValues = [...new Set((fixedCodeMatches || []).map(m => m.match(/'([^']+)'/)[1]))];

console.log(`\n修复后不同 code 数量: ${fixedCodeValues.length}`);
console.log(`前20个 code: ${fixedCodeValues.slice(0, 20).join(', ')}`);

// 检查是否都有 HL 前缀
const allHavePrefix = fixedCodeValues.every(c => c.startsWith('HL') || c.startsWith('TJ'));
console.log(`\n所有 code 都有前缀: ${allHavePrefix ? '✅ 是' : '❌ 否'}`);

// 写入修复后的文件
fs.writeFileSync(filePath, fixedContent, 'utf-8');
console.log(`\n文件已写入: ${filePath}`);

// 更新导入脚本
const importScriptPath = path.join('scripts', 'import_hainan_data.py');
if (fs.existsSync(importScriptPath)) {
  let importScriptContent = fs.readFileSync(importScriptPath, 'utf-8');
  
  // 确保导入脚本也使用正确的 group_code
  // 将 group_code = str(school.get('code', '')) 改为保持原样（因为 code 已经有前缀了）
  console.log(`\n检查导入脚本: ${importScriptPath}`);
  
  const hasCorrectAssignment = importScriptContent.includes("group_code = str(school.get('code', ''))");
  console.log(`  导入脚本中 group_code 获取方式正确: ${hasCorrectAssignment ? '✅ 是' : '❌ 需要检查'}`);
  
  if (!hasCorrectAssignment) {
    // 如果不是直接使用 code，需要修改
    console.log(`  导入脚本可能需要更新`);
  }
}

// 更新天津导入脚本
const tianjinScriptPath = path.join('scripts', 'reimport_tianjin_full.py');
if (fs.existsSync(tianjinScriptPath)) {
  let tianjinScriptContent = fs.readFileSync(tianjinScriptPath, 'utf-8');
  
  // 检查是否使用 TJ 前缀
  const hasTJPattern = tianjinScriptContent.includes("f'TJ{group_counter:04d}'");
  console.log(`\n天津导入脚本: ${tianjinScriptPath}`);
  console.log(`  使用 TJ 前缀: ${hasTJPattern ? '✅ 是' : '❌ 需要检查'}`);
}

console.log('\n=== 修复完成 ===');