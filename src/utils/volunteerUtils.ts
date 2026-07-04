import * as XLSX from 'xlsx';
import { getRefScore, getTier, getRecommendationReason, matchMajorCategories, isSubjectMatch } from './dataUtils';
import type { SchoolScore, MajorRecommendation } from './dataUtils';
import { generateMajorRecommendations, formatMajorSuggestion } from './majorRecommender';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { calculateAdmissionProbability, calculateTrendAnalysis, calculateRiskAssessment, getSmartConfig } from './trendAnalyzer';
import { STRATEGY_CONFIGS, type StrategyType } from '../store/appStore';
export type { SchoolScore, MajorRecommendation };

export interface VolunteerResult {
  index: number;
  tier: '冲' | '稳' | '保';
  code: string;
  name: string;
  subject: number;
  province: string;
  level: string;
  nature: '公办' | '民办' | '中外合作办学';
  score2025: number | null;
  score2024: number | null;
  score2023: number | null;
  refScore: number;
  majorSuggestion: string;
  majorRecommendations: MajorRecommendation[];
  reason: string;
  admissionProbability: number;
  scoreTrend: 'up' | 'down' | 'stable';
  trendValue: number;
  volatility: number;
  matchedMajors: MajorScore[];
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
          subject_requirement: null,
          province: '其他',
          level: '普通本科',
          nature: '公办',
          region: '海南',
          score2025: year === 2025 ? score : null,
          score2024: year === 2024 ? score : null,
          score2023: year === 2023 ? score : null,
        });
      }
    }
  }
  
  return result;
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

function deduplicateMajors(majors: MajorScore[]): MajorScore[] {
  const map = new Map<string, MajorScore>();
  
  for (const major of majors) {
    const key = major.major_name;
    const existing = map.get(key);
    
    if (!existing) {
      map.set(key, major);
    } else {
      if (major.year && existing.year && major.year > existing.year) {
        map.set(key, major);
      } else if (!existing.year && major.year) {
        map.set(key, major);
      }
    }
  }
  
  return Array.from(map.values());
}

// 筛选院校（同步版本，保持向后兼容）
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
  strategy: StrategyType = '稳妥',
  selectedSubjects: string[] = [],
  selectedMajors: string[] = [],
  excludedMajors: string[] = []
): VolunteerResult[] {
  return filterSchoolsWithMajors(
    schools,
    baseScore,
    scoreRange,
    subject,
    totalVolunteers,
    selectedLevels,
    selectedProvinces,
    selectedMajorCategories,
    selectedNatures,
    strategy,
    selectedSubjects,
    selectedMajors,
    excludedMajors
  );
}

