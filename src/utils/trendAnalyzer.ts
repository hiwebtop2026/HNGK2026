import { HISTORY_YEARS } from '../config/examYearConfig';

export interface TrendData {
  year: number;
  score: number | null;
  rank: number | null;
}

export interface TrendAnalysisResult {
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  volatility: number;
  trendCoefficient: number;
  volatilityCoefficient: number;
  yearlyData: TrendData[];
}

export interface ProbabilityFactors {
  baseProbability: number;
  trendCoefficient: number;
  volatilityCoefficient: number;
  finalProbability: number;
}

export function calculateTrendAnalysis(
  latest: number | null,
  previous: number | null,
  oldest: number | null,
  years: readonly [number, number, number] = HISTORY_YEARS
): TrendAnalysisResult {
  const yearlyData: TrendData[] = [
    { year: years[0], score: latest, rank: null },
    { year: years[1], score: previous, rank: null },
    { year: years[2], score: oldest, rank: null },
  ];

  const validScores = yearlyData.filter(d => d.score !== null).map(d => d.score!) as number[];

  if (validScores.length < 2) {
    return {
      trend: 'stable',
      trendValue: 0,
      volatility: 0,
      trendCoefficient: 1.0,
      volatilityCoefficient: 1.0,
      yearlyData,
    };
  }

  let trendValue = 0;
  if (validScores.length >= 2) {
    const recentAvg = validScores.slice(0, Math.min(2, validScores.length)).reduce((a, b) => a + b, 0) / Math.min(2, validScores.length);
    const olderAvg = validScores.slice(Math.max(0, validScores.length - 2), validScores.length).reduce((a, b) => a + b, 0) / Math.min(2, validScores.length);
    const base = olderAvg || 1;
    trendValue = ((recentAvg - olderAvg) / base) * 100;
  }

  let volatility = 0;
  if (validScores.length >= 2) {
    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const variance = validScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / validScores.length;
    volatility = Math.sqrt(variance) / (avg || 1) * 100;
  }

  let trend: 'up' | 'down' | 'stable';
  if (trendValue < -5) trend = 'down';
  else if (trendValue > 5) trend = 'up';
  else trend = 'stable';

  // 趋势影响按幅度线性化：原实现只有 0.95/1.0/1.05 三档，
  // 10 分和 40 分的上涨被同等处理。现在 ±5% 以内与旧档基本一致，
  // 幅度越大调整越强，±15% 封顶（0.85 / 1.15）。
  const clampedTrend = Math.max(-15, Math.min(15, trendValue));
  const trendCoefficient = 1 - (clampedTrend / 15) * 0.15;

  let volatilityCoefficient = 1.0;
  if (volatility <= 3) volatilityCoefficient = 1.00;
  else if (volatility <= 8) volatilityCoefficient = 0.97;
  else if (volatility <= 15) volatilityCoefficient = 0.94;
  else volatilityCoefficient = 0.90;

  return {
    trend,
    trendValue,
    volatility,
    trendCoefficient,
    volatilityCoefficient,
    yearlyData,
  };
}

export function calculateAdmissionProbability(
  refScore: number,
  baseScore: number,
  latest: number | null,
  previous: number | null,
  oldest: number | null
): ProbabilityFactors {
  const trendAnalysis = calculateTrendAnalysis(latest, previous, oldest);
  
  const diff = baseScore - refScore;
  
  let baseProbability: number;
  if (diff >= 30) baseProbability = 99;
  else if (diff >= 25) baseProbability = 97;
  else if (diff >= 20) baseProbability = 94;
  else if (diff >= 15) baseProbability = 88;
  else if (diff >= 10) baseProbability = 78;
  else if (diff >= 5) baseProbability = 65;
  else if (diff >= 0) baseProbability = 50;
  else if (diff >= -5) baseProbability = 38;
  else if (diff >= -10) baseProbability = 28;
  else if (diff >= -15) baseProbability = 18;
  else if (diff >= -20) baseProbability = 12;
  else if (diff >= -25) baseProbability = 8;
  else if (diff >= -30) baseProbability = 5;
  else baseProbability = 2;

  const finalProbability = Math.max(
    1,
    Math.min(99, baseProbability * trendAnalysis.trendCoefficient * trendAnalysis.volatilityCoefficient)
  );

  return {
    baseProbability,
    trendCoefficient: trendAnalysis.trendCoefficient,
    volatilityCoefficient: trendAnalysis.volatilityCoefficient,
    finalProbability: Math.round(finalProbability),
  };
}

export interface RiskAssessmentResult {
  riskIndex: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskDescription: string;
  chongCount: number;
  wenCount: number;
  baoCount: number;
  totalCount: number;
  suggestions: string[];
}

