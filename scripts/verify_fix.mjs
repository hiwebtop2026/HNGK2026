import { SCHOOL_DATA } from '../src/data/schoolData.ts';

console.log('=== 验证数据修复结果 ===\n');

console.log(`总记录数: ${SCHOOL_DATA.length}`);

// 检查所有记录的 province 是否都是 '海南'
const provinces = [...new Set(SCHOOL_DATA.map(d => d.province))];
console.log(`\nprovince 值分布:`);
provinces.forEach(p => {
  const count = SCHOOL_DATA.filter(d => d.province === p).length;
  console.log(`  ${p}: ${count} 次`);
});

// 检查 region 是否都是 '海南'
const regions = [...new Set(SCHOOL_DATA.map(d => d.region))];
console.log(`\nregion 值分布:`);
regions.forEach(r => {
  const count = SCHOOL_DATA.filter(d => d.region === r).length;
  console.log(`  ${r}: ${count} 次`);
});

// 检查是否有数据缺失
const schoolsWithNoScore = SCHOOL_DATA.filter(d => d.score2025 === null && d.score2024 === null && d.score2023 === null);
console.log(`\n无分数数据的学校: ${schoolsWithNoScore.length} 所`);

// 检查分数范围（海南是900分制）
const allScores = [
  ...SCHOOL_DATA.filter(d => d.score2025 !== null).map(d => d.score2025),
  ...SCHOOL_DATA.filter(d => d.score2024 !== null).map(d => d.score2024),
  ...SCHOOL_DATA.filter(d => d.score2023 !== null).map(d => d.score2023),
];

if (allScores.length > 0) {
  console.log(`\n分数统计（海南900分制）:`);
  console.log(`  最高分: ${Math.max(...allScores)}`);
  console.log(`  最低分: ${Math.min(...allScores)}`);
  console.log(`  平均分: ${Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)}`);
}

// 检查2025年数据
const has2025 = SCHOOL_DATA.filter(d => d.score2025 !== null).length;
const has2024 = SCHOOL_DATA.filter(d => d.score2024 !== null).length;
const has2023 = SCHOOL_DATA.filter(d => d.score2023 !== null).length;

console.log(`\n各年份数据分布:`);
console.log(`  2025年: ${has2025} 所学校有分数`);
console.log(`  2024年: ${has2024} 所学校有分数`);
console.log(`  2023年: ${has2023} 所学校有分数`);

// 检查学校层级分布
const levels = [...new Set(SCHOOL_DATA.map(d => d.level))];
console.log(`\n学校层级分布:`);
levels.forEach(l => {
  const count = SCHOOL_DATA.filter(d => d.level === l).length;
  console.log(`  ${l}: ${count} 所`);
});

// 检查subject字段
const subjects = [...new Set(SCHOOL_DATA.map(d => d.subject))];
console.log(`\n科目代码分布:`);
console.log(`  不同科目代码数: ${subjects.length}`);
console.log(`  主要代码: ${subjects.slice(0, 10).join(', ')}${subjects.length > 10 ? '...' : ''}`);

// 验证数据完整性
const validCount = SCHOOL_DATA.filter(d => 
  d.name && d.province === '海南' && d.region === '海南'
).length;

console.log(`\n=== 验证结果 ===`);
console.log(`  数据完整性: ${validCount}/${SCHOOL_DATA.length} 条记录有效`);
console.log(`  所有数据province均为海南: ${provinces.length === 1 && provinces[0] === '海南' ? '✅ 是' : '❌ 否'}`);
console.log(`  所有数据region均为海南: ${regions.length === 1 && regions[0] === '海南' ? '✅ 是' : '❌ 否'}`);

console.log('\n=== 验证完成 ===');