// 筛选院校（带专业数据版本）
export function filterSchoolsWithMajors(
  schools: SchoolScore[],
  baseScore: number,
  scoreRange: number,
  subject: number,
  totalVolunteers: number = 30,
  selectedLevels: string[] = [],
  selectedProvinces: string[] = [],
  selectedMajorCategories: string[] = [],
  selectedNatures: string[] = [],
  strategy: StrategyType = '稳妥',
  selectedSubjects: string[] = [],
  selectedMajors: string[] = [],
  excludedMajors: string[] = []
): VolunteerResult[] {
  const strategyConfig = STRATEGY_CONFIGS[strategy];
  
  // 按科目筛选（支持3+3省份的选科匹配）
  let filtered = schools.filter(s => {
    if (selectedSubjects.length > 0) {
      return isSubjectMatch(selectedSubjects, s.subject_requirement ?? s.subject);
    }
    return s.subject === subject;
  });
  
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
  
  // 按想学的专业筛选（包含任意一个想学的专业）
  if (selectedMajors.length > 0) {
    filtered = filtered.filter(s => {
      return selectedMajors.some(major => s.name.includes(major));
    });
  }
  
  // 按排除的专业筛选（不包含任何排除的专业）
  if (excludedMajors.length > 0) {
    filtered = filtered.filter(s => {
      return !excludedMajors.some(major => s.name.includes(major));
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
  
  // 使用策略配置的分数差进行档次分配
  const customDiffs = { 
    chong: strategyConfig.chongScoreDiff, 
    wen: strategyConfig.wenScoreDiff, 
    bao: strategyConfig.baoScoreDiff 
  };
  
  const withTier = sorted.map(s => ({
    ...s,
    tier: getTier(s.refScore, baseScore, customDiffs),
  }));
  
  // 按档次分组
  const chong = withTier.filter(s => s.tier === '冲');
  const wen = withTier.filter(s => s.tier === '稳');
  const bao = withTier.filter(s => s.tier === '保');
  
  // 使用策略配置的比例计算各档次数量
  let chongCount = Math.min(Math.ceil(totalVolunteers * strategyConfig.chongRatio), chong.length);
  let wenCount = Math.min(Math.ceil(totalVolunteers * strategyConfig.wenRatio), wen.length);
  let baoCount = Math.max(0, totalVolunteers - chongCount - wenCount);
  
  if (baoCount > bao.length) {
    const extra = baoCount - bao.length;
    baoCount = bao.length;
    wenCount = Math.min(wenCount + extra, wen.length);
  }
  
  if (wenCount > wen.length) {
    const extra = wenCount - wen.length;
    wenCount = wen.length;
    chongCount = Math.min(chongCount + extra, chong.length);
  }
  
  // 组合结果
  const result: VolunteerResult[] = [];
  let index = 1;
  
  for (const s of chong.slice(0, chongCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const probFactors = calculateAdmissionProbability(s.refScore, baseScore, s.score2025, s.score2024, s.score2023);
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      subject: s.subject,
      province: s.province,
      level: s.level,
      nature: s.nature,
      score2025: s.score2025,
      score2024: s.score2024,
      score2023: s.score2023,
      refScore: s.refScore,
      majorSuggestion: formatMajorSuggestion(majorRecs),
      majorRecommendations: majorRecs,
      reason: getRecommendationReason(s.refScore, baseScore),
      admissionProbability: probFactors.finalProbability,
      scoreTrend: trendAnalysis.trend,
      trendValue: trendAnalysis.trendValue,
      volatility: trendAnalysis.volatility,
      matchedMajors: [],
    });
    index++;
  }
  
  for (const s of wen.slice(0, wenCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const probFactors = calculateAdmissionProbability(s.refScore, baseScore, s.score2025, s.score2024, s.score2023);
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      subject: s.subject,
      province: s.province,
      level: s.level,
      nature: s.nature,
      score2025: s.score2025,
      score2024: s.score2024,
      score2023: s.score2023,
      refScore: s.refScore,
      majorSuggestion: formatMajorSuggestion(majorRecs),
      majorRecommendations: majorRecs,
      reason: getRecommendationReason(s.refScore, baseScore),
      admissionProbability: probFactors.finalProbability,
      scoreTrend: trendAnalysis.trend,
      trendValue: trendAnalysis.trendValue,
      volatility: trendAnalysis.volatility,
      matchedMajors: [],
    });
    index++;
  }
  
  for (const s of bao.slice(0, baoCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const probFactors = calculateAdmissionProbability(s.refScore, baseScore, s.score2025, s.score2024, s.score2023);
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      subject: s.subject,
      province: s.province,
      level: s.level,
      nature: s.nature,
      score2025: s.score2025,
      score2024: s.score2024,
      score2023: s.score2023,
      refScore: s.refScore,
      majorSuggestion: formatMajorSuggestion(majorRecs),
      majorRecommendations: majorRecs,
      reason: getRecommendationReason(s.refScore, baseScore),
      admissionProbability: probFactors.finalProbability,
      scoreTrend: trendAnalysis.trend,
      trendValue: trendAnalysis.trendValue,
      volatility: trendAnalysis.volatility,
      matchedMajors: [],
    });
    index++;
  }
  
  return result;
}

// 提取院校名称主体（去除括号及专业组信息）
// 例如："清华大学(03)" -> "清华大学"，"海南大学(80)" -> "海南大学"
function extractSchoolName(schoolName: string): string {
  const match = schoolName.match(/^(.+?)(?:\(\d+\))?$/);
  return match ? match[1].trim() : schoolName.trim();
}

