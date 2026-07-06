import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { getRefScore, getTier, getRecommendationReason, matchMajorCategories, isSubjectMatch } from './dataUtils';
import type { SchoolScore, MajorRecommendation } from './dataUtils';
import { generateMajorRecommendations, formatMajorSuggestion } from './majorRecommender';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { calculateAdmissionProbability, calculateTrendAnalysis, calculateRiskAssessment, getSmartConfig } from './trendAnalyzer';
import { STRATEGY_CONFIGS, type StrategyType } from '../config/strategyConfig';
import { scoreDistributionService } from '../services/scoreDistributionService';
export type { SchoolScore, MajorRecommendation };

function extractSchoolNameKey(schoolName: string): string {
  const cleaned = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  return cleaned;
}

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
  rankDiff: number | null;
  rankPercentage: number | null;
  candidateRank: number | null;
  schoolRank: number | null;
}

export interface RankAnalysis {
  candidateRank: number;
  schoolRank: number;
  rankDiff: number;
  rankPercentage: number;
  totalCandidates: number;
}

const PROVINCE_TOTAL_CANDIDATES: Record<string, number> = {
  '海南': 70398,
  '天津': 77488,
};

const HIGH_SCORE_PROVINCES = ['海南'];

function isHighScoreSystem(province: string): boolean {
  return HIGH_SCORE_PROVINCES.includes(province);
}

function getTotalCandidates(province: string): number {
  return PROVINCE_TOTAL_CANDIDATES[province] || 70000;
}

function getScoreToRankFactor(province: string): number {
  return isHighScoreSystem(province) ? 2 : 1;
}

export async function analyzeRank(
  candidateScore: number,
  schoolScore: number,
  province: string,
  year: number = 2026
): Promise<RankAnalysis | null> {
  try {
    const is3Plus3Mode = ['海南', '天津', '北京', '上海', '山东', '浙江'].includes(province);
    const category = is3Plus3Mode ? '普通类' : undefined;

    const candidateRankInfo = await scoreDistributionService.getRankByScore(province, candidateScore, year, category);
    const schoolRankInfo = await scoreDistributionService.getRankByScore(province, schoolScore, year, category);

    if (!candidateRankInfo || !schoolRankInfo) {
      return estimateRank(candidateScore, schoolScore, province);
    }

    const candidateRank = candidateRankInfo.maxRank;
    const schoolRank = schoolRankInfo.maxRank;
    const totalCandidates = candidateRankInfo.cumulativeCount || getTotalCandidates(province);

    const rankDiff = schoolRank - candidateRank;
    const rankPercentage = totalCandidates > 0 
      ? Math.round((1 - candidateRank / totalCandidates) * 10000) / 100 
      : null;

    return {
      candidateRank,
      schoolRank,
      rankDiff,
      rankPercentage: rankPercentage || null,
      totalCandidates,
    };
  } catch (error) {
    console.warn(`[analyzeRank] 位次分析失败，使用估算值:`, error);
    return estimateRank(candidateScore, schoolScore, province);
  }
}

function estimateRank(candidateScore: number, schoolScore: number, province: string): RankAnalysis | null {
  const totalCandidates = getTotalCandidates(province);
  const scoreRange = isHighScoreSystem(province) ? 500 : 550;
  const minScore = isHighScoreSystem(province) ? 300 : 200;

  const normalizedCandidateScore = Math.max(0, Math.min(1, (candidateScore - minScore) / scoreRange));
  const normalizedSchoolScore = Math.max(0, Math.min(1, (schoolScore - minScore) / scoreRange));

  const candidateRank = Math.round(totalCandidates * (1 - normalizedCandidateScore * normalizedCandidateScore));
  const schoolRank = Math.round(totalCandidates * (1 - normalizedSchoolScore * normalizedSchoolScore));

  const rankDiff = schoolRank - candidateRank;
  const rankPercentage = totalCandidates > 0 
    ? Math.round((1 - candidateRank / totalCandidates) * 10000) / 100 
    : null;

  return {
    candidateRank: Math.max(1, candidateRank),
    schoolRank: Math.max(1, schoolRank),
    rankDiff,
    rankPercentage: rankPercentage || null,
    totalCandidates,
  };
}

