// xlsx / exceljs 为重型依赖，仅在导入/导出场景按需动态加载，
// 避免打进主包导致首屏 JS 体积过大
import { getRefScore, getRecommendationReason, matchMajorCategories, isSubjectMatch, parseSubjectRequirement } from './dataUtils';
import type { SchoolScore, MajorRecommendation } from './dataUtils';
import { generateMajorRecommendations, formatMajorSuggestion } from './majorRecommender';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { calculateTrendAnalysis } from './trendAnalyzer';
import { STRATEGY_CONFIGS, type StrategyType } from '../config/strategyConfig';
import { calibrateProbability } from '../config/probabilityCalibration';
import { ADMISSION_YEARS, REFERENCE_YEAR, SCORE_DISTRIBUTION_YEARS, resolveDistributionYear } from '../config/examYearConfig';
import { scoreDistributionService, type ScoreDistribution } from '../services/scoreDistributionService';
import { getUniversityWebsite } from '../data/universityWebsites';
export type { SchoolScore, MajorRecommendation };

export function extractSchoolNameKey(schoolName: string): string {
  const cleaned = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  return cleaned;
}

/**
 * 提取专业组序号，用于把专业分数精确挂到对应的“院校专业组”。
 * 招生数据里组的写法不统一："西安邮电大学(80)"、"专业组（01）"、"080"，
 * 统一解析为去掉前导 0 的数字字符串（"80"、"1"），避免 01 与 1 误判为不同组。
 */
function parseGroupNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/[（(]\s*(\d{1,3})\s*[）)]/);
  if (!match) return null;
  return String(parseInt(match[1], 10));
}

/**
 * 专业记录的专业组号：优先用 major_group 字段；该字段缺失时从
 * subject_requirement 的“专业组（02） - 必选物理”前缀中提取。
 * 数据库中约八成记录 major_group 为空，只用该字段会让专业组匹配大范围失效。
 */