// 获取专业录取概率（基于分数差）
function getMajorAdmissionProbability(majorScore: number, baseScore: number): number {
  const diff = baseScore - majorScore;
  
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

// 根据分数差获取专业档次（与院校分类逻辑一致）
// 冲：min_score > baseScore 且 min_score <= baseScore + chongDiff（专业分更高，冲刺）
// 稳：baseScore - wenDiff <= min_score <= baseScore（专业分接近，稳妥）
// 保：min_score < baseScore - wenDiff（专业分更低，保底）
function getMajorTierByScore(
  majorScore: number,
  baseScore: number,
  chongDiff: number,
  wenDiff: number
): '冲' | '稳' | '保' {
  const diff = majorScore - baseScore;
  
  if (diff > 0 && diff <= chongDiff) {
    return '冲';
  } else if (diff >= -wenDiff && diff <= 0) {
    return '稳';
  } else if (diff < -wenDiff) {
    return '保';
  } else {
    return '冲';
  }
}

// 筛选院校（异步版本，从Supabase获取专业数据）
export async function filterSchoolsAsync(
  schools: SchoolScore[],
  baseScore: number,
  scoreRange: number,
  subject: number,
  totalVolunteers: number = 30,
  selectedLevels: string[] = [],
  selectedProvinces: string[] = [],
  selectedMajorCategories: string[] = [],
  selectedNatures: string[] = [],
  strategy: StrategyType = '稳妥',
  selectedSubjects: string[] = [],
  selectedMajors: string[] = [],
  excludedMajors: string[] = []
): Promise<VolunteerResult[]> {
  const results = filterSchoolsWithMajors(
    schools,
    baseScore,
    scoreRange,
    subject,
    totalVolunteers,
    selectedLevels,
    selectedProvinces,
    selectedMajorCategories,
    selectedNatures,
    strategy,
    selectedSubjects,
    selectedMajors,
    excludedMajors
  );
  
  const strategyConfig = STRATEGY_CONFIGS[strategy];
  const chongDiff = strategyConfig.chongScoreDiff;
  const wenDiff = strategyConfig.wenScoreDiff;
  const baoDiff = strategyConfig.baoScoreDiff;
  
  for (const result of results) {
    try {
      const schoolName = extractSchoolName(result.name);
      const allMajors = await majorScoreService.getBySchool(schoolName);
      
      const filteredMajors = allMajors.filter(major => {
        if (!major.min_score) return false;
        
        if (selectedSubjects.length > 0 && major.subject_requirement) {
          if (!isSubjectMatch(selectedSubjects, major.subject_requirement)) {
            return false;
          }
        }
        
        return true;
      });
      
      const maxRange = Math.max(chongDiff, wenDiff, baoDiff) + 30;
      
      const matched = filteredMajors.filter(major => {
        const score = major.min_score || 0;
        return score >= baseScore - maxRange && score <= baseScore + maxRange;
      });
      
      matched.forEach(major => {
        const score = major.min_score || 0;
        major.admission_probability = getMajorAdmissionProbability(score, baseScore);
        major.tier = getMajorTierByScore(score, baseScore, chongDiff, wenDiff);
      });
      
      matched.sort((a, b) => {
        const scoreA = a.min_score || 0;
        const scoreB = b.min_score || 0;
        return scoreB - scoreA;
      });
      
      const uniqueMajors = deduplicateMajors(matched);
      const limitedMajors = uniqueMajors.slice(0, 6);
      
      result.matchedMajors = limitedMajors;
      
      if (limitedMajors.length > 0) {
        result.majorSuggestion = limitedMajors.slice(0, 3).map(m => m.major_name).join('、') || result.majorSuggestion;
      }
    } catch (error) {
      console.error(`获取${result.name}专业数据失败:`, error);
    }
  }
  
  return results;
}

// 导出为Excel
export function exportToExcel(volunteers: VolunteerResult[], filename: string): void {
  const workbook = XLSX.utils.book_new();
  
  // 构建数据 - 以数据库真实专业数据为主
  const data = [
    ['志愿序号', '志愿档次', '录取概率', '分数趋势', '趋势值(%)', '波动系数(%)', '院校层次', '省份', '院校专业组代码', '院校专业组名称', '科目要求', 
     '2025投档线', '2024投档线', '2023投档线', 
     '推荐专业（保）', '推荐专业（稳）', '推荐专业（冲）',
     '保-专业详情', '稳-专业详情', '冲-专业详情',
     '推荐理由'],
  ];
  
  for (const v of volunteers) {
    const realMajors = v.matchedMajors || [];
    
    const baoMajors = realMajors.filter(m => m.tier === '保');
    const wenMajors = realMajors.filter(m => m.tier === '稳');
    const chongMajors = realMajors.filter(m => m.tier === '冲');
    
    const baoMajorNames = baoMajors.map(m => m.major_name).join('、');
    const wenMajorNames = wenMajors.map(m => m.major_name).join('、');
    const chongMajorNames = chongMajors.map(m => m.major_name).join('、');
    
    const baoMajorDetails = baoMajors.map(m => {
      const details = [`${m.major_name}`];
      if (m.min_score) details.push(`${m.min_score}分`);
      if (m.avg_score && m.avg_score !== m.min_score) details.push(`平均${m.avg_score}分`);
      if (m.min_rank) details.push(`位次${m.min_rank}`);
      if (m.year) details.push(`${m.year}年`);
      if (m.batch) details.push(m.batch);
      if (m.subject_requirement) details.push(`选科:${m.subject_requirement}`);
      if (m.admission_probability !== undefined) details.push(`录取率${m.admission_probability}%`);
      return details.join(' ');
    }).join('\n');
    
    const wenMajorDetails = wenMajors.map(m => {
      const details = [`${m.major_name}`];
      if (m.min_score) details.push(`${m.min_score}分`);
      if (m.avg_score && m.avg_score !== m.min_score) details.push(`平均${m.avg_score}分`);
      if (m.min_rank) details.push(`位次${m.min_rank}`);
      if (m.year) details.push(`${m.year}年`);
      if (m.batch) details.push(m.batch);
      if (m.subject_requirement) details.push(`选科:${m.subject_requirement}`);
      if (m.admission_probability !== undefined) details.push(`录取率${m.admission_probability}%`);
      return details.join(' ');
    }).join('\n');
    
    const chongMajorDetails = chongMajors.map(m => {
      const details = [`${m.major_name}`];
      if (m.min_score) details.push(`${m.min_score}分`);
      if (m.avg_score && m.avg_score !== m.min_score) details.push(`平均${m.avg_score}分`);
      if (m.min_rank) details.push(`位次${m.min_rank}`);
      if (m.year) details.push(`${m.year}年`);
      if (m.batch) details.push(m.batch);
      if (m.subject_requirement) details.push(`选科:${m.subject_requirement}`);
      if (m.admission_probability !== undefined) details.push(`录取率${m.admission_probability}%`);
      return details.join(' ');
    }).join('\n');
    
    const trendText = v.scoreTrend === 'up' ? '上涨' : v.scoreTrend === 'down' ? '下降' : '平稳';
    
    data.push([
      String(v.index),
      v.tier,
      `${v.admissionProbability}%`,
      trendText,
      v.trendValue !== undefined ? String(Math.round(v.trendValue * 100) / 100) : '',
      v.volatility !== undefined ? String(Math.round(v.volatility * 100) / 100) : '',
      v.level,
      v.province,
      v.code,
      v.name,
      String(v.subject),
      v.score2025 !== null ? String(v.score2025) : '',
      v.score2024 !== null ? String(v.score2024) : '',
      v.score2023 !== null ? String(v.score2023) : '',
      baoMajorNames,
      wenMajorNames,
      chongMajorNames,
      baoMajorDetails,
      wenMajorDetails,
      chongMajorDetails,
      v.reason,
    ]);
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // 设置列宽
  worksheet['!cols'] = [
    { wch: 8 },    // 志愿序号
    { wch: 8 },    // 志愿档次
    { wch: 10 },   // 录取概率
    { wch: 8 },    // 分数趋势
    { wch: 12 },   // 趋势值(%)
    { wch: 14 },   // 波动系数(%)
    { wch: 10 },   // 院校层次
    { wch: 8 },    // 省份
    { wch: 14 },   // 院校专业组代码
    { wch: 22 },   // 院校专业组名称
    { wch: 8 },    // 科目要求
    { wch: 10 },   // 2025投档线
    { wch: 10 },   // 2024投档线
    { wch: 10 },   // 2023投档线
    { wch: 40 },   // 推荐专业（保）
    { wch: 40 },   // 推荐专业（稳）
    { wch: 40 },   // 推荐专业（冲）
    { wch: 60 },   // 保-专业详情
    { wch: 60 },   // 稳-专业详情
    { wch: 60 },   // 冲-专业详情
    { wch: 55 },   // 推荐理由
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '志愿方案');
  
  // 导出
  XLSX.writeFile(workbook, filename);
}