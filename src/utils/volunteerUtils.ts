import * as XLSX from 'xlsx';
import { getRefScore, getTier, getRecommendationReason, matchMajorCategories } from './dataUtils';
import type { SchoolScore, MajorRecommendation } from './dataUtils';
import { generateMajorRecommendations, formatMajorSuggestion } from './majorRecommender';

export type { SchoolScore, MajorRecommendation };

export interface VolunteerResult {
  index: number;
  tier: '冲' | '稳' | '保';
  code: string;
  name: string;
  subject: number;
  province: string;
  level: string;
  score2025: number | null;
  score2024: number | null;
  score2023: number | null;
  refScore: number;
  majorSuggestion: string;
  majorRecommendations: MajorRecommendation[];
  reason: string;
  admissionProbability: number;
  scoreTrend: 'up' | 'down' | 'stable';
}

// 从Excel文件读取数据（浏览器环境）
export async function loadSchoolDataFromExcel(file: File): Promise<SchoolScore[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  
  const result: SchoolScore[] = [];
  
  // 读取各年份数据
  const sheets = ['2025', '2024', '2023'];
  
  for (const sheetName of sheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    
    const year = parseInt(sheetName);
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // 找到表头行（包含"院校专业组代码"）
    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as string[];
      if (row && row.some(cell => String(cell).includes('院校专业组代码'))) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) continue;
    
    // 解析数据行
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as (string | number)[];
      if (!row || row.length < 4) continue;
      
      const code = String(row[0] || '');
      const name = String(row[1] || '');
      const subject = parseInt(String(row[2] || '0'));
      const score = parseFloat(String(row[3] || '0'));
      
      if (!code || !name || score === 0) continue;
      
      // 查找或创建记录
      const existing = result.find(s => s.code === code);
      if (existing) {
        if (year === 2025) existing.score2025 = score;
        else if (year === 2024) existing.score2024 = score;
        else if (year === 2023) existing.score2023 = score;
      } else {
        result.push({
          code,
          name,
          subject,
          province: '其他',
          level: '普通本科',
          nature: '公办',
          score2025: year === 2025 ? score : null,
          score2024: year === 2024 ? score : null,
          score2023: year === 2023 ? score : null,
        });
      }
    }
  }
  
  return result;
}

// 计算专业组录取概率
export function calculateAdmissionProbability(refScore: number, baseScore: number): number {
  const diff = baseScore - refScore;
  
  if (diff >= 30) return 99;
  if (diff >= 25) return 97;
  if (diff >= 20) return 94;
  if (diff >= 15) return 88;
  if (diff >= 10) return 78;
  if (diff >= 5) return 65;
  if (diff >= 0) return 50;
  if (diff >= -5) return 38;
  if (diff >= -10) return 28;
  if (diff >= -15) return 18;
  if (diff >= -20) return 12;
  if (diff >= -25) return 8;
  if (diff >= -30) return 5;
  return 2;
}

// 计算分数趋势
export function calculateScoreTrend(
  score2025: number | null,
  score2024: number | null,
  score2023: number | null
): 'up' | 'down' | 'stable' {
  const scores = [score2025, score2024, score2023].filter((s): s is number => s !== null);
  if (scores.length < 2) return 'stable';
  
  const recent = scores.slice(0, Math.min(2, scores.length));
  const older = scores.slice(Math.max(0, scores.length - 2), scores.length);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  const diff = recentAvg - olderAvg;
  
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'stable';
}

