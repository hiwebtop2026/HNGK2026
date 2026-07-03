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
  score2025: number | null,
  score2024: number | null,
  score2023: number | null
): TrendAnalysisResult {
  const yearlyData: TrendData[] = [
    { year: 2025, score: score2025, rank: null },
    { year: 2024, score: score2024, rank: null },
    { year: 2023, score: score2023, rank: null },
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

  let trendCoefficient = 1.0;
  if (trend === 'down') trendCoefficient = 1.05;
  else if (trend === 'up') trendCoefficient = 0.95;

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
  score2025: number | null,
  score2024: number | null,
  score2023: number | null
): ProbabilityFactors {
  const trendAnalysis = calculateTrendAnalysis(score2025, score2024, score2023);
  
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
  baoCount: number
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

  const riskIndex = (chongCount * 1.0 + wenCount * 0.5 + baoCount * 0.2) / totalCount;

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

  const chongRatio = Math.round((chongCount / totalCount) * 100);
  const wenRatio = Math.round((wenCount / totalCount) * 100);
  const baoRatio = Math.round((baoCount / totalCount) * 100);

  if (chongRatio > 40) {
    suggestions.push(`冲刺志愿占比${chongRatio}%，建议控制在30%以内`);
  }
  if (baoRatio < 20) {
    suggestions.push(`保底志愿占比${baoRatio}%，建议不低于25%`);
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