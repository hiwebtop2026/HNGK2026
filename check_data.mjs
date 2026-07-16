import fs from 'fs';

const content = fs.readFileSync('./src/data/schoolData.ts', 'utf8');

const match = content.match(/export const SCHOOL_DATA = (\[[\s\S]*?\]);/);
if (match) {
  try {
    const data = JSON.parse(match[1]);
    const hainan = data.filter(s => s.province === '海南');
    console.log('海南学校总数:', hainan.length);
    
    const near696 = hainan.filter(s => {
      const score = s.score2025 ?? s.score2024 ?? s.score2023 ?? 0;
      return score >= 680 && score <= 720;
    });
    console.log('680-720分区间学校数:', near696.length);
    
    const above650 = hainan.filter(s => {
      const score = s.score2025 ?? s.score2024 ?? s.score2023 ?? 0;
      return score >= 650;
    });
    console.log('650分以上学校数:', above650.length);
    
    const allScores = hainan.map(s => s.score2025 ?? s.score2024 ?? s.score2023 ?? 0).filter(s => s > 0);
    console.log('最高分:', Math.max(...allScores));
    console.log('最低分:', Math.min(...allScores));
    console.log('平均分:', (allScores.reduce((a,b) => a+b, 0) / allScores.length).toFixed(1));
  } catch (e) {
    console.error('解析错误:', e.message);
  }
}