// 筛选院校
export function filterSchools(
  schools: SchoolScore[],
  baseScore: number,
  scoreRange: number,
  subject: number,
  totalVolunteers: number = 30,
  selectedLevels: string[] = [],
  selectedProvinces: string[] = [],
  selectedMajorCategories: string[] = [],
  selectedNatures: string[] = [],
  customChongCount?: number,
  customWenCount?: number,
  customBaoCount?: number,
  customChongScoreDiff?: number,
  customWenScoreDiff?: number,
  customBaoScoreDiff?: number
): VolunteerResult[] {
  // 按科目筛选
  let filtered = schools.filter(s => s.subject === subject);
  
  // 按院校层次筛选
  if (selectedLevels.length > 0) {
    filtered = filtered.filter(s => selectedLevels.includes(s.level));
  }
  
  // 按院校性质筛选
  if (selectedNatures.length > 0) {
    filtered = filtered.filter(s => selectedNatures.includes(s.nature));
  }
  
  // 按省份筛选
  if (selectedProvinces.length > 0) {
    filtered = filtered.filter(s => selectedProvinces.includes(s.province));
  }
  
  // 按专业类别筛选
  if (selectedMajorCategories.length > 0) {
    filtered = filtered.filter(s => {
      const categories = matchMajorCategories(s.name);
      return selectedMajorCategories.some(cat => categories.includes(cat));
    });
  }
  
  // 按分数范围筛选（任一年份在范围内即可）
  const inRange = filtered.filter(s => {
    const refScore = getRefScore(s.score2025, s.score2024, s.score2023);
    return refScore >= baseScore - scoreRange && refScore <= baseScore + scoreRange;
  });
  
  // 计算参考分并排序
  const withRefScore = inRange.map(s => ({
    ...s,
    refScore: getRefScore(s.score2025, s.score2024, s.score2023),
  }));
  
  // 按参考分从高到低排序
  const sorted = withRefScore.sort((a, b) => b.refScore - a.refScore);
  
  // 分配档次（支持自定义分数差）
  const customDiffs = customChongScoreDiff !== undefined || customWenScoreDiff !== undefined || customBaoScoreDiff !== undefined
    ? { 
        chong: customChongScoreDiff ?? 10, 
        wen: customWenScoreDiff ?? 5, 
        bao: customBaoScoreDiff ?? 5 
      }
    : undefined;
  
  const withTier = sorted.map(s => ({
    ...s,
    tier: getTier(s.refScore, baseScore, customDiffs),
  }));
  
  // 按档次分组
  const chong = withTier.filter(s => s.tier === '冲');
  const wen = withTier.filter(s => s.tier === '稳');
  const bao = withTier.filter(s => s.tier === '保');
  
  // 计算各档次数量
  let chongCount: number;
  let wenCount: number;
  let baoCount: number;
  
  if (customChongCount !== undefined && customWenCount !== undefined && customBaoCount !== undefined) {
    // 使用自定义数量
    chongCount = Math.min(customChongCount, chong.length);
    wenCount = Math.min(customWenCount, wen.length);
    baoCount = Math.min(customBaoCount, bao.length);
  } else {
    // 默认比例：冲30%，稳40%，保30%
    chongCount = Math.min(Math.ceil(totalVolunteers * 0.3), chong.length);
    wenCount = Math.min(Math.ceil(totalVolunteers * 0.4), wen.length);
    baoCount = Math.min(totalVolunteers - chongCount - wenCount, bao.length);
  }
  
  // 组合结果
  const result: VolunteerResult[] = [];
  let index = 1;
  
  for (const s of chong.slice(0, chongCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      subject: s.subject,
      province: s.province,
      level: s.level,
      score2025: s.score2025,
      score2024: s.score2024,
      score2023: s.score2023,
      refScore: s.refScore,
      majorSuggestion: formatMajorSuggestion(majorRecs),
      majorRecommendations: majorRecs,
      reason: getRecommendationReason(s.refScore, baseScore),
      admissionProbability: calculateAdmissionProbability(s.refScore, baseScore),
      scoreTrend: calculateScoreTrend(s.score2025, s.score2024, s.score2023),
    });
    index++;
  }
  
  for (const s of wen.slice(0, wenCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      subject: s.subject,
      province: s.province,
      level: s.level,
      score2025: s.score2025,
      score2024: s.score2024,
      score2023: s.score2023,
      refScore: s.refScore,
      majorSuggestion: formatMajorSuggestion(majorRecs),
      majorRecommendations: majorRecs,
      reason: getRecommendationReason(s.refScore, baseScore),
      admissionProbability: calculateAdmissionProbability(s.refScore, baseScore),
      scoreTrend: calculateScoreTrend(s.score2025, s.score2024, s.score2023),
    });
    index++;
  }
  
  for (const s of bao.slice(0, baoCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      subject: s.subject,
      province: s.province,
      level: s.level,
      score2025: s.score2025,
      score2024: s.score2024,
      score2023: s.score2023,
      refScore: s.refScore,
      majorSuggestion: formatMajorSuggestion(majorRecs),
      majorRecommendations: majorRecs,
      reason: getRecommendationReason(s.refScore, baseScore),
      admissionProbability: calculateAdmissionProbability(s.refScore, baseScore),
      scoreTrend: calculateScoreTrend(s.score2025, s.score2024, s.score2023),
    });
    index++;
  }
  
  return result;
}

// 导出为Excel
export function exportToExcel(volunteers: VolunteerResult[], filename: string): void {
  const workbook = XLSX.utils.book_new();
  
  // 构建数据
  const data = [
    ['志愿序号', '志愿档次', '录取概率', '分数趋势', '院校层次', '省份', '院校专业组代码', '院校专业组名称', '科目要求', 
     '2025投档线', '2024投档线', '2023投档线', 
     '保底专业', '稳妥专业', '冲刺专业',
     '推荐理由'],
  ];
  
  for (const v of volunteers) {
    const majors = v.majorRecommendations || [];
    const baoMajors = majors.filter(m => m.admissionTier === '保底').map(m => `${m.name}(${Math.round(m.probability)}%)`).join('、');
    const wenMajors = majors.filter(m => m.admissionTier === '稳妥').map(m => `${m.name}(${Math.round(m.probability)}%)`).join('、');
    const chongMajors = majors.filter(m => m.admissionTier === '冲刺').map(m => `${m.name}(${Math.round(m.probability)}%)`).join('、');
    
    const trendText = v.scoreTrend === 'up' ? '上涨' : v.scoreTrend === 'down' ? '下降' : '平稳';
    
    data.push([
      String(v.index),
      v.tier,
      `${v.admissionProbability}%`,
      trendText,
      v.level,
      v.province,
      v.code,
      v.name,
      String(v.subject),
      v.score2025 !== null ? String(v.score2025) : '',
      v.score2024 !== null ? String(v.score2024) : '',
      v.score2023 !== null ? String(v.score2023) : '',
      baoMajors,
      wenMajors,
      chongMajors,
      v.reason,
    ]);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // 设置列宽
  worksheet['!cols'] = [
    { wch: 8 },   // 志愿序号
    { wch: 8 },   // 志愿档次
    { wch: 10 },  // 院校层次
    { wch: 8 },   // 省份
    { wch: 14 },  // 院校专业组代码
    { wch: 22 },  // 院校专业组名称
    { wch: 8 },   // 科目要求
    { wch: 10 },  // 2025投档线
    { wch: 10 },  // 2024投档线
    { wch: 10 },  // 2023投档线
    { wch: 30 },  // 保底专业
    { wch: 30 },  // 稳妥专业
    { wch: 30 },  // 冲刺专业
    { wch: 55 },  // 推荐理由
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '志愿方案');
  
  // 导出
  XLSX.writeFile(workbook, filename);
}