import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { getRefScore, getTier, getRecommendationReason, matchMajorCategories, isSubjectMatch, parseSubjectRequirement, SUBJECT_NAMES, SUBJECT_LIST } from './dataUtils';
import type { SchoolScore, MajorRecommendation } from './dataUtils';
import { generateMajorRecommendations, formatMajorSuggestion } from './majorRecommender';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { calculateAdmissionProbability, calculateTrendAnalysis, calculateRiskAssessment, getSmartConfig } from './trendAnalyzer';
import { STRATEGY_CONFIGS, type StrategyType } from '../config/strategyConfig';
import { scoreDistributionService } from '../services/scoreDistributionService';
import { getUniversityWebsite } from '../data/universityWebsites';
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
  schoolName: string;
  website: string | null;
  subject: number;
  subjectText: string;
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
  batchLine: number | null;
  scoreAboveBatch: number | null;
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  majorSpread: number | null;
  admissionGap: number | null;
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

const PROVINCE_BATCH_LINES: Record<string, Record<number, { physics: number; history: number }>> = {
  '海南': {
    2025: { physics: 567, history: 606 },
    2024: { physics: 568, history: 607 },
    2023: { physics: 539, history: 587 },
  },
  '天津': {
    2025: { physics: 547, history: 547 },
    2024: { physics: 547, history: 547 },
    2023: { physics: 532, history: 532 },
  },
};

function isHighScoreSystem(province: string): boolean {
  return HIGH_SCORE_PROVINCES.includes(province);
}

function getTotalCandidates(province: string): number {
  return PROVINCE_TOTAL_CANDIDATES[province] || 70000;
}

function getScoreToRankFactor(province: string): number {
  return isHighScoreSystem(province) ? 2 : 1;
}