function getMajorGroupNumber(major: { major_group: string | null; subject_requirement: string | null }): string | null {
  return parseGroupNumber(major.major_group) ?? parseGroupNumber(major.subject_requirement);
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
  score2026: number | null;
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

const PROVINCE_BATCH_LINES: Record<string, Record<number, number>> = {
  // 海南普通类只有一个本科批分数线，不做物理/历史拆分。
  // 各院校投档线已统一折算到等效分基准年（REFERENCE_YEAR）口径，批次线必须同口径才有可比性：
  // 2025 本科线 480 分对应位次 43089，而目标年该位次对应约 486 分
  // （考生规模更大），故目标年按 2025 本科线折算预估为 486。
  // 2025 为官方 480（特招线 568），2024/2023 为官方 483。
  '海南': {
    [REFERENCE_YEAR]: 486,
    2025: 480,
    2024: 483,
    2023: 483,
  },
  '天津': {
    [REFERENCE_YEAR]: 547,
    2025: 547,
    2024: 547,
    2023: 532,
  },
};

function isHighScoreSystem(province: string): boolean {
  return HIGH_SCORE_PROVINCES.includes(province);
}

function getTotalCandidates(province: string): number {
  return PROVINCE_TOTAL_CANDIDATES[province] || 70000;
}

function getBatchLine(province: string, year: number, _subject: number): number | null {
  return PROVINCE_BATCH_LINES[province]?.[year] ?? null;
}

function lookupRankRange(rows: ScoreDistribution[], score: number): { minRank: number; maxRank: number; count: number; cumulativeCount: number } | null {
  if (!rows || rows.length === 0) return null;
  
  const exact = rows.find(r => r.score === score);
  if (exact) {
    return {
      minRank: exact.min_rank,
      maxRank: exact.max_rank,
      count: exact.count,
      cumulativeCount: exact.cumulative_count,
    };
  }
  
  // rows 按分数降序排列：取不低于目标分的最近一段，其累计人数可作为位次上界
  const above = rows.filter(r => r.score >= score).slice(-1)[0];
  if (above) {
    return {
      minRank: above.min_rank,
      maxRank: above.max_rank,
      count: above.count,
      cumulativeCount: above.cumulative_count,
    };
  }
  
  const below = rows[0];
  if (!below) return null;
  return {
    minRank: below.min_rank,
    maxRank: below.max_rank,
    count: below.count,
    cumulativeCount: below.cumulative_count,
  };
}

/**
 * 把某一年的投档分换算为目标年等效分：
 * 先用该年一分一段表求出位次，再在目标年一分一段表中按位次反查分数。
 * 这样历史年份整体偏难/偏易造成的分数差异会被校正，
 * 避免直接拿不同年份的分差做冲稳保判断。
 */
export function convertScoreToEquivalent(
  score: number | null,
  fromYear: number,
  distributions: Partial<Record<number, ScoreDistribution[]>>,
  targetYear: number = REFERENCE_YEAR
): number | null {
  if (score === null || score <= 0) return null;
  if (fromYear === targetYear) return score;

  const source = distributions[fromYear];
  const target = distributions[targetYear];
  if (!source || source.length === 0 || !target || target.length === 0) return score;

  const sourceInfo = lookupRankRange(source, score);
  if (!sourceInfo) return score;

  // target 按分数降序、累计人数递增，找到第一个累计人数不小于该位次的分数段
  const rank = sourceInfo.cumulativeCount;
  for (const row of target) {
    if (row.cumulative_count >= rank) return row.score;
  }
  return target[target.length - 1]?.score ?? score;
}

/**
 * 用已加载的一分一段表在内存中计算位次，避免为每个院校专业组重复查询数据库。
 * 一次生成可能涉及上千个专业组，逐个查询会带来明显等待。
 */
export function buildRankAnalysis(
  candidateScore: number,
  schoolScore: number,
  rows: ScoreDistribution[],
  province: string
): RankAnalysis | null {
  const candidateInfo = lookupRankRange(rows, candidateScore);
  const schoolInfo = lookupRankRange(rows, schoolScore);
  
  if (!candidateInfo || !schoolInfo) {
    return estimateRank(candidateScore, schoolScore, province);
  }
  
  const candidateRank = candidateInfo.maxRank;
  const schoolRank = schoolInfo.maxRank;
  const totalCandidates = rows[rows.length - 1]?.cumulative_count
    || candidateInfo.cumulativeCount
    || getTotalCandidates(province);
  
  // rankDiff = 学校投档位次 - 考生位次
  // 大于 0：学校投档位次更靠后（更容易），考生占优；小于 0：学校更难。
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
}

export async function analyzeRank(
  candidateScore: number,
  schoolScore: number,
  province: string,
  year: number = REFERENCE_YEAR
): Promise<RankAnalysis | null> {
  try {
    const is3Plus3Mode = ['海南', '天津', '北京', '上海', '山东', '浙江'].includes(province);
    const category = is3Plus3Mode ? '普通类' : undefined;

    const rows = typeof scoreDistributionService.getByProvinceAndYear === 'function'
      ? await scoreDistributionService.getByProvinceAndYear(province, year, category)
      : [];
    const analysis = buildRankAnalysis(candidateScore, schoolScore, rows, province);
    if (analysis) return analysis;

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
  schoolScoreLatest: number | null,
  schoolScorePrevious: number | null,
  schoolScoreOldest: number | null,
  province: string,
  rankAnalysis: RankAnalysis | null,
  batchLine: number | null
): { probability: number; rawProbability: number; factors: { scoreFactor: number; rankFactor: number; trendFactor: number; volatilityFactor: number; batchFactor: number } } {
  const isHighScore = isHighScoreSystem(province);
  const scoreDiff = candidateScore - schoolRefScore;

  // 海南为标准分（900分制），分差与位次的换算关系与普通省份不同：
  // 15分左右的差距已对应上千个位次，因此使用更细的分档，避免出现
  // “判为保底、概率却只有50%”的自相矛盾。
  const diffThresholds = isHighScore
    ? [60, 45, 35, 25, 18, 12, 6, 0, -6, -12, -18, -25, -35, -45, -60]
    : [30, 25, 20, 15, 10, 5, 0, -5, -10, -15, -20, -25, -30];
  const factorValues = isHighScore
    ? [99, 97, 94, 88, 80, 72, 62, 50, 40, 32, 24, 16, 10, 5, 2]
    : [99, 97, 94, 88, 78, 65, 50, 38, 28, 18, 12, 8, 5, 2];

  // 分差到概率的映射改为分段线性插值，而不是“命中即取值”的阶梯。
  // 原来的 6 分一档会让 1 分之差产生约 10 个百分点的跳变，
  // 档位边界附近同一所学校可能因小数点差异被分到完全不同的档。
  let scoreFactor = factorValues[factorValues.length - 1];
  if (scoreDiff >= diffThresholds[0]) {
    scoreFactor = factorValues[0];
  } else {
    for (let i = 1; i < diffThresholds.length; i++) {
      if (scoreDiff >= diffThresholds[i]) {
        const upperDiff = diffThresholds[i - 1];
        const lowerDiff = diffThresholds[i];
        const upperValue = factorValues[i - 1];
        const lowerValue = factorValues[i];
        const ratio = (scoreDiff - lowerDiff) / (upperDiff - lowerDiff);
        scoreFactor = lowerValue + (upperValue - lowerValue) * ratio;
        break;
      }
    }
  }

  let rankFactor = scoreFactor;
  if (rankAnalysis && rankAnalysis.totalCandidates > 0) {
    // rankDiff > 0 表示学校投档位次比考生更靠后（考生占优），此时应提高概率。
    // 此前符号判断正好相反，导致“位次占优”反而被扣分。
    const rankRatio = rankAnalysis.rankDiff / rankAnalysis.totalCandidates;
    const rankProbability = 50 + Math.max(-45, Math.min(45, rankRatio * 1000));
    rankFactor = Math.max(2, Math.min(99, rankProbability));
  }

  let batchFactor = 1.0;
  if (batchLine !== null && candidateScore < batchLine) {
    // 低于本科批线时无法投档到本科普通批，概率需要明显下调
    batchFactor = Math.max(0.35, 1.0 - (batchLine - candidateScore) / 200);
  }

  const trendAnalysis = calculateTrendAnalysis(schoolScoreLatest, schoolScorePrevious, schoolScoreOldest);
  const trendFactor = trendAnalysis.trendCoefficient;

  // 历史达标率：近三年中有几年考生分数能超过该专业组投档线。
  // 这是对“加权参考分”的补充：同样分差下，三年都达线与仅一年达线的
  // 录取确定性完全不同，从而把三年数据真正用起来，而不是只取一个参考分。
  const yearlyScores = [schoolScoreLatest, schoolScorePrevious, schoolScoreOldest]
    .filter((score): score is number => score !== null && score > 0);
  const historyFactor = yearlyScores.length >= 2
    ? 10 + (yearlyScores.filter(score => candidateScore >= score).length / yearlyScores.length) * 89
    : null;

  // 波动系数只对“分数接近投档线”的院校生效：分差很大时，历史波动
  // 不应继续压低保底院校的概率，否则会把稳定的保底误判为“冲”。
  const proximity = Math.max(0, Math.min(1, 1 - Math.abs(scoreDiff) / 40));
  const volatilityFactor = 1 - (1 - trendAnalysis.volatilityCoefficient) * proximity;

  // 分数、位次、历史达标率三者加权，权重之和为 1。
  let combinedScoreFactor: number;
  if (rankAnalysis && historyFactor !== null) {
    combinedScoreFactor = scoreFactor * 0.45 + rankFactor * 0.25 + historyFactor * 0.30;
  } else if (rankAnalysis) {
    combinedScoreFactor = scoreFactor * 0.6 + rankFactor * 0.4;
  } else if (historyFactor !== null) {
    combinedScoreFactor = scoreFactor * 0.6 + historyFactor * 0.4;
  } else {
    // 仅有一年投档数据：不确定性较大，概率向 50% 收缩，
    // 避免把“无历史参考”的专业组显示成 99% 保底。
    combinedScoreFactor = 50 + (scoreFactor - 50) * 0.85;
  }

  const finalProbability = Math.max(
    2,
    Math.min(99, combinedScoreFactor * trendFactor * volatilityFactor * batchFactor)
  );

  // 回测显示原始概率在中低区间偏乐观（如原始 43% 实际命中 33%），
  // 因此按省份校准表把“模型概率”映射为“历史真实命中率”，档位判断也使用校准后的值。
  const calibratedProbability = calibrateProbability(finalProbability, province);

  return {
    probability: Math.round(calibratedProbability),
    // 校准前的模型原始概率：回测脚本用它重新拟合校准锚点，
    // 若直接拿校准后的概率再拟合会造成二次校准。
    rawProbability: Math.round(finalProbability * 10) / 10,
    factors: {
      scoreFactor: Math.round(scoreFactor),
      rankFactor: Math.round(rankFactor),
      trendFactor,
      volatilityFactor,
      batchFactor: Math.round(batchFactor * 100) / 100,
    },
  };
}

/**
 * 在候选池中等距抽样，覆盖整个概率区间。
 * 直接取排序后的前 N 条会让“冲”全部堆在最难的一端、“稳”全部挤在 50% 附近，
 * 方案缺乏梯度，也不符合实际填报中“远近结合”的做法。
 *
 * 同时限制同一院校入选的专业组数量：30 个志愿若被两三所学校的多个组占满，
 * 方案就失去了“多校备选”的参考价值。遇到同校超限时，在等距目标位置附近
 * 就近替换，尽量保持原有的概率覆盖。
 */
const MAX_GROUPS_PER_SCHOOL = 2;

function pickSpread<T extends { code: string; name: string }>(
  arr: T[],
  count: number,
  maxPerSchool: number = MAX_GROUPS_PER_SCHOOL,
  schoolCounts: Map<string, number> = new Map()
): T[] {
  if (count <= 0 || arr.length === 0) return [];
  if (count >= arr.length) return arr.slice();

  const targetIndices: number[] = [];
  if (count === 1) {
    targetIndices.push(Math.floor(arr.length / 2));
  } else {
    const step = (arr.length - 1) / (count - 1);
    for (let i = 0; i < count; i++) targetIndices.push(Math.round(i * step));
  }

  const picked: T[] = [];
  const used = new Set<number>();

  for (const target of targetIndices) {
    let chosen = -1;
    for (let offset = 0; offset < arr.length; offset++) {
      const candidates = offset === 0 ? [target] : [target + offset, target - offset];
      for (const idx of candidates) {
        if (idx < 0 || idx >= arr.length || used.has(idx)) continue;
        const key = extractSchoolNameKey(arr[idx].name);
        if ((schoolCounts.get(key) ?? 0) >= maxPerSchool) continue;
        chosen = idx;
        break;
      }
      if (chosen >= 0) break;
    }
    if (chosen < 0) break;
    used.add(chosen);
    picked.push(arr[chosen]);
    const key = extractSchoolNameKey(arr[chosen].name);
    schoolCounts.set(key, (schoolCounts.get(key) ?? 0) + 1);
  }

  // 院校数量不足以满足上限时，回退补齐，保证志愿总数不被无故削减
  if (picked.length < count) {
    for (let i = 0; i < arr.length && picked.length < count; i++) {
      if (used.has(i)) continue;
      used.add(i);
      picked.push(arr[i]);
      const key = extractSchoolNameKey(arr[i].name);
      schoolCounts.set(key, (schoolCounts.get(key) ?? 0) + 1);
    }
  }

  return picked;
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
      // rankDiff < 0：学校投档位次更靠前（更难）→ 需要冲
      if (rankDiffPercent > 10 && rankAnalysis.rankDiff < 0) {
        tier = '冲';
      } else if (rankDiffPercent > 10 && rankAnalysis.rankDiff > 0) {
        tier = '保';
      }
    } else if (tier === '冲') {
      if (rankDiffPercent <= 3 && rankAnalysis.rankDiff > 0) {
        tier = '稳';
      }
    } else if (tier === '保') {
      if (rankDiffPercent <= 3 && rankAnalysis.rankDiff < 0) {
        tier = '稳';
      }
    }
  }

  return tier;
}