export function calculateComprehensiveAdmissionProbability(
  candidateScore: number,
  schoolRefScore: number,
  schoolScore2025: number | null,
  schoolScore2024: number | null,
  schoolScore2023: number | null,
  province: string,
  rankAnalysis: RankAnalysis | null
): { probability: number; factors: { scoreFactor: number; rankFactor: number; trendFactor: number; volatilityFactor: number } } {
  const isHighScore = isHighScoreSystem(province);
  const scoreDiff = candidateScore - schoolRefScore;
  const adjustedDiff = isHighScore ? scoreDiff / 2 : scoreDiff;

  let scoreFactor = 50;
  if (adjustedDiff >= 30) scoreFactor = 99;
  else if (adjustedDiff >= 25) scoreFactor = 97;
  else if (adjustedDiff >= 20) scoreFactor = 94;
  else if (adjustedDiff >= 15) scoreFactor = 88;
  else if (adjustedDiff >= 10) scoreFactor = 78;
  else if (adjustedDiff >= 5) scoreFactor = 65;
  else if (adjustedDiff >= 0) scoreFactor = 50;
  else if (adjustedDiff >= -5) scoreFactor = 38;
  else if (adjustedDiff >= -10) scoreFactor = 28;
  else if (adjustedDiff >= -15) scoreFactor = 18;
  else if (adjustedDiff >= -20) scoreFactor = 12;
  else if (adjustedDiff >= -25) scoreFactor = 8;
  else if (adjustedDiff >= -30) scoreFactor = 5;
  else scoreFactor = 2;

  let rankFactor = scoreFactor;
  if (rankAnalysis) {
    const totalCandidates = rankAnalysis.totalCandidates;
    const rankDiffPercent = totalCandidates > 0 
      ? Math.abs(rankAnalysis.rankDiff) / totalCandidates * 100 
      : 0;

    if (rankAnalysis.rankDiff <= -5) {
      rankFactor = Math.min(99, scoreFactor + rankDiffPercent * 0.5);
    } else if (rankAnalysis.rankDiff <= -2) {
      rankFactor = Math.min(95, scoreFactor + rankDiffPercent * 0.3);
    } else if (rankAnalysis.rankDiff >= 5) {
      rankFactor = Math.max(2, scoreFactor - rankDiffPercent * 0.5);
    } else if (rankAnalysis.rankDiff >= 2) {
      rankFactor = Math.max(10, scoreFactor - rankDiffPercent * 0.3);
    }
  }

  const trendAnalysis = calculateTrendAnalysis(schoolScore2025, schoolScore2024, schoolScore2023);
  const trendFactor = trendAnalysis.trendCoefficient;
  const volatilityFactor = trendAnalysis.volatilityCoefficient;

  const combinedScoreFactor = (scoreFactor * 0.6 + rankFactor * 0.4);
  const finalProbability = Math.max(
    1,
    Math.min(99, combinedScoreFactor * trendFactor * volatilityFactor)
  );

  return {
    probability: Math.round(finalProbability),
    factors: {
      scoreFactor: Math.round(scoreFactor),
      rankFactor: Math.round(rankFactor),
      trendFactor,
      volatilityFactor,
    },
  };
}

/**
 * 将某档超额的配额按优先级转移给其他档
 * 用于冲稳保三档之间的双向再平衡
 */
function transferOverflow(
  overflow: number,
  priorities: Array<'chong' | 'wen' | 'bao'>,
  current: { chong: number; wen: number; bao: number },
  pools: { chong: number; wen: number; bao: number }
): void {
  let remaining = overflow;
  for (const tier of priorities) {
    if (remaining <= 0) break;
    const room = pools[tier] - current[tier];
    const add = Math.min(remaining, Math.max(0, room));
    current[tier] += add;
    remaining -= add;
  }
}

export function getSmartTier(
  candidateScore: number,
  schoolRefScore: number,
  rankAnalysis: RankAnalysis | null,
  strategyConfig: { chongScoreDiff: number; wenScoreDiff: number; baoScoreDiff: number },
  province: string
): '冲' | '稳' | '保' {
  const isHighScore = isHighScoreSystem(province);
  const scoreDiff = candidateScore - schoolRefScore;
  const adjustedDiff = isHighScore ? scoreDiff / 2 : scoreDiff;

  const chongDiff = strategyConfig.chongScoreDiff;
  const wenDiff = strategyConfig.wenScoreDiff;

  let tier: '冲' | '稳' | '保';

  if (adjustedDiff > chongDiff) {
    tier = '保';
  } else if (adjustedDiff >= -wenDiff && adjustedDiff <= chongDiff) {
    tier = '稳';
  } else {
    tier = '冲';
  }

  if (rankAnalysis && rankAnalysis.rankDiff !== null) {
    const totalCandidates = rankAnalysis.totalCandidates;
    const rankDiffPercent = totalCandidates > 0 
      ? Math.abs(rankAnalysis.rankDiff) / totalCandidates * 100 
      : 0;

    if (tier === '稳') {
      if (rankDiffPercent > 10 && rankAnalysis.rankDiff > 0) {
        tier = '冲';
      } else if (rankDiffPercent > 10 && rankAnalysis.rankDiff < 0) {
        tier = '保';
      }
    } else if (tier === '冲') {
      if (rankDiffPercent <= 3 && rankAnalysis.rankDiff < 0) {
        tier = '稳';
      }
    } else if (tier === '保') {
      if (rankDiffPercent <= 3 && rankAnalysis.rankDiff > 0) {
        tier = '稳';
      }
    }
  }

  return tier;
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
export async function filterSchools(
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
  excludedMajors: string[] = [],
  province: string = '海南'
): Promise<VolunteerResult[]> {
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
    excludedMajors,
    province
  );
}