function getBatchLine(province: string, year: number, subject: number): number | null {
  const lines = PROVINCE_BATCH_LINES[province];
  if (!lines || !lines[year]) return null;
  
  const subjectStr = String(subject);
  
  const physicsCodes = ['1', '2', '3', '4', '5', '6'];
  const historyCodes = ['4', '5', '6', '7', '8', '9'];
  
  const hasPhysicsNew = ['1', '2', '3'].some(code => subjectStr.includes(code));
  const hasHistoryNew = ['4', '5', '6'].some(code => subjectStr.includes(code));
  
  const hasPhysicsOld = ['4', '5', '6'].some(code => subjectStr.includes(code));
  const hasHistoryOld = ['7', '8', '9'].some(code => subjectStr.includes(code));
  
  if (hasPhysicsNew || (hasPhysicsOld && !hasHistoryOld)) {
    return lines[year].physics;
  }
  return lines[year].history;
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
  rankAnalysis: RankAnalysis | null,
  batchLine: number | null
): { probability: number; factors: { scoreFactor: number; rankFactor: number; trendFactor: number; volatilityFactor: number; batchFactor: number } } {
  const isHighScore = isHighScoreSystem(province);
  const scoreDiff = candidateScore - schoolRefScore;
  const adjustedDiff = isHighScore ? scoreDiff / 2 : scoreDiff;

  let scoreFactor = 50;
  const diffThresholds = isHighScore 
    ? [60, 50, 40, 30, 20, 10, 0, -10, -20, -30, -40, -50, -60]
    : [30, 25, 20, 15, 10, 5, 0, -5, -10, -15, -20, -25, -30];
  const factorValues = [99, 97, 94, 88, 78, 65, 50, 38, 28, 18, 12, 8, 5, 2];

  for (let i = 0; i < diffThresholds.length; i++) {
    if (adjustedDiff >= diffThresholds[i]) {
      scoreFactor = factorValues[i];
      break;
    }
  }

  let rankFactor = scoreFactor;
  if (rankAnalysis) {
    const totalCandidates = rankAnalysis.totalCandidates;
    const rankDiffPercent = totalCandidates > 0 
      ? Math.abs(rankAnalysis.rankDiff) / totalCandidates * 100 
      : 0;

    const rankWeight = Math.min(0.3, rankDiffPercent / 10);

    if (rankAnalysis.rankDiff <= -5) {
      rankFactor = Math.min(99, scoreFactor + rankDiffPercent * 0.3 + rankWeight * 10);
    } else if (rankAnalysis.rankDiff <= -2) {
      rankFactor = Math.min(95, scoreFactor + rankDiffPercent * 0.2 + rankWeight * 5);
    } else if (rankAnalysis.rankDiff >= 5) {
      rankFactor = Math.max(2, scoreFactor - rankDiffPercent * 0.3 - rankWeight * 10);
    } else if (rankAnalysis.rankDiff >= 2) {
      rankFactor = Math.max(10, scoreFactor - rankDiffPercent * 0.2 - rankWeight * 5);
    }
  }

  let batchFactor = 1.0;
  if (batchLine !== null) {
    const schoolAboveBatch = schoolRefScore - batchLine;
    const candidateAboveBatch = candidateScore - batchLine;
    
    if (candidateAboveBatch < 0) {
      batchFactor = Math.max(0.3, 1.0 + candidateAboveBatch / batchLine);
    } else if (schoolAboveBatch < 0) {
      batchFactor = 1.1;
    }
  }

  const trendAnalysis = calculateTrendAnalysis(schoolScore2025, schoolScore2024, schoolScore2023);
  const trendFactor = trendAnalysis.trendCoefficient;
  const volatilityFactor = trendAnalysis.volatilityCoefficient;

  const scoreWeight = rankAnalysis ? 0.5 : 0.7;
  const rankWeightValue = rankAnalysis ? 0.3 : 0.1;
  const combinedScoreFactor = (scoreFactor * scoreWeight + rankFactor * rankWeightValue);
  
  const finalProbability = Math.max(
    1,
    Math.min(99, combinedScoreFactor * trendFactor * volatilityFactor * batchFactor)
  );

  return {
    probability: Math.round(finalProbability),
    factors: {
      scoreFactor: Math.round(scoreFactor),
      rankFactor: Math.round(rankFactor),
      trendFactor,
      volatilityFactor,
      batchFactor: Math.round(batchFactor * 100) / 100,
    },
  };
}

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
  province: string,
  scoreRange: number = 15
): '冲' | '稳' | '保' {
  const isHighScore = isHighScoreSystem(province);
  const scoreDiff = candidateScore - schoolRefScore;
  const adjustedDiff = isHighScore ? scoreDiff / 2 : scoreDiff;

  const effectiveRange = isHighScore ? scoreRange / 2 : scoreRange;
  
  const chongDiff = strategyConfig.chongScoreDiff;
  const wenDiff = strategyConfig.wenScoreDiff;

  const actualChongDiff = Math.min(chongDiff, effectiveRange);
  const actualWenDiff = Math.min(wenDiff, effectiveRange * 0.5);

  let tier: '冲' | '稳' | '保';

  if (adjustedDiff > actualChongDiff) {
    tier = '保';
  } else if (adjustedDiff >= -actualWenDiff && adjustedDiff <= actualChongDiff) {
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

export async function loadSchoolDataFromExcel(file: File): Promise<SchoolScore[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  
  const result: SchoolScore[] = [];
  
  const sheets = ['2025', '2024', '2023'];
  
  for (const sheetName of sheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    
    const year = parseInt(sheetName);
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    let headerRow = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as string[];
      if (row && row.some(cell => String(cell).includes('院校专业组代码'))) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) continue;
    
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i] as (string | number)[];
      if (!row || row.length < 4) continue;
      
      const code = String(row[0] || '');
      const name = String(row[1] || '');
      const subject = parseInt(String(row[2] || '0'));
      const score = parseFloat(String(row[3] || '0'));
      
      if (!code || !name || score === 0) continue;
      
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

function validateSubjectMatch(school: SchoolScore, selectedSubjects: string[], subject: number): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (selectedSubjects.length > 0) {
    let matched = false;
    
    if (school.subject_requirement) {
      if (isSubjectMatch(selectedSubjects, school.subject_requirement)) {
        matched = true;
      } else {
        warnings.push(`选科要求不匹配：${school.subject_requirement}`);
      }
    } else if (school.subject !== undefined && school.subject !== null) {
      if (isSubjectMatch(selectedSubjects, school.subject)) {
        matched = true;
      } else {
        warnings.push(`选科代码不匹配：${school.subject}`);
      }
    }
    
    if (!matched) {
      return { valid: false, warnings };
    }
  } else if (subject !== 0) {
    if (school.subject !== subject && school.subject !== 0) {
      warnings.push(`科目要求不匹配：院校要求${school.subject}`);
      return { valid: false, warnings };
    }
  }
  
  return { valid: true, warnings };
}

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
  
  let filtered = schools.filter(s => s.province === province || s.region === province);
  
  const schoolWarnings = new Map<string, string[]>();
  
  filtered = filtered.filter(s => {
    const { valid, warnings } = validateSubjectMatch(s, selectedSubjects, subject);
    if (warnings.length > 0) {
      schoolWarnings.set(s.code, warnings);
    }
    return valid;
  });
  
  if (selectedLevels.length > 0) {
    filtered = filtered.filter(s => selectedLevels.includes(s.level));
  }
  
  if (selectedNatures.length > 0) {
    filtered = filtered.filter(s => selectedNatures.includes(s.nature));
  }
  
  if (selectedProvinces.length > 0) {
    filtered = filtered.filter(s => selectedProvinces.includes(s.province));
  }
  
  if (selectedMajorCategories.length > 0) {
    filtered = filtered.filter(s => {
      const categories = matchMajorCategories(s.name);
      return selectedMajorCategories.some(cat => categories.includes(cat));
    });
  }
  
  if (selectedMajors.length > 0) {
    filtered = filtered.filter(s => {
      return selectedMajors.some(major => s.name.includes(major));
    });
  }
  
  if (excludedMajors.length > 0) {
    filtered = filtered.filter(s => {
      return !excludedMajors.some(major => s.name.includes(major));
    });
  }
  
  const allProvinceMajors = await majorScoreService.getByProvince(province);
  const isHighScore = isHighScoreSystem(province);
  const effectiveRange = isHighScore ? scoreRange * 2 : scoreRange;
  
  const validMajors = allProvinceMajors.filter(major => {
    if (!major.min_score) return false;
    
    if (major.province !== province) return false;
    
    if (major.min_score < baseScore - effectiveRange || major.min_score > baseScore + effectiveRange) {
      return false;
    }
    
    if (selectedSubjects.length > 0 && major.subject_requirement) {
      if (!isSubjectMatch(selectedSubjects, major.subject_requirement)) {
        return false;
      }
    }
    
    if (selectedMajors.length > 0) {
      if (!selectedMajors.some(m => major.major_name?.includes(m))) {
        return false;
      }
    }
    
    if (excludedMajors.length > 0) {
      if (excludedMajors.some(m => major.major_name?.includes(m))) {
        return false;
      }
    }
    
    return true;
  });
  
  const schoolsWithValidMajors = new Set<string>();
  validMajors.forEach(major => {
    if (major.school_name) {
      schoolsWithValidMajors.add(major.school_name);
    }
  });

  const inRange = filtered.filter(s => {
    const refScore = getRefScore(s.score2025, s.score2024, s.score2023);
    if (refScore < baseScore - effectiveRange || refScore > baseScore + effectiveRange) {
      return false;
    }
    
    const schoolNameKey = extractSchoolNameKey(s.name);
    const hasValidMajor = Array.from(schoolsWithValidMajors).some(
      sn => extractSchoolNameKey(sn) === schoolNameKey || sn.includes(schoolNameKey)
    );
    
    return hasValidMajor;
  });
  
  const useMajorFilter = schoolsWithValidMajors.size > 0 && inRange.length >= Math.min(totalVolunteers, 10);
  
  let finalSchools = inRange;
  
  if (!useMajorFilter) {
    finalSchools = filtered.filter(s => {
      const refScore = getRefScore(s.score2025, s.score2024, s.score2023);
      return refScore >= baseScore - effectiveRange && refScore <= baseScore + effectiveRange;
    });
  }
  
  const withRefScore = finalSchools.map(s => ({
    ...s,
    refScore: getRefScore(s.score2025, s.score2024, s.score2023),
  }));
  
  for (const s of withRefScore) {
    const availableYears = [];
    if (s.score2025 !== null) availableYears.push(2025);
    if (s.score2024 !== null) availableYears.push(2024);
    if (s.score2023 !== null) availableYears.push(2023);
    
    if (availableYears.length < 2) {
      const existingWarnings = schoolWarnings.get(s.code) || [];
      existingWarnings.push(`招生数据不完整：仅${availableYears.length}年有数据，建议谨慎填报`);
      schoolWarnings.set(s.code, existingWarnings);
    }
    
    const hasGap = availableYears.length >= 2 && 
      ((availableYears.includes(2025) && availableYears.includes(2023) && !availableYears.includes(2024)) ||
       (!availableYears.includes(2025) && availableYears.includes(2024) && availableYears.includes(2023)));
    if (hasGap) {
      const existingWarnings = schoolWarnings.get(s.code) || [];
      existingWarnings.push('招生数据存在断档，可能存在招生计划变化');
      schoolWarnings.set(s.code, existingWarnings);
    }
  }
  
  const sorted = withRefScore.sort((a, b) => b.refScore - a.refScore);
  
  const withRankAnalysis = await Promise.all(sorted.map(async s => {
    const rankAnalysis = await analyzeRank(baseScore, s.refScore, province);
    const tier = getSmartTier(baseScore, s.refScore, rankAnalysis, strategyConfig, province, scoreRange);
    return {
      ...s,
      tier,
      rankAnalysis,
    };
  }));
  
  const chong = withRankAnalysis
    .filter(s => s.tier === '冲')
    .sort((a, b) => b.refScore - a.refScore);
  
  const wen = withRankAnalysis
    .filter(s => s.tier === '稳')
    .sort((a, b) => Math.abs(a.refScore - baseScore) - Math.abs(b.refScore - baseScore));
  
  const bao = withRankAnalysis
    .filter(s => s.tier === '保')
    .sort((a, b) => a.refScore - b.refScore);
  
  let chongCount = Math.min(Math.ceil(totalVolunteers * strategyConfig.chongRatio), chong.length);
  let wenCount = Math.min(Math.ceil(totalVolunteers * strategyConfig.wenRatio), wen.length);
  let baoCount = Math.max(0, totalVolunteers - chongCount - wenCount);

  const counts = { chong: chongCount, wen: wenCount, bao: baoCount };
  const pools = { chong: chong.length, wen: wen.length, bao: bao.length };

  if (counts.bao > pools.bao) {
    const extra = counts.bao - pools.bao;
    counts.bao = pools.bao;
    transferOverflow(extra, ['wen', 'chong'], counts, pools);
  }

  if (counts.wen > pools.wen) {
    const extra = counts.wen - pools.wen;
    counts.wen = pools.wen;
    transferOverflow(extra, ['chong', 'bao'], counts, pools);
  }

  if (counts.chong > pools.chong) {
    const extra = counts.chong - pools.chong;
    counts.chong = pools.chong;
    transferOverflow(extra, ['wen', 'bao'], counts, pools);
  }

  const currentTotal = counts.chong + counts.wen + counts.bao;
  if (currentTotal < totalVolunteers) {
    const deficit = totalVolunteers - currentTotal;
    transferOverflow(deficit, ['bao', 'wen', 'chong'], counts, pools);
  }

  chongCount = counts.chong;
  wenCount = counts.wen;
  baoCount = counts.bao;
  
  const result: VolunteerResult[] = [];
  let index = 1;
  
  const processedSchoolGroups = new Set<string>();
  
  for (const s of chong.slice(0, chongCount)) {
    const groupKey = `${s.code}_${s.name}`;
    if (processedSchoolGroups.has(groupKey)) {
      continue;
    }
    processedSchoolGroups.add(groupKey);
    
    const schoolNameKey = extractSchoolNameKey(s.name);
    const majorRecs = await generateMajorRecommendations(s.name, baseScore, s.refScore, s.level, selectedSubjects, province);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const batchLine = getBatchLine(province, 2025, s.subject);
    const scoreAboveBatch = batchLine !== null ? s.refScore - batchLine : null;
    
    const probResult = calculateComprehensiveAdmissionProbability(
      baseScore, s.refScore, s.score2025, s.score2024, s.score2023, province, s.rankAnalysis, batchLine
    );
    
    const warnings = schoolWarnings.get(s.code) || [];
    
    if (scoreAboveBatch !== null && scoreAboveBatch < 0) {
      warnings.push(`低于批次线${Math.abs(scoreAboveBatch)}分`);
    }
    
    if (baseScore < (batchLine || 0)) {
      warnings.push(`考生分数低于批次线${Math.abs(baseScore - (batchLine || 0))}分，录取风险极高`);
    }
    
    const riskFactors: string[] = [];
    if (s.tier === '冲') riskFactors.push('冲刺志愿');
    if (trendAnalysis.trend === 'up') riskFactors.push('分数上涨趋势');
    if (trendAnalysis.volatility > 10) riskFactors.push('分数波动较大');
    if (probResult.probability < 30) riskFactors.push('录取概率低');
    if (s.score2025 === null || s.score2024 === null) riskFactors.push('数据不完整');
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 3 || probResult.probability < 20 || baseScore < (batchLine || 0)) {
      riskLevel = 'high';
    } else if (riskFactors.length >= 2 || probResult.probability < 40) {
      riskLevel = 'medium';
    }
    
    const majorSpread = majorRecs.length >= 2 
      ? Math.max(...majorRecs.map(m => m.estimatedScore)) - Math.min(...majorRecs.map(m => m.estimatedScore))
      : null;
    
    const admissionGap = s.score2025 !== null && s.score2024 !== null 
      ? s.score2025 - s.score2024
      : null;
    
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      schoolName: schoolNameKey,
      website: getUniversityWebsite(s.name),
      subject: s.subject,
      subjectText: parseSubjectRequirement(s.subject),
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
      batchLine,
      scoreAboveBatch,
      warnings,
      riskLevel,
      riskFactors,
      majorSpread,
      admissionGap,
    });
    index++;
  }
  
  for (const s of wen.slice(0, wenCount)) {
    const groupKey = `${s.code}_${s.name}`;
    if (processedSchoolGroups.has(groupKey)) {
      continue;
    }
    processedSchoolGroups.add(groupKey);
    
    const schoolNameKey = extractSchoolNameKey(s.name);
    const majorRecs = await generateMajorRecommendations(s.name, baseScore, s.refScore, s.level, selectedSubjects, province);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const batchLine = getBatchLine(province, 2025, s.subject);
    const scoreAboveBatch = batchLine !== null ? s.refScore - batchLine : null;
    
    const probResult = calculateComprehensiveAdmissionProbability(
      baseScore, s.refScore, s.score2025, s.score2024, s.score2023, province, s.rankAnalysis, batchLine
    );
    
    const warnings = schoolWarnings.get(s.code) || [];
    
    if (scoreAboveBatch !== null && scoreAboveBatch < 0) {
      warnings.push(`低于批次线${Math.abs(scoreAboveBatch)}分`);
    }
    
    if (baseScore < (batchLine || 0)) {
      warnings.push(`考生分数低于批次线${Math.abs(baseScore - (batchLine || 0))}分，录取风险极高`);
    }
    
    const riskFactors: string[] = [];
    if (s.tier === '冲') riskFactors.push('冲刺志愿');
    if (trendAnalysis.trend === 'up') riskFactors.push('分数上涨趋势');
    if (trendAnalysis.volatility > 10) riskFactors.push('分数波动较大');
    if (probResult.probability < 30) riskFactors.push('录取概率低');
    if (s.score2025 === null || s.score2024 === null) riskFactors.push('数据不完整');
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 3 || probResult.probability < 20 || baseScore < (batchLine || 0)) {
      riskLevel = 'high';
    } else if (riskFactors.length >= 2 || probResult.probability < 40) {
      riskLevel = 'medium';
    }
    
    const majorSpread = majorRecs.length >= 2 
      ? Math.max(...majorRecs.map(m => m.estimatedScore)) - Math.min(...majorRecs.map(m => m.estimatedScore))
      : null;
    
    const admissionGap = s.score2025 !== null && s.score2024 !== null 
      ? s.score2025 - s.score2024
      : null;
    
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      schoolName: schoolNameKey,
      website: getUniversityWebsite(s.name),
      subject: s.subject,
      subjectText: parseSubjectRequirement(s.subject),
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
      batchLine,
      scoreAboveBatch,
      warnings,
      riskLevel,
      riskFactors,
      majorSpread,
      admissionGap,
    });
    index++;
  }
  
  for (const s of bao.slice(0, baoCount)) {
    const groupKey = `${s.code}_${s.name}`;
    if (processedSchoolGroups.has(groupKey)) {
      continue;
    }
    processedSchoolGroups.add(groupKey);
    
    const schoolNameKey = extractSchoolNameKey(s.name);
    const majorRecs = await generateMajorRecommendations(s.name, baseScore, s.refScore, s.level, selectedSubjects, province);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const batchLine = getBatchLine(province, 2025, s.subject);
    const scoreAboveBatch = batchLine !== null ? s.refScore - batchLine : null;
    
    const probResult = calculateComprehensiveAdmissionProbability(
      baseScore, s.refScore, s.score2025, s.score2024, s.score2023, province, s.rankAnalysis, batchLine
    );
    
    const warnings = schoolWarnings.get(s.code) || [];
    
    if (scoreAboveBatch !== null && scoreAboveBatch < 0) {
      warnings.push(`低于批次线${Math.abs(scoreAboveBatch)}分`);
    }
    
    if (baseScore < (batchLine || 0)) {
      warnings.push(`考生分数低于批次线${Math.abs(baseScore - (batchLine || 0))}分，录取风险极高`);
    }
    
    const riskFactors: string[] = [];
    if (s.tier === '冲') riskFactors.push('冲刺志愿');
    if (trendAnalysis.trend === 'up') riskFactors.push('分数上涨趋势');
    if (trendAnalysis.volatility > 10) riskFactors.push('分数波动较大');
    if (probResult.probability < 30) riskFactors.push('录取概率低');
    if (s.score2025 === null || s.score2024 === null) riskFactors.push('数据不完整');
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 3 || probResult.probability < 20 || baseScore < (batchLine || 0)) {
      riskLevel = 'high';
    } else if (riskFactors.length >= 2 || probResult.probability < 40) {
      riskLevel = 'medium';
    }
    
    const majorSpread = majorRecs.length >= 2 
      ? Math.max(...majorRecs.map(m => m.estimatedScore)) - Math.min(...majorRecs.map(m => m.estimatedScore))
      : null;
    
    const admissionGap = s.score2025 !== null && s.score2024 !== null 
      ? s.score2025 - s.score2024
      : null;
    
    result.push({
      index,
      tier: s.tier,
      code: s.code,
      name: s.name,
      schoolName: schoolNameKey,
      website: getUniversityWebsite(s.name),
      subject: s.subject,
      subjectText: parseSubjectRequirement(s.subject),
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
      batchLine,
      scoreAboveBatch,
      warnings,
      riskLevel,
      riskFactors,
      majorSpread,
      admissionGap,
    });
    index++;
  }
  
  return result;
}