export async function loadSchoolDataFromExcel(file: File): Promise<SchoolScore[]> {
  const arrayBuffer = await file.arrayBuffer();
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer);
  
  const result: SchoolScore[] = [];
  
  const sheets = [...ADMISSION_YEARS].sort((a, b) => b - a).map(String);

  const assignScore = (target: SchoolScore, year: number, score: number) => {
    if (year === 2026) target.score2026 = score;
    else if (year === 2025) target.score2025 = score;
    else if (year === 2024) target.score2024 = score;
    else if (year === 2023) target.score2023 = score;
  };
  
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
        assignScore(existing, year, score);
      } else {
        const item: SchoolScore = {
          code,
          name,
          subject,
          subject_requirement: null,
          province: '其他',
          level: '普通本科',
          nature: '公办',
          region: '海南',
          score2026: null,
          score2025: null,
          score2024: null,
          score2023: null,
        };
        assignScore(item, year, score);
        result.push(item);
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
    let hasRequirement = false;
    
    if (school.subject_requirement) {
      hasRequirement = true;
      if (isSubjectMatch(selectedSubjects, school.subject_requirement)) {
        matched = true;
      } else {
        warnings.push(`选科要求不匹配：${school.subject_requirement}`);
      }
    } else if (school.subject !== undefined && school.subject !== null && school.subject !== 0) {
      hasRequirement = true;
      if (isSubjectMatch(selectedSubjects, school.subject)) {
        matched = true;
      } else {
        warnings.push(`选科代码不匹配：${school.subject}`);
      }
    }
    
    if (hasRequirement && !matched) {
      return { valid: false, warnings };
    } else if (!hasRequirement) {
      warnings.push('选科要求数据缺失，建议谨慎填报');
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
    // 当前单省数据源中所有院校的 province 都等于招生省份，并不代表院校所在地。
    // 仅当数据确实包含多省份（院校所在地）信息时才应用该筛选，避免用户选择“北京”后结果为空。
    const provinceValues = new Set(schools.map(s => s.province));
    if (provinceValues.size > 1) {
      filtered = filtered.filter(s => selectedProvinces.includes(s.province));
    }
  }
  
  if (selectedMajorCategories.length > 0) {
    filtered = filtered.filter(s => {
      const categories = matchMajorCategories(s.name);
      return selectedMajorCategories.some(cat => categories.includes(cat));
    });
  }
  
  const isHighScore = isHighScoreSystem(province);
  const effectiveRange = isHighScore ? scoreRange * 2 : scoreRange;
  
  // 只有用户明确选择了专业/排除了专业时才需要全量专业分数线数据。
  // 此前无条件拉取全省 1.7 万条专业记录（约 36 次分页请求），是生成方案缓慢的主要原因。
  let schoolsWithValidMajors = new Set<string>();
  
  if (selectedMajors.length > 0 || excludedMajors.length > 0) {
    const allProvinceMajors = await majorScoreService.getByProvince(province);
    
    const validMajors = allProvinceMajors.filter(major => {
      if (!major.min_score) return false;
      
      if (major.province !== province) return false;
      
      if (major.min_score > baseScore + effectiveRange) {
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
    
    validMajors.forEach(major => {
      if (major.school_name) {
        schoolsWithValidMajors.add(extractSchoolNameKey(major.school_name));
      }
    });
  }

  // 一分一段表只加载一次：目标年用于位次计算，历史年份用于跨年等效分换算。
  // 此前只用目标年一分一段表、直接用历年原始分做比较，遇到某年整体偏难/偏易
  // 就会系统性高估或低估录取概率；导入历年分布后即可按位次折算。
  const distributions: Partial<Record<number, ScoreDistribution[]>> = {};
  try {
    if (typeof scoreDistributionService.getByProvinceAndYear === 'function') {
      const loaded = await Promise.all(
        SCORE_DISTRIBUTION_YEARS.map(async year => [
          year,
          await scoreDistributionService.getByProvinceAndYear(province, year, '普通类'),
        ] as const)
      );
      for (const [year, rows] of loaded) distributions[year] = rows;
      if (import.meta.env.DEV) {
        console.log(
          `[filterSchoolsWithMajors] 一分一段表: ${loaded.map(([year, rows]) => `${year}=${rows.length}`).join(', ')}`
        );
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[filterSchoolsWithMajors] 一分一段表加载失败，使用估算位次:', error);
  }

  // 缺失官方分布的年份（如 2023）按配置回退到相邻年份近似换算
  const toEquivalent = (score: number | null, year: number): number | null =>
    convertScoreToEquivalent(score, resolveDistributionYear(year), distributions, REFERENCE_YEAR);

  // 保底深度约束：候选池不再无限向下延伸。
  // 900 分制下 20 分已对应上千个位次，保底过深（如 600 分考生出现 488 分的组）
  // 既挤占名额，也让方案层次失真；因此设下界，让保底集中在考生下方 15–30 分区间。
  const lowerBoundGap = isHighScore
    ? Math.max(effectiveRange, 25)
    : Math.max(effectiveRange, 15);

  const scoredSchools = filtered.map(s => ({
    school: s,
    refScore: getRefScore(
      toEquivalent(s.score2026 ?? null, 2026),
      toEquivalent(s.score2025, 2025),
      toEquivalent(s.score2024, 2024)
    ),
  }));

  const upperBounded = scoredSchools.filter(item => item.refScore <= baseScore + effectiveRange);
  const depthBounded = upperBounded.filter(item => item.refScore >= baseScore - lowerBoundGap);

  // 高分考生可选院校本身较少时，按倍数逐步放宽下界，直到候选池够填满志愿，
  // 既避免方案为空，也避免一次性放开后保底直接沉到 500 分附近。
  let candidateGap = lowerBoundGap;
  let candidatePool = depthBounded;
  while (candidatePool.length < totalVolunteers && candidateGap < 1000) {
    candidateGap *= 2;
    candidatePool = upperBounded.filter(item => item.refScore >= baseScore - candidateGap);
  }
  const inRange = candidatePool.map(item => item.school);

  // 仅当用户明确指定了专业偏好（选择专业/排除专业）时，才要求院校必须拥有专业分数线数据。
  // 否则不能因为“缺少专业数据”而静默丢弃大量院校：当前数据中仅约 39% 的院校有专业分数。
  const requiresMajorData = selectedMajors.length > 0 || excludedMajors.length > 0;
  const useMajorFilter = requiresMajorData && schoolsWithValidMajors.size > 0;

  let finalSchools = inRange;

  if (useMajorFilter) {
    finalSchools = inRange.filter(s => {
      const schoolNameKey = extractSchoolNameKey(s.name);
      return Array.from(schoolsWithValidMajors).some(
        sn => sn === schoolNameKey || sn.includes(schoolNameKey) || schoolNameKey.includes(sn)
      );
    });
  }
  
  // 参考分统一折算到目标年口径后再加权，保证不同年份之间可比：
  // 直接混合原始分会让某年整体偏难/偏易的分数把参考分拉偏，
  // 进而影响冲稳保分档和录取概率。
  const withRefScore = finalSchools.map(s => {
    const equivalentScores = {
      2026: toEquivalent(s.score2026 ?? null, 2026),
      2025: toEquivalent(s.score2025, 2025),
      2024: toEquivalent(s.score2024, 2024),
    };
    return {
      ...s,
      refScore: getRefScore(
        equivalentScores[2026],
        equivalentScores[2025],
        equivalentScores[2024]
      ),
      equivalentScores,
    };
  });
  
  for (const s of withRefScore) {
    const availableYears = [];
    if ((s.score2026 ?? null) !== null) availableYears.push(2026);
    if (s.score2025 !== null) availableYears.push(2025);
    if (s.score2024 !== null) availableYears.push(2024);
    
    if (availableYears.length < 2) {
      const existingWarnings = schoolWarnings.get(s.code) || [];
      existingWarnings.push(`仅有${availableYears[0] ?? ''}年投档数据，缺少历史趋势参考，建议谨慎填报`);
      schoolWarnings.set(s.code, existingWarnings);
    }
    
    const hasGap = availableYears.length >= 2 &&
      ((availableYears.includes(2026) && availableYears.includes(2024) && !availableYears.includes(2025)) ||
       (!availableYears.includes(2026) && availableYears.includes(2025) && availableYears.includes(2024)));
    if (hasGap) {
      const existingWarnings = schoolWarnings.get(s.code) || [];
      existingWarnings.push('招生数据存在断档，可能存在招生计划变化');
      schoolWarnings.set(s.code, existingWarnings);
    }
  }
  
  const sorted = withRefScore.sort((a, b) => b.refScore - a.refScore);
  
  // 复用前面已加载的基准年一分一段表，在内存中为所有专业组计算位次，
  // 避免对上千个专业组逐一发起数据库查询（此前生成方案的主要耗时来源）。
  const distribution: ScoreDistribution[] = distributions[REFERENCE_YEAR] ?? [];
  
  const withRankAnalysis = sorted.map(s => {
    const rankAnalysis = buildRankAnalysis(baseScore, s.refScore, distribution, province);
    const batchLine = getBatchLine(province, REFERENCE_YEAR, s.subject);
    const probResult = calculateComprehensiveAdmissionProbability(
      baseScore,
      s.refScore,
      s.equivalentScores[2026] ?? (s.score2026 ?? null),
      s.equivalentScores[2025] ?? s.score2025,
      s.equivalentScores[2024] ?? s.score2024,
      province,
      rankAnalysis,
      batchLine
    );
    // 档位与展示给用户的录取概率必须一致，阈值随策略变化：
    // 稳妥 ≥80% 保底 / 45% 稳妥；激进放宽到 75%/40%，保守收紧到 85%/55%。
    // 若只按分差硬编码，会出现“标成稳、概率却只有 40%”的矛盾结论。
    const tier: '冲' | '稳' | '保' = probResult.probability >= strategyConfig.baoThreshold
      ? '保'
      : probResult.probability >= strategyConfig.wenThreshold
      ? '稳'
      : '冲';
    return {
      ...s,
      tier,
      rankAnalysis,
      batchLine,
      probResult,
    };
  });
  
  // 冲档过滤：低于 10% 的组几乎不可能命中，直接剔除。
  // 概率 10%–15% 的组视为“彩票组”，最多保留 2 个，避免名额被低概率院校占满。
  const MIN_CHONG_PROBABILITY = 10;
  const LOTTERY_PROBABILITY = 15;
  const MAX_LOTTERY_GROUPS = 2;
  const chongAll = withRankAnalysis
    .filter(s => s.tier === '冲' && s.probResult.probability >= MIN_CHONG_PROBABILITY)
    .sort((a, b) => a.probResult.probability - b.probResult.probability);

  const lotteryGroups = chongAll.filter(s => s.probResult.probability < LOTTERY_PROBABILITY);
  const regularChong = chongAll.filter(s => s.probResult.probability >= LOTTERY_PROBABILITY);
  const chong = lotteryGroups.length > MAX_LOTTERY_GROUPS
    ? [...lotteryGroups.slice(-MAX_LOTTERY_GROUPS), ...regularChong]
        .sort((a, b) => a.probResult.probability - b.probResult.probability)
    : chongAll;
  
  const wen = withRankAnalysis
    .filter(s => s.tier === '稳')
    .sort((a, b) => a.probResult.probability - b.probResult.probability);
  
  const bao = withRankAnalysis
    .filter(s => s.tier === '保')
    .sort((a, b) => a.probResult.probability - b.probResult.probability);
  
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

  // 按 冲→稳→保 顺序收集待处理院校（与原实现序号顺序保持一致）
  // 冲→稳→保 三档共享同一个“每校计数”，确保整份方案中同一院校最多 2 个专业组
  const schoolCountsAcrossTiers = new Map<string, number>();
  const chongPick = pickSpread(chong, chongCount, MAX_GROUPS_PER_SCHOOL, schoolCountsAcrossTiers);
  const wenPick = pickSpread(wen, wenCount, MAX_GROUPS_PER_SCHOOL, schoolCountsAcrossTiers);
  const baoPick = pickSpread(bao, baoCount, MAX_GROUPS_PER_SCHOOL, schoolCountsAcrossTiers);
  const tierGroups: Array<{ tier: string; schools: typeof withRankAnalysis }> = [
    { tier: '冲', schools: chongPick },
    { tier: '稳', schools: wenPick },
    { tier: '保', schools: baoPick },
  ];

  const pendingSchools: typeof withRankAnalysis = [];
  for (const group of tierGroups) {
    for (const s of group.schools) {
      const groupKey = `${s.code}_${s.name}`;
      if (processedSchoolGroups.has(groupKey)) {
        continue;
      }
      processedSchoolGroups.add(groupKey);
      pendingSchools.push(s);
    }
  }

  // 并行完成所有志愿的异步计算（专业推荐、趋势、批次线、录取概率），
  // 相比原实现逐个 await 显著缩短生成方案的等待时间
  const prepared = await Promise.all(pendingSchools.map(async (s) => {
    const schoolNameKey = extractSchoolNameKey(s.name);
    const majorRecs = await generateMajorRecommendations(s.name, baseScore, s.refScore, s.level, selectedSubjects, province);
    // 趋势同样按基准年等效分计算：直接用历年的原始分比较，会把当年整体
    // 偏难/偏易造成的集体涨跌误读为该院校自身的分数趋势。
    const trendAnalysis = calculateTrendAnalysis(
      s.equivalentScores[2026] ?? (s.score2026 ?? null),
      s.equivalentScores[2025] ?? s.score2025,
      s.equivalentScores[2024] ?? s.score2024
    );
    const batchLine = s.batchLine;
    const scoreAboveBatch = batchLine !== null ? s.refScore - batchLine : null;
    const probResult = s.probResult;
    // 拷贝 warnings 副本，避免同一 code 多次出现时共享数组互相污染
    const warnings = [...(schoolWarnings.get(s.code) || [])];
    return { s, schoolNameKey, majorRecs, trendAnalysis, batchLine, scoreAboveBatch, probResult, warnings };
  }));

  for (const p of prepared) {
    const { s, schoolNameKey, majorRecs, trendAnalysis, batchLine, scoreAboveBatch, probResult, warnings } = p;

    if (baseScore < (batchLine || 0)) {
      warnings.push(`考生分数低于本科批线${Math.abs(baseScore - (batchLine || 0))}分，本科普通批录取风险极高`);
    }

    const riskFactors: string[] = [];
    if (s.tier === '冲') riskFactors.push('冲刺志愿');
    if (trendAnalysis.trend === 'up') riskFactors.push('分数上涨趋势');
    if (trendAnalysis.volatility > 10) riskFactors.push('分数波动较大');
    if (probResult.probability < 30) riskFactors.push('录取概率低');
    if ((s.score2026 ?? null) === null || s.score2025 === null) riskFactors.push('数据不完整');

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskFactors.length >= 3 || probResult.probability < 20 || baseScore < (batchLine || 0)) {
      riskLevel = 'high';
    } else if (riskFactors.length >= 2 || probResult.probability < 40) {
      riskLevel = 'medium';
    }

    const majorSpread = majorRecs.length >= 2
      ? Math.max(...majorRecs.map(m => m.estimatedScore)) - Math.min(...majorRecs.map(m => m.estimatedScore))
      : null;

    // 近两年分差同样用等效分，避免把年度难度变化误算成院校波动
    const eq2025 = s.equivalentScores[2025];
    const eq2024 = s.equivalentScores[2024];
    const eq2026 = s.equivalentScores[2026];
    const admissionGap = eq2026 !== null && eq2025 !== null
      ? eq2026 - eq2025
      : eq2025 !== null && eq2024 !== null
      ? eq2025 - eq2024
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
      score2026: s.score2026 ?? null,
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

export function extractSchoolName(schoolName: string): string {
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
  
  // 并行处理所有院校的专业匹配，避免逐校串行网络请求拖慢整体耗时
  await Promise.all(results.map(async (result) => {
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

      // 优先只取与该“院校专业组”同组的专业数据。
      // 此前按全校匹配，多组院校会把其他组的专业混进来，导致推荐的专业
      // 实际并不在这个组招生；组内无数据时再退回全校数据并给出说明。
      const groupNumber = parseGroupNumber(result.name);
      const groupMajors = groupNumber
        ? filteredMajors.filter(major => getMajorGroupNumber(major) === groupNumber)
        : [];
      const majorPool = groupMajors.length > 0 ? groupMajors : filteredMajors;
      const majorGroupFallback =
        groupNumber !== null && groupMajors.length === 0 && filteredMajors.length > 0;

      let matched: MajorScore[];

      if (result.tier === '保') {
        matched = majorPool.filter(major => {
          const score = major.min_score || 0;
          return score >= baseScore - effectiveRange * 2 && score <= baseScore;
        });
      } else if (result.tier === '稳') {
        matched = majorPool.filter(major => {
          const score = major.min_score || 0;
          return score >= baseScore - effectiveRange && score <= baseScore + effectiveRange;
        });
      } else {
        matched = majorPool.filter(major => {
          const score = major.min_score || 0;
          return score >= baseScore - effectiveRange * 0.5 && score <= baseScore + effectiveRange * 1.5;
        });
      }

      // 有专业数据但都落在分数区间外时，不再显示“暂无专业数据”，
      // 改为给出分数最接近的若干专业，供用户判断该组实际包含哪些专业。
      if (matched.length === 0 && majorPool.length > 0) {
        matched = [...majorPool]
          .sort((a, b) => Math.abs((a.min_score || 0) - baseScore) - Math.abs((b.min_score || 0) - baseScore))
          .slice(0, 6);
      }
      
      matched.forEach(major => {
        const score = major.min_score || 0;
        major.admission_probability = getMajorAdmissionProbability(score, baseScore, province);
        major.tier = getMajorTierByScore(score, baseScore, chongDiff, wenDiff, province, scoreRange);
      });
      
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
      if (majorGroupFallback) {
        majorWarnings.push('该专业组暂无分专业数据，专业推荐按该校历年数据参考');
      }
      if (limitedMajors.length === 0) {
        majorWarnings.push('该院校暂无分专业录取数据，建议以专业组投档线为准');
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
  }));
  
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
  const ExcelJS = (await import('exceljs')).default;
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
    { key: 'nature', width: 12 },
    { key: 'province', width: 10 },
    { key: 'name', width: 30 },
    { key: 'subject', width: 15 },
    { key: 'score2026', width: 12 },
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
    '志愿序号', '志愿档次', '录取概率', '院校层次', '院校性质', '省份', '院校名称',
    '科目要求', '2026投档线', '2025投档线', '2024投档线', '2023投档线', '推荐专业', '推荐理由', '警告信息',
  ];
  
  const headerRow = mainSheet.addRow(headers);
  headerRow.eachCell((cell) => {
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
      v.nature,
      v.province,
      v.name,
      v.subjectText,
      v.score2026 ?? '',
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
      } else if (colNumber >= 9 && colNumber <= 12) {
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
  
  summaryData.forEach((data) => {
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

export function exportToExcel(volunteers: VolunteerResult[], filename: string, candidateScore?: number): void {
  // 必须使用考生本人分数，而不是第一条志愿的参考分，
  // 否则导出文件中的分数信息会与用户输入不符。
  const baseScore = candidateScore ?? (volunteers[0]?.refScore || 0);
  
  exportToExcelModern(volunteers, filename, baseScore).catch(async error => {
    console.error('Excel导出失败:', error);
    
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ['志愿序号', '志愿档次', '录取概率', '分数趋势', '趋势值(%)', '波动系数(%)', '院校层次', '院校性质', '省份', '院校名称', '科目要求', 
       '2026投档线', '2025投档线', '2024投档线', '2023投档线', 
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
        v.nature,
        v.province,
        v.name,
        v.subjectText,
        v.score2026 !== null ? String(v.score2026) : '',
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
      { wch: 12 },
      { wch: 10 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
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