// 筛选院校（带专业数据版本，支持位次分析）
export async function filterSchoolsWithMajors(
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
  excludedMajors: string[] = [],
  province: string = '海南'
): Promise<VolunteerResult[]> {
  const strategyConfig = STRATEGY_CONFIGS[strategy];
  
  // 强制按考生所在省份过滤：只推荐该省份有招生数据的院校
  let filtered = schools.filter(s => s.province === province || s.region === province);
  
  // 按科目筛选（支持3+3省份的选科匹配，扩展匹配逻辑）
  filtered = filtered.filter(s => {
    if (selectedSubjects.length > 0) {
      if (s.subject_requirement) {
        return isSubjectMatch(selectedSubjects, s.subject_requirement);
      }
      if (s.subject !== undefined && s.subject !== null) {
        return isSubjectMatch(selectedSubjects, s.subject);
      }
      return true;
    }
    if (subject === 0) {
      return true;
    }
    return s.subject === subject || s.subject === 0;
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
  
  // 专业优先：先从major_scores表获取该省份所有专业数据，按专业分数筛选
  // 只有专业最低分在分数范围内的院校才推荐
  const allProvinceMajors = await majorScoreService.getByProvince(province);
  
  // 筛选符合条件的专业：选科匹配 + 分数在范围内 + 想学/排除专业匹配
  const validMajors = allProvinceMajors.filter(major => {
    if (!major.min_score) return false;
    
    // 选科匹配
    if (selectedSubjects.length > 0 && major.subject_requirement) {
      if (!isSubjectMatch(selectedSubjects, major.subject_requirement)) {
        return false;
      }
    }
    
    // 想学专业匹配
    if (selectedMajors.length > 0) {
      if (!selectedMajors.some(m => major.major_name?.includes(m))) {
        return false;
      }
    }
    
    // 排除专业匹配
    if (excludedMajors.length > 0) {
      if (excludedMajors.some(m => major.major_name?.includes(m))) {
        return false;
      }
    }
    
    return true;
  });
  
  // 获取有符合条件专业的院校列表
  const schoolsWithValidMajors = new Set<string>();
  validMajors.forEach(major => {
    if (major.school_name) {
      schoolsWithValidMajors.add(major.school_name);
    }
  });
  
  // 按分数范围筛选（任一年份在范围内即可）
  // 关键修复：筛选范围必须覆盖策略所需的最大保档/冲档分差，否则会丢失候选院校
  // 海南高分制下 adjustedDiff = scoreDiff/2，因此筛选范围需 ×2
  const isHighScore = isHighScoreSystem(province);
  const strategyMaxDiff = Math.max(
    strategyConfig.chongScoreDiff,
    strategyConfig.wenScoreDiff,
    strategyConfig.baoScoreDiff
  );
  const strategyRequiredRange = isHighScore ? strategyMaxDiff * 2 : strategyMaxDiff;
  const effectiveRange = Math.max(scoreRange, strategyRequiredRange);

  const inRange = filtered.filter(s => {
    // 专业优先：必须有符合条件的专业才推荐
    const schoolNameKey = extractSchoolNameKey(s.name);
    const hasValidMajor = Array.from(schoolsWithValidMajors).some(
      sn => extractSchoolNameKey(sn) === schoolNameKey || sn.includes(schoolNameKey)
    );
    if (!hasValidMajor) return false;
    
    const refScore = getRefScore(s.score2025, s.score2024, s.score2023);
    return refScore >= baseScore - effectiveRange && refScore <= baseScore + effectiveRange;
  });
  
  // 计算参考分并排序
  const withRefScore = inRange.map(s => ({
    ...s,
    refScore: getRefScore(s.score2025, s.score2024, s.score2023),
  }));
  
  // 按参考分从高到低排序
  const sorted = withRefScore.sort((a, b) => b.refScore - a.refScore);
  
  // 并行计算位次分析
  const withRankAnalysis = await Promise.all(sorted.map(async s => {
    const rankAnalysis = await analyzeRank(baseScore, s.refScore, province);
    const tier = getSmartTier(baseScore, s.refScore, rankAnalysis, strategyConfig, province);
    return {
      ...s,
      tier,
      rankAnalysis,
    };
  }));
  
  // 按档次分组，并按分数优化排序
  // 冲档：按分数从高到低排序（最高分优先，冲击更好的学校）
  const chong = withRankAnalysis
    .filter(s => s.tier === '冲')
    .sort((a, b) => b.refScore - a.refScore);
  
  // 稳档：按分数接近程度排序（越接近考生分数越优先）
  const wen = withRankAnalysis
    .filter(s => s.tier === '稳')
    .sort((a, b) => Math.abs(a.refScore - baseScore) - Math.abs(b.refScore - baseScore));
  
  // 保档：按分数从低到高排序（最低分优先，确保保底安全）
  const bao = withRankAnalysis
    .filter(s => s.tier === '保')
    .sort((a, b) => a.refScore - b.refScore);
  
  // 使用策略配置的比例计算各档次数量
  let chongCount = Math.min(Math.ceil(totalVolunteers * strategyConfig.chongRatio), chong.length);
  let wenCount = Math.min(Math.ceil(totalVolunteers * strategyConfig.wenRatio), wen.length);
  let baoCount = Math.max(0, totalVolunteers - chongCount - wenCount);

  // 双向再平衡：三档之间互相调配，确保总数尽量等于 totalVolunteers
  const counts = { chong: chongCount, wen: wenCount, bao: baoCount };
  const pools = { chong: chong.length, wen: wen.length, bao: bao.length };

  // 第一轮：保档不足 → 让给稳档，再让给冲档
  if (counts.bao > pools.bao) {
    const extra = counts.bao - pools.bao;
    counts.bao = pools.bao;
    transferOverflow(extra, ['wen', 'chong'], counts, pools);
  }

  // 第二轮：稳档不足 → 让给冲档，再让给保档
  if (counts.wen > pools.wen) {
    const extra = counts.wen - pools.wen;
    counts.wen = pools.wen;
    transferOverflow(extra, ['chong', 'bao'], counts, pools);
  }

  // 第三轮：冲档不足 → 让给稳档，再让给保档（新增，解决高分考生冲档少）
  if (counts.chong > pools.chong) {
    const extra = counts.chong - pools.chong;
    counts.chong = pools.chong;
    transferOverflow(extra, ['wen', 'bao'], counts, pools);
  }

  // 第四轮：兜底补足，剩余配额按"保→稳→冲"优先级填补（新增）
  const currentTotal = counts.chong + counts.wen + counts.bao;
  if (currentTotal < totalVolunteers) {
    const deficit = totalVolunteers - currentTotal;
    transferOverflow(deficit, ['bao', 'wen', 'chong'], counts, pools);
  }

  chongCount = counts.chong;
  wenCount = counts.wen;
  baoCount = counts.bao;
  
  // 组合结果
  const result: VolunteerResult[] = [];
  let index = 1;
  
  for (const s of chong.slice(0, chongCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const probResult = calculateComprehensiveAdmissionProbability(
      baseScore, s.refScore, s.score2025, s.score2024, s.score2023, province, s.rankAnalysis
    );
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
      reason: getRecommendationReason(s.refScore, baseScore, province),
      admissionProbability: probResult.probability,
      scoreTrend: trendAnalysis.trend,
      trendValue: trendAnalysis.trendValue,
      volatility: trendAnalysis.volatility,
      matchedMajors: [],
      rankDiff: s.rankAnalysis?.rankDiff ?? null,
      rankPercentage: s.rankAnalysis?.rankPercentage ?? null,
      candidateRank: s.rankAnalysis?.candidateRank ?? null,
      schoolRank: s.rankAnalysis?.schoolRank ?? null,
    });
    index++;
  }
  
  for (const s of wen.slice(0, wenCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const probResult = calculateComprehensiveAdmissionProbability(
      baseScore, s.refScore, s.score2025, s.score2024, s.score2023, province, s.rankAnalysis
    );
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
      reason: getRecommendationReason(s.refScore, baseScore, province),
      admissionProbability: probResult.probability,
      scoreTrend: trendAnalysis.trend,
      trendValue: trendAnalysis.trendValue,
      volatility: trendAnalysis.volatility,
      matchedMajors: [],
      rankDiff: s.rankAnalysis?.rankDiff ?? null,
      rankPercentage: s.rankAnalysis?.rankPercentage ?? null,
      candidateRank: s.rankAnalysis?.candidateRank ?? null,
      schoolRank: s.rankAnalysis?.schoolRank ?? null,
    });
    index++;
  }
  
  for (const s of bao.slice(0, baoCount)) {
    const majorRecs = generateMajorRecommendations(s.name, baseScore, s.refScore, s.level);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const probResult = calculateComprehensiveAdmissionProbability(
      baseScore, s.refScore, s.score2025, s.score2024, s.score2023, province, s.rankAnalysis
    );
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
      reason: getRecommendationReason(s.refScore, baseScore, province),
      admissionProbability: probResult.probability,
      scoreTrend: trendAnalysis.trend,
      trendValue: trendAnalysis.trendValue,
      volatility: trendAnalysis.volatility,
      matchedMajors: [],
      rankDiff: s.rankAnalysis?.rankDiff ?? null,
      rankPercentage: s.rankAnalysis?.rankPercentage ?? null,
      candidateRank: s.rankAnalysis?.candidateRank ?? null,
      schoolRank: s.rankAnalysis?.schoolRank ?? null,
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
// 海南900分制使用更大的分数差区间
function getMajorAdmissionProbability(majorScore: number, baseScore: number, province: string = '海南'): number {
  const diff = baseScore - majorScore;
  const isHighScoreSystem = ['海南'].includes(province);
  
  if (isHighScoreSystem) {
    if (diff >= 80) return 99;
    if (diff >= 60) return 97;
    if (diff >= 45) return 94;
    if (diff >= 30) return 88;
    if (diff >= 15) return 78;
    if (diff >= 5) return 65;
    if (diff >= 0) return 50;
    if (diff >= -5) return 38;
    if (diff >= -15) return 28;
    if (diff >= -30) return 18;
    if (diff >= -45) return 12;
    if (diff >= -60) return 8;
    if (diff >= -80) return 5;
    return 2;
  }
  
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
  wenDiff: number,
  province: string = '海南'
): '冲' | '稳' | '保' {
  const diff = majorScore - baseScore;
  const isHighScoreSystem = ['海南'].includes(province);
  
  const adjustedChongDiff = isHighScoreSystem ? chongDiff * 2 : chongDiff;
  const adjustedWenDiff = isHighScoreSystem ? wenDiff * 2 : wenDiff;
  
  if (diff > 0 && diff <= adjustedChongDiff) {
    return '冲';
  } else if (diff >= -adjustedWenDiff && diff <= 0) {
    return '稳';
  } else if (diff < -adjustedWenDiff) {
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
  excludedMajors: string[] = [],
  province: string = '海南'
): Promise<VolunteerResult[]> {
  const results = await filterSchoolsWithMajors(
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
    excludedMajors,
    province
  );
  
  const strategyConfig = STRATEGY_CONFIGS[strategy];
  const chongDiff = strategyConfig.chongScoreDiff;
  const wenDiff = strategyConfig.wenScoreDiff;
  const baoDiff = strategyConfig.baoScoreDiff;
  
  const isHighScoreSystem = ['海南'].includes(province);
  const adjustedMaxRange = isHighScoreSystem ? Math.max(chongDiff, wenDiff, baoDiff) * 2 + 60 : Math.max(chongDiff, wenDiff, baoDiff) + 30;
  
  for (const result of results) {
    try {
      const schoolName = extractSchoolName(result.name);
      const allMajors = await majorScoreService.getBySchoolAndProvince(schoolName, province);
      
      const filteredMajors = allMajors.filter(major => {
        if (!major.min_score) return false;
        
        if (selectedSubjects.length > 0 && major.subject_requirement) {
          if (!isSubjectMatch(selectedSubjects, major.subject_requirement)) {
            return false;
          }
        }
        
        return true;
      });
      
      const matched = filteredMajors.filter(major => {
        const score = major.min_score || 0;
        return score >= baseScore - adjustedMaxRange && score <= baseScore + adjustedMaxRange;
      });
      
      matched.forEach(major => {
        const score = major.min_score || 0;
        major.admission_probability = getMajorAdmissionProbability(score, baseScore, province);
        major.tier = getMajorTierByScore(score, baseScore, chongDiff, wenDiff, province);
      });
      
      // 专业热度关键词映射（基于专业名称判断热度）
      const getMajorHeatScore = (majorName: string): number => {
        const hotKeywords = ['计算机', '软件', '电子信息', '人工智能', '数据', '金融', '经济', '临床医学', '口腔', '法学', '会计'];
        const warmKeywords = ['机械', '土木', '化工', '材料', '环境', '生物', '数学', '物理', '化学', '英语', '汉语言'];
        const coolKeywords = ['历史', '哲学', '考古', '地质', '矿业', '林业', '农学', '水利', '测绘', '海洋'];
        
        for (const keyword of hotKeywords) {
          if (majorName.includes(keyword)) return 100;
        }
        for (const keyword of warmKeywords) {
          if (majorName.includes(keyword)) return 70;
        }
        for (const keyword of coolKeywords) {
          if (majorName.includes(keyword)) return 40;
        }
        return 60;
      };
      
      // 严格按策略匹配专业：
      // 冲档院校：优先推荐冲专业（分数较高的专业），其次稳专业
      // 稳档院校：优先推荐稳专业（分数接近的专业），其次保专业
      // 保档院校：优先推荐保专业（分数较低的专业），其次稳专业
      let strategyMatched: MajorScore[] = [];
      const chongMajors = matched.filter(m => m.tier === '冲');
      const wenMajors = matched.filter(m => m.tier === '稳');
      const baoMajors = matched.filter(m => m.tier === '保');
      
      if (result.tier === '冲') {
        // 冲档院校：优先推荐冲专业，其次稳专业
        // 冲专业按分数降序排列（优先推荐分数最高的冲专业，更符合冲刺概念）
        // 稳专业按分数降序排列（优先推荐分数较高的稳专业）
        chongMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        wenMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        strategyMatched = [...chongMajors, ...wenMajors];
      } else if (result.tier === '稳') {
        // 稳档院校：优先推荐稳专业，其次保专业（保专业更容易录取，增加稳妥性）
        // 稳专业按与考生分数的差值升序排列（优先推荐最接近考生分数的专业）
        // 保专业按分数降序排列（优先推荐分数较高的保专业，不浪费分数）
        wenMajors.sort((a, b) => Math.abs((a.min_score || 0) - baseScore) - Math.abs((b.min_score || 0) - baseScore));
        baoMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        strategyMatched = [...wenMajors, ...baoMajors];
      } else if (result.tier === '保') {
        // 保档院校：优先推荐保专业，其次稳专业
        // 保专业按分数降序排列（优先推荐分数较高的保专业，既保证录取又不浪费分数）
        // 稳专业按分数降序排列（优先推荐分数较高的稳专业）
        baoMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        wenMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        strategyMatched = [...baoMajors, ...wenMajors];
      } else {
        strategyMatched = [...matched];
      }
      
      // 如果没有符合策略的专业，则使用全部匹配的专业
      if (strategyMatched.length === 0) {
        strategyMatched = [...matched];
      }
      
      const uniqueMajors = deduplicateMajors(strategyMatched);
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

const COLORS = {
  headerBg: '334155',
  headerFont: 'FFFFFF',
  probHighBg: 'D1FAE5',
  probHighFont: '10B981',
  probMediumHighBg: 'DBEAFE',
  probMediumHighFont: '3B82F6',
  probMediumBg: 'FEF3C7',
  probMediumFont: 'F59E0B',
  probLowBg: 'FEE2E2',
  probLowFont: 'EF4444',
  probVeryLowBg: 'FECACA',
  probVeryLowFont: 'DC2626',
  cardBorder: 'E2E8F0',
  tierChongBg: 'FFF7ED',
  tierChongBorder: 'FDBA74',
  tierWenBg: 'FEFCE8',
  tierWenBorder: 'FDE047',
  tierBaoBg: 'ECFDF5',
  tierBaoBorder: '34D399',
  textPrimary: '1E293B',
  textSecondary: '64748B',
};

function getProbabilityStyle(probability: number) {
  if (probability >= 85) {
    return { bg: COLORS.probHighBg, font: COLORS.probHighFont };
  } else if (probability >= 70) {
    return { bg: COLORS.probMediumHighBg, font: COLORS.probMediumHighFont };
  } else if (probability >= 50) {
    return { bg: COLORS.probMediumBg, font: COLORS.probMediumFont };
  } else if (probability >= 30) {
    return { bg: COLORS.probLowBg, font: COLORS.probLowFont };
  } else {
    return { bg: COLORS.probVeryLowBg, font: COLORS.probVeryLowFont };
  }
}

function getTierStyle(tier: string) {
  switch (tier) {
    case '冲':
      return { bg: COLORS.tierChongBg, border: COLORS.tierChongBorder, font: 'EA580C' };
    case '稳':
      return { bg: COLORS.tierWenBg, border: COLORS.tierWenBorder, font: 'CA8A04' };
    case '保':
      return { bg: COLORS.tierBaoBg, border: COLORS.tierBaoBorder, font: '059669' };
    default:
      return { bg: 'F8FAFC', border: COLORS.cardBorder, font: COLORS.textSecondary };
  }
}

function getLevelStyle(level: string) {
  switch (level) {
    case '985':
      return { font: '7C3AED', bold: true };
    case '211':
    case '双一流':
      return { font: '3B82F6', bold: true };
    default:
      return { font: COLORS.textPrimary, bold: false };
  }
}

async function exportToExcelModern(volunteers: VolunteerResult[], filename: string, baseScore: number): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '智能志愿推荐系统';
  workbook.lastModifiedBy = '智能志愿推荐系统';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  const mainSheet = workbook.addWorksheet('志愿方案');
  const summarySheet = workbook.addWorksheet('分析汇总');
  
  mainSheet.columns = [
    { key: 'index', width: 10 },
    { key: 'tier', width: 10 },
    { key: 'probability', width: 12 },
    { key: 'level', width: 12 },
    { key: 'province', width: 10 },
    { key: 'code', width: 16 },
    { key: 'name', width: 28 },
    { key: 'subject', width: 10 },
    { key: 'score2025', width: 12 },
    { key: 'score2024', width: 12 },
    { key: 'score2023', width: 12 },
    { key: 'majors', width: 60 },
    { key: 'reason', width: 50 },
  ];
  
  const headerStyle = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
    font: { name: '微软雅黑', size: 12, bold: true, color: { argb: COLORS.headerFont } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { argb: 'CBD5E1' } },
      left: { style: 'medium', color: { argb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'CBD5E1' } },
      right: { style: 'medium', color: { argb: 'CBD5E1' } },
    },
  };
  
  const normalStyle = {
    font: { name: '微软雅黑', size: 11, color: { argb: COLORS.textPrimary } },
    alignment: { vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { argb: COLORS.cardBorder } },
      left: { style: 'thin', color: { argb: COLORS.cardBorder } },
      bottom: { style: 'thin', color: { argb: COLORS.cardBorder } },
      right: { style: 'thin', color: { argb: COLORS.cardBorder } },
    },
  };
  
  const headers = [
    '志愿序号', '志愿档次', '录取概率', '院校层次', '省份', '院校代码', '院校名称',
    '科目要求', '2025投档线', '2024投档线', '2023投档线', '推荐专业', '推荐理由',
  ];
  
  const headerRow = mainSheet.addRow(headers);
  headerRow.eachCell((cell, colNumber) => {
    Object.assign(cell, headerStyle);
  });
  
  for (const v of volunteers) {
    const realMajors = v.matchedMajors || [];
    
    const formatMajor = (major: MajorScore) => {
      const details: string[] = [`${major.major_name}`];
      if (major.min_score) details.push(`${major.min_score}分`);
      if (major.admission_probability !== undefined) details.push(`(${major.admission_probability}%)`);
      return details.join('');
    };
    
    const baoMajors = realMajors.filter(m => m.tier === '保').slice(0, 2);
    const wenMajors = realMajors.filter(m => m.tier === '稳').slice(0, 2);
    const chongMajors = realMajors.filter(m => m.tier === '冲').slice(0, 2);
    
    const formattedMajors: string[] = [];
    if (baoMajors.length > 0) {
      formattedMajors.push(`【保】${baoMajors.map(formatMajor).join('、')}`);
    }
    if (wenMajors.length > 0) {
      formattedMajors.push(`【稳】${wenMajors.map(formatMajor).join('、')}`);
    }
    if (chongMajors.length > 0) {
      formattedMajors.push(`【冲】${chongMajors.map(formatMajor).join('、')}`);
    }
    
    const majorsText = formattedMajors.length > 0 ? formattedMajors.join('\n') : v.majorSuggestion || '';
    
    const row = mainSheet.addRow([
      v.index,
      v.tier,
      `${v.admissionProbability}%`,
      v.level,
      v.province,
      v.code,
      v.name,
      v.subject,
      v.score2025 ?? '',
      v.score2024 ?? '',
      v.score2023 ?? '',
      majorsText,
      v.reason,
    ]);
    
    const probStyle = getProbabilityStyle(v.admissionProbability);
    const tierStyle = getTierStyle(v.tier);
    const levelStyle = getLevelStyle(v.level);
    
    row.eachCell((cell, colNumber) => {
      Object.assign(cell, normalStyle);
      
      if (colNumber === 1) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
        cell.font = { ...cell.font, bold: true };
      } else if (colNumber === 2) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tierStyle.bg } };
        cell.font = { ...cell.font, bold: true, color: { argb: tierStyle.font } };
      } else if (colNumber === 3) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: probStyle.bg } };
        cell.font = { ...cell.font, bold: true, color: { argb: probStyle.font } };
      } else if (colNumber === 4) {
        cell.font = { ...cell.font, bold: levelStyle.bold, color: { argb: levelStyle.font } };
      } else if (colNumber === 5) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      } else if (colNumber === 6) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      } else if (colNumber === 7) {
        cell.font = { ...cell.font, bold: true };
      } else if (colNumber === 8) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
      } else if (colNumber >= 9 && colNumber <= 11) {
        cell.alignment = { ...cell.alignment, horizontal: 'center' };
        cell.font = { ...cell.font, size: 10 };
      }
    });
  }
  
  mainSheet.views = [{ state: 'frozen', ySplit: 1 }];
  
  summarySheet.columns = [
    { key: 'label', width: 25 },
    { key: 'value', width: 20 },
    { key: 'percentage', width: 15 },
    { key: '', width: 10 },
    { key: '', width: 10 },
    { key: '', width: 10 },
    { key: '', width: 10 },
  ];
  
  const chongCount = volunteers.filter(r => r.tier === '冲').length;
  const wenCount = volunteers.filter(r => r.tier === '稳').length;
  const baoCount = volunteers.filter(r => r.tier === '保').length;
  const totalCount = volunteers.length;
  
  const levelCounts: Record<string, number> = {};
  volunteers.forEach(v => {
    levelCounts[v.level] = (levelCounts[v.level] || 0) + 1;
  });
  
  const probDistribution = { '高(≥85%)': 0, '偏高(70-85%)': 0, '中(50-70%)': 0, '偏低(30-50%)': 0, '低(<30%)': 0 };
  volunteers.forEach(v => {
    if (v.admissionProbability >= 85) probDistribution['高(≥85%)']++;
    else if (v.admissionProbability >= 70) probDistribution['偏高(70-85%)']++;
    else if (v.admissionProbability >= 50) probDistribution['中(50-70%)']++;
    else if (v.admissionProbability >= 30) probDistribution['偏低(30-50%)']++;
    else probDistribution['低(<30%)']++;
  });
  
  const summaryData = [
    { label: '考生信息', value: '', percentage: '' },
    { label: '基准分数', value: `${baseScore}分`, percentage: '' },
    { label: '志愿数量', value: `${totalCount}个`, percentage: '' },
    { label: '', value: '', percentage: '' },
    { label: '志愿档次分布', value: '', percentage: '' },
    { label: '冲志愿', value: `${chongCount}个`, percentage: `${((chongCount / totalCount) * 100).toFixed(1)}%` },
    { label: '稳志愿', value: `${wenCount}个`, percentage: `${((wenCount / totalCount) * 100).toFixed(1)}%` },
    { label: '保志愿', value: `${baoCount}个`, percentage: `${((baoCount / totalCount) * 100).toFixed(1)}%` },
    { label: '', value: '', percentage: '' },
    { label: '院校层次分布', value: '', percentage: '' },
    ...Object.entries(levelCounts).map(([level, count]) => ({
      label: level,
      value: `${count}个`,
      percentage: `${((count / totalCount) * 100).toFixed(1)}%`,
    })),
    { label: '', value: '', percentage: '' },
    { label: '录取概率分布', value: '', percentage: '' },
    ...Object.entries(probDistribution).map(([range, count]) => ({
      label: range,
      value: `${count}个`,
      percentage: `${((count / totalCount) * 100).toFixed(1)}%`,
    })),
  ];
  
  summaryData.forEach((data, idx) => {
    const row = summarySheet.addRow([data.label, data.value, data.percentage, '', '', '', '']);
    
    row.eachCell((cell) => {
      Object.assign(cell, normalStyle);
    });
    
    const isSectionTitle = ['考生信息', '志愿档次分布', '院校层次分布', '录取概率分布'].includes(data.label);
    if (isSectionTitle) {
      for (let i = 1; i <= 7; i++) {
        const cell = row.getCell(i);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
        cell.font = { name: '微软雅黑', size: 12, bold: true, color: { argb: COLORS.headerFont } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
    } else if (data.label) {
      row.getCell(1).font = { ...row.getCell(1).font, bold: true };
      row.getCell(2).font = { ...row.getCell(2).font, bold: true };
    }
  });
  
  mainSheet.properties.tabColor = { argb: COLORS.headerBg };
  summarySheet.properties.tabColor = { argb: COLORS.probHighBg };
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 导出为Excel
export function exportToExcel(volunteers: VolunteerResult[], filename: string): void {
  const baseScore = volunteers[0]?.refScore || 0;
  
  exportToExcelModern(volunteers, filename, baseScore).catch(error => {
    console.error('Excel导出失败:', error);
    
    const workbook = XLSX.utils.book_new();
    
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
      
      const formatMajorDetail = (major: MajorScore) => {
        const details: string[] = [`${major.major_name}`];
        if (major.min_score) details.push(`${major.min_score}分`);
        if (major.avg_score && major.avg_score !== major.min_score) details.push(`平均${major.avg_score}分`);
        if (major.min_rank) details.push(`位次${major.min_rank}`);
        if (major.year) details.push(`${major.year}年`);
      if (major.batch) details.push(major.batch);
        if (major.subject_requirement) details.push(`选科:${major.subject_requirement}`);
        if (major.admission_probability !== undefined) details.push(`录取率${major.admission_probability}%`);
        return details.join(' ');
      };
      
      const baoMajorDetails = baoMajors.map(formatMajorDetail).join('\n');
      const wenMajorDetails = wenMajors.map(formatMajorDetail).join('\n');
      const chongMajorDetails = chongMajors.map(formatMajorDetail).join('\n');
      
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
    
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 45 },
      { wch: 45 },
      { wch: 45 },
      { wch: 65 },
      { wch: 65 },
      { wch: 65 },
      { wch: 60 },
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '志愿方案');
    
    XLSX.writeFile(workbook, filename);
  });
}