export function calculateRiskAssessment(
  chongCount: number,
  wenCount: number,
  baoCount: number,
  tierProbabilities?: { chong: number[]; wen: number[]; bao: number[] }
): RiskAssessmentResult {
  const totalCount = chongCount + wenCount + baoCount;
  if (totalCount === 0) {
    return {
      riskIndex: 0,
      riskLevel: 'low',
      riskDescription: '暂无志愿数据',
      chongCount: 0,
      wenCount: 0,
      baoCount: 0,
      totalCount: 0,
      suggestions: [],
    };
  }

  // 结构风险：只按冲/稳/保数量加权（原有口径，作为兜底与对照）
  const countRisk = (chongCount * 1.0 + wenCount * 0.5 + baoCount * 0.2) / totalCount;

  // 概率风险：同样 8 个冲，平均 30% 与平均 15% 的真实风险完全不同。
  // 概率已经过回测校准，可直接当历史命中率使用；整体平均落榜率作为风险的质量维度。
  let riskIndex = countRisk;
  let avgChongProbability: number | null = null;
  if (tierProbabilities) {
    const all = [...tierProbabilities.chong, ...tierProbabilities.wen, ...tierProbabilities.bao];
    if (all.length > 0) {
      const failRate = all.reduce((sum, p) => sum + (100 - p) / 100, 0) / all.length;
      riskIndex = 0.5 * countRisk + 0.5 * failRate;
    }
    if (tierProbabilities.chong.length > 0) {
      avgChongProbability = tierProbabilities.chong.reduce((a, b) => a + b, 0) / tierProbabilities.chong.length;
    }
  }

  let riskLevel: 'low' | 'medium' | 'high';
  let riskDescription: string;
  const suggestions: string[] = [];

  if (riskIndex < 0.4) {
    riskLevel = 'low';
    riskDescription = '偏保守 - 保底志愿较多，录取把握大';
    suggestions.push('当前方案较为保守，录取风险较低');
    if (chongCount === 0) suggestions.push('建议适当增加冲刺志愿，争取更好的院校');
  } else if (riskIndex <= 0.6) {
    riskLevel = 'medium';
    riskDescription = '平衡 - 冲稳保比例合理，录取把握适中';
    suggestions.push('当前方案比例合理，是比较理想的志愿配置');
  } else {
    riskLevel = 'high';
    riskDescription = '偏激进 - 冲刺志愿较多，存在一定落榜风险';
    suggestions.push('当前方案较为激进，建议增加保底志愿');
    suggestions.push('确保至少有3-5个稳妥的保底志愿');
  }

  // 保底池为空通常意味着考生分数已接近或低于本科批线，
  // 此时只提示“增加保底”没有可操作性，需要给出可行的备选路径。
  if (baoCount === 0) {
    suggestions.push('当前分数区间内没有可用的保底院校，建议适当放宽分数范围，并同步准备专科批或征集志愿');
  }

  const chongRatio = Math.round((chongCount / totalCount) * 100);
  const baoRatio = Math.round((baoCount / totalCount) * 100);

  if (chongRatio > 40) {
    suggestions.push(`冲刺志愿占比${chongRatio}%，建议控制在30%以内`);
  }
  if (baoRatio < 20) {
    suggestions.push(`保底志愿占比${baoRatio}%，建议不低于25%`);
  }

  if (avgChongProbability !== null && avgChongProbability < 20) {
    suggestions.push(`冲刺志愿平均命中率仅${Math.round(avgChongProbability)}%，接近“彩票组”，建议替换部分为命中率更高的院校`);
  }

  return {
    riskIndex: Math.round(riskIndex * 100) / 100,
    riskLevel,
    riskDescription,
    chongCount,
    wenCount,
    baoCount,
    totalCount,
    suggestions,
  };
}

export interface SmartConfig {
  chongScoreDiff: number;
  wenScoreDiff: number;
  baoScoreDiff: number;
  chongCount: number;
  wenCount: number;
  baoCount: number;
  scoreRange: number;
}

export function getSmartConfig(baseScore: number, totalVolunteers: number = 30): SmartConfig {
  let config: Partial<SmartConfig>;

  if (baseScore >= 700) {
    config = {
      chongScoreDiff: 8,
      wenScoreDiff: 4,
      baoScoreDiff: 12,
      scoreRange: 20,
    };
  } else if (baseScore >= 500) {
    config = {
      chongScoreDiff: 10,
      wenScoreDiff: 5,
      baoScoreDiff: 15,
      scoreRange: 25,
    };
  } else {
    config = {
      chongScoreDiff: 12,
      wenScoreDiff: 6,
      baoScoreDiff: 18,
      scoreRange: 30,
    };
  }

  const chongCount = Math.round(totalVolunteers * 0.3);
  const wenCount = Math.round(totalVolunteers * 0.4);
  const baoCount = totalVolunteers - chongCount - wenCount;

  return {
    ...config,
    chongCount,
    wenCount,
    baoCount,
    scoreRange: config.scoreRange || 25,
  } as SmartConfig;
}

export function getScoreLevel(baseScore: number): 'high' | 'middle' | 'low' {
  if (baseScore >= 700) return 'high';
  if (baseScore >= 500) return 'middle';
  return 'low';
}

export function getConfigRecommendation(baseScore: number): string {
  const level = getScoreLevel(baseScore);
  const config = getSmartConfig(baseScore);
  
  const levelText = {
    high: '高分段（≥700分）',
    middle: '中分段（500-700分）',
    low: '低分段（<500分）',
  }[level];

  return `${levelText}，推荐冲稳保参数：冲${config.chongScoreDiff}分/稳${config.wenScoreDiff}分/保${config.baoScoreDiff}分，分数范围±${config.scoreRange}分`;
}