function extractSchoolName(schoolName: string): string {
  const match = schoolName.match(/^(.+?)(?:\(\d+\))?$/);
  return match ? match[1].trim() : schoolName.trim();
}

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

function getMajorTierByScore(
  majorScore: number,
  baseScore: number,
  chongDiff: number,
  wenDiff: number,
  province: string = '海南',
  scoreRange: number = 15
): '冲' | '稳' | '保' {
  const diff = majorScore - baseScore;
  const isHighScoreSystem = ['海南'].includes(province);
  
  const effectiveRange = isHighScoreSystem ? scoreRange * 2 : scoreRange;
  
  const adjustedChongDiff = Math.min(isHighScoreSystem ? chongDiff * 2 : chongDiff, effectiveRange);
  const adjustedWenDiff = Math.min(isHighScoreSystem ? wenDiff * 2 : wenDiff, effectiveRange * 0.5);
  
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
  
  const isHighScoreSystem = ['海南'].includes(province);
  const effectiveRange = isHighScoreSystem ? scoreRange * 2 : scoreRange;
  
  for (const result of results) {
    try {
      const schoolName = extractSchoolName(result.name);
      const schoolRefScore = result.refScore || 0;
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
      
      let matched: MajorScore[];
      
      if (result.tier === '保') {
        matched = filteredMajors.filter(major => {
          const score = major.min_score || 0;
          return score >= baseScore - effectiveRange * 2 && score <= baseScore;
        });
      } else if (result.tier === '稳') {
        matched = filteredMajors.filter(major => {
          const score = major.min_score || 0;
          return score >= baseScore - effectiveRange && score <= baseScore + effectiveRange;
        });
      } else {
        matched = filteredMajors.filter(major => {
          const score = major.min_score || 0;
          return score >= baseScore - effectiveRange * 0.5 && score <= baseScore + effectiveRange * 1.5;
        });
      }
      
      matched.forEach(major => {
        const score = major.min_score || 0;
        major.admission_probability = getMajorAdmissionProbability(score, baseScore, province);
        major.tier = getMajorTierByScore(score, baseScore, chongDiff, wenDiff, province, scoreRange);
      });
      
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
      
      let strategyMatched: MajorScore[] = [];
      const chongMajors = matched.filter(m => m.tier === '冲');
      const wenMajors = matched.filter(m => m.tier === '稳');
      const baoMajors = matched.filter(m => m.tier === '保');
      
      if (result.tier === '冲') {
        chongMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        wenMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        strategyMatched = [...chongMajors, ...wenMajors];
      } else if (result.tier === '稳') {
        wenMajors.sort((a, b) => Math.abs((a.min_score || 0) - baseScore) - Math.abs((b.min_score || 0) - baseScore));
        baoMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        strategyMatched = [...wenMajors, ...baoMajors];
      } else if (result.tier === '保') {
        baoMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        wenMajors.sort((a, b) => (b.min_score || 0) - (a.min_score || 0));
        strategyMatched = [...baoMajors, ...wenMajors];
      } else {
        strategyMatched = [...matched];
      }
      
      if (strategyMatched.length === 0) {
        strategyMatched = [...matched];
      }
      
      const uniqueMajors = deduplicateMajors(strategyMatched);
      const limitedMajors = uniqueMajors.slice(0, 6);
      
      result.matchedMajors = limitedMajors;
      
      if (limitedMajors.length > 0) {
        result.majorSuggestion = limitedMajors.slice(0, 3).map(m => m.major_name).join('、') || result.majorSuggestion;
      }
      
      const majorWarnings: string[] = [];
      if (limitedMajors.length === 0) {
        majorWarnings.push('无匹配专业');
      } else {
        const allMajorsMatch = limitedMajors.every(m => 
          !m.subject_requirement || isSubjectMatch(selectedSubjects, m.subject_requirement)
        );
        if (!allMajorsMatch && selectedSubjects.length > 0) {
          majorWarnings.push('部分专业选科要求不匹配');
        }
      }
      
      if (majorWarnings.length > 0) {
        result.warnings = [...result.warnings, ...majorWarnings];
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
    { key: 'subject', width: 15 },
    { key: 'score2025', width: 12 },
    { key: 'score2024', width: 12 },
    { key: 'score2023', width: 12 },
    { key: 'majors', width: 60 },
    { key: 'reason', width: 50 },
    { key: 'warnings', width: 50 },
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
    '科目要求', '2025投档线', '2024投档线', '2023投档线', '推荐专业', '推荐理由', '警告信息',
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
    const warningsText = v.warnings?.length > 0 ? v.warnings.join('; ') : '';
    
    const row = mainSheet.addRow([
      v.index,
      v.tier,
      `${v.admissionProbability}%`,
      v.level,
      v.province,
      v.code,
      v.name,
      v.subjectText,
      v.score2025 ?? '',
      v.score2024 ?? '',
      v.score2023 ?? '',
      majorsText,
      v.reason,
      warningsText,
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
       '推荐理由', '警告信息'],
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
      const warningsText = v.warnings?.length > 0 ? v.warnings.join('; ') : '';
      
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
        v.subjectText,
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
        warningsText,
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
      { wch: 15 },
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
      { wch: 50 },
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '志愿方案');
    
    XLSX.writeFile(workbook, filename);
  });
}