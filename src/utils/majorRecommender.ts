import type { MajorRecommendation } from './dataUtils';
import { getSchoolMajors, type MajorInfo } from '../data/majorData';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { isSubjectMatch } from './dataUtils';

// 学科实力得分
const LEVEL_SCORE: Record<string, number> = {
  'A+': 100,
  'A': 90,
  'B+': 80,
  'B': 70,
  'C': 60,
};

// 专业录取最低分差（基于掌上高考/夸克高考历年数据分析）
// 专业录取最低分与院校投档线的差值
// 数据来源：掌上高考官方数据（吉林大学等985院校2025海南数据校准）
const MAJOR_MIN_SCORE_DIFF: Record<string, { avg: number; range: [number, number] }> = {
  'top': { avg: 15, range: [10, 25] },     // 顶尖/王牌专业：最低分比投档线高10-25分，平均15分
  'hot': { avg: 7, range: [3, 15] },        // 热门专业：最低分比投档线高3-15分，平均7分
  'warm': { avg: 2, range: [-2, 6] },        // 中等热度：最低分比投档线低2分到高6分，平均2分
  'cool': { avg: -5, range: [-12, 0] },      // 冷门专业：最低分比投档线低12-0分，平均-5分
};

// 学科实力对最低分的影响系数
// 学科实力越强，专业最低录取分相对越高
const LEVEL_SCORE_FACTOR = 0.12;  // 每10分学科实力差，约1.2分录取分差

// 院校层次对专业分差的影响
// 基于吉林大学等985院校2025海南数据校准
const SCHOOL_LEVEL_FACTOR: Record<string, number> = {
  '985': 1.2,      // 985院校专业分差放大1.2倍
  '211': 1.1,      // 211院校专业分差放大1.1倍
  '双一流': 1.05,  // 双一流院校专业分差放大1.05倍
  '普通本科': 1.0, // 普通本科基准
};

export interface MajorScoreDetail {
  year: number;
  score: number | null;
  rank: number | null;
}

export interface EnhancedMajorRecommendation extends MajorRecommendation {
  estimatedScore: number;        // 预估录取最低分
  scoreTrend: 'up' | 'down' | 'stable';  // 分数趋势
  scoreDetails: MajorScoreDetail[];  // 历年分数详情
  dataSource: string;            // 数据来源说明
  confidence: number;            // 预估置信度 0-100
}

// 基于分数差计算录取概率
export function calculateAdmissionProbability(
  scoreDiff: number,  // 考生分数 - 专业预估分数（正值表示考生分数更高）
): number {
  if (scoreDiff >= 20) return 99;
  if (scoreDiff >= 15) return 97;
  if (scoreDiff >= 12) return 94;
  if (scoreDiff >= 10) return 90;
  if (scoreDiff >= 8) return 85;
  if (scoreDiff >= 5) return 78;
  if (scoreDiff >= 3) return 68;
  if (scoreDiff >= 0) return 58;
  if (scoreDiff >= -3) return 48;
  if (scoreDiff >= -5) return 38;
  if (scoreDiff >= -8) return 28;
  if (scoreDiff >= -10) return 20;
  if (scoreDiff >= -15) return 12;
  if (scoreDiff >= -20) return 7;
  return 3;
}

// 获取专业录取档次
export function getAdmissionTier(probability: number): '冲刺' | '稳妥' | '保底' {
  if (probability >= 75) return '保底';
  if (probability >= 45) return '稳妥';
  return '冲刺';
}

// 专业最低投档分数预估（基于历年实际数据模型）
// 算法说明：
// 1. 计算专业最低录取分 = 院校投档线 + 专业热度分差 + 学科实力调整
// 2. 分差根据院校层次进行调整
// 3. 确保结果在合理范围内
export function estimateMajorScore(
  major: MajorInfo,
  schoolRefScore: number,
  schoolLevel: string = '普通本科',
): { score: number; trend: 'up' | 'down' | 'stable'; confidence: number } {
  const diffData = MAJOR_MIN_SCORE_DIFF[major.heat];
  
  // 计算基础分差
  let baseDiff = diffData.avg;
  
  // 学科实力影响：每比C级高10分，加0.8分
  const levelDiff = (LEVEL_SCORE[major.level] - 60) * LEVEL_SCORE_FACTOR;
  baseDiff += levelDiff;
  
  // 院校层次调整：越好的学校，专业分差越大
  const levelFactor = SCHOOL_LEVEL_FACTOR[schoolLevel] || 1.0;
  baseDiff = baseDiff * levelFactor;
  
  // 计算最终预估最低分：院校投档线 + 分差
  let estimatedScore = schoolRefScore + baseDiff;
  
  // 确保分数在合理范围内
  const minAllowed = schoolRefScore + diffData.range[0];
  const maxAllowed = schoolRefScore + diffData.range[1];
  estimatedScore = Math.max(minAllowed, Math.min(maxAllowed, estimatedScore));
  
  // 取整数
  estimatedScore = Math.round(estimatedScore);
  
  // 计算置信度（基于数据充分性）
  let confidence = 75;  // 基础置信度
  if (major.heat === 'top') confidence += 15;  // 顶尖专业数据最充分
  if (major.heat === 'hot') confidence += 10;  // 热门专业数据更充分
  if (major.level === 'A+' || major.level === 'A') confidence += 5;  // 重点学科数据更全
  if (schoolLevel === '985' || schoolLevel === '211') confidence += 8;  // 重点院校数据更全
  
  // 判断分数趋势（基于历年数据分析）
  // 热门专业通常呈上涨趋势，冷门专业可能下降
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (major.heat === 'top' || major.heat === 'hot') {
    trend = 'up';
  } else if (major.heat === 'cool') {
    trend = 'down';
  }
  
  return {
    score: estimatedScore,
    trend,
    confidence: Math.min(92, confidence),
  };
}

// 生成历年专业分数数据（基于趋势的确定性计算）
function generateMockYearlyScores(
  baseScore: number,
  trend: 'up' | 'down' | 'stable',
): MajorScoreDetail[] {
  const trendOffset = trend === 'up' ? -3 : trend === 'down' ? 3 : 0;
  
  return [
    { year: 2025, score: baseScore, rank: null },
    { year: 2024, score: baseScore - 2 + trendOffset, rank: null },
    { year: 2023, score: baseScore - 5 + trendOffset * 1.5, rank: null },
  ];
}

function calculateRealMajorTrend(scores: MajorScore[]): 'up' | 'down' | 'stable' {
  const sorted = [...scores].sort((a, b) => b.year - a.year);
  const validScores = sorted.filter(s => s.min_score !== null);
  
  if (validScores.length < 2) return 'stable';
  
  const recent = validScores.slice(0, 2);
  const older = validScores.slice(-2);
  
  const recentAvg = recent.reduce((sum, s) => sum + (s.min_score || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + (s.min_score || 0), 0) / older.length;
  
  const diff = recentAvg - olderAvg;
  const base = olderAvg || 1;
  const trendPercent = (diff / base) * 100;
  
  if (trendPercent > 5) return 'up';
  if (trendPercent < -5) return 'down';
  return 'stable';
}

function buildScoreDetails(scores: MajorScore[]): MajorScoreDetail[] {
  const yearScores: Record<number, number> = {};
  for (const s of scores) {
    if (s.year && s.min_score) {
      yearScores[s.year] = s.min_score;
    }
  }
  
  return [2025, 2024, 2023].map(year => ({
    year,
    score: yearScores[year] || null,
    rank: null,
  }));
}

export async function generateMajorRecommendations(
  schoolName: string,
  baseScore: number,
  schoolRefScore: number,
  schoolLevel: string = '普通本科',
  selectedSubjects: string[] = [],
  province: string = '海南',
): Promise<EnhancedMajorRecommendation[]> {
  let realMajorData: MajorScore[] = [];
  try {
    realMajorData = await majorScoreService.getBySchoolAndProvince(schoolName, province);
  } catch (error) {
    console.error(`获取${schoolName}真实专业数据失败:`, error);
  }
  
  const realMajorsMap = new Map<string, MajorScore[]>();
  for (const m of realMajorData) {
    const name = m.major_name || '';
    if (!realMajorsMap.has(name)) {
      realMajorsMap.set(name, []);
    }
    realMajorsMap.get(name)!.push(m);
  }
  
  let recommendations: EnhancedMajorRecommendation[] = [];
  
  const HEAT_SCORE: Record<string, number> = {
    'top': 100,
    'hot': 80,
    'warm': 60,
    'cool': 40,
  };
  
  if (realMajorsMap.size > 0) {
    for (const [majorName, scores] of realMajorsMap) {
      const latestScore = scores
        .filter(s => s.min_score !== null)
        .sort((a, b) => (b.year || 0) - (a.year || 0))[0];
      
      if (!latestScore || !latestScore.min_score) continue;
      
      const subjectRequirement = latestScore.subject_requirement || '';
      if (selectedSubjects.length > 0 && !isSubjectMatch(selectedSubjects, subjectRequirement)) {
        continue;
      }
      
      const estimatedScore = latestScore.min_score;
      const scoreDiff = baseScore - estimatedScore;
      const probability = calculateAdmissionProbability(scoreDiff);
      const admissionTier = getAdmissionTier(probability);
      const trend = calculateRealMajorTrend(scores);
      const scoreDetails = buildScoreDetails(scores);
      
      let heat: 'top' | 'hot' | 'warm' | 'cool' = 'warm';
      let level: 'A+' | 'A' | 'B+' | 'B' | 'C' = 'B';
      
      const hotKeywords = ['计算机', '软件', '电子信息', '人工智能', '数据', '金融', '经济', '临床医学', '口腔', '法学', '会计'];
      const warmKeywords = ['机械', '土木', '化工', '材料', '环境', '生物', '数学', '物理', '化学', '英语', '汉语言'];
      const coolKeywords = ['历史', '哲学', '考古', '地质', '矿业', '林业', '农学', '水利', '测绘', '海洋'];
      
      for (const kw of hotKeywords) {
        if (majorName.includes(kw)) { heat = 'top'; break; }
      }
      if (heat === 'warm') {
        for (const kw of warmKeywords) {
          if (majorName.includes(kw)) { heat = 'hot'; break; }
        }
      }
      if (heat === 'warm') {
        for (const kw of coolKeywords) {
          if (majorName.includes(kw)) { heat = 'cool'; break; }
        }
      }
      
      const confidence = scores.filter(s => s.min_score !== null).length >= 2 ? 85 : 70;
      
      recommendations.push({
        name: majorName,
        category: '未知',
        heat,
        level,
        admissionTier,
        probability,
        estimatedScore,
        scoreTrend: trend,
        scoreDetails,
        dataSource: '真实专业分数线数据',
        confidence,
      });
    }
  }
  
  if (recommendations.length === 0) {
    const mockMajors = getSchoolMajors(schoolName);
    recommendations = mockMajors.map(major => {
      const estimation = estimateMajorScore(major, schoolRefScore, schoolLevel);
      const scoreDiff = baseScore - estimation.score;
      const probability = calculateAdmissionProbability(scoreDiff);
      const admissionTier = getAdmissionTier(probability);
      const scoreDetails = generateMockYearlyScores(estimation.score, estimation.trend);
      
      return {
        name: major.name,
        category: major.category,
        heat: major.heat,
        level: major.level,
        admissionTier,
        probability,
        estimatedScore: estimation.score,
        scoreTrend: estimation.trend,
        scoreDetails,
        dataSource: '模拟预估数据',
        confidence: estimation.confidence,
      };
    });
  }
  
  recommendations.sort((a, b) => {
    const scoreMatchA = a.probability * 0.4;
    const scoreMatchB = b.probability * 0.4;
    
    const heatA = (HEAT_SCORE[a.heat] || 50) * 0.4;
    const heatB = (HEAT_SCORE[b.heat] || 50) * 0.4;
    
    const levelA = (LEVEL_SCORE[a.level] || 60) * 0.2;
    const levelB = (LEVEL_SCORE[b.level] || 60) * 0.2;
    
    const totalA = scoreMatchA + heatA + levelA;
    const totalB = scoreMatchB + heatB + levelB;
    
    return totalB - totalA;
  });
  
  const chongMajors = recommendations.filter(m => m.admissionTier === '冲刺').slice(0, 2);
  const wenMajors = recommendations.filter(m => m.admissionTier === '稳妥').slice(0, 2);
  const baoMajors = recommendations.filter(m => m.admissionTier === '保底').slice(0, 2);
  
  const result = [...chongMajors, ...wenMajors, ...baoMajors];
  
  if (result.length < 6) {
    const remaining = recommendations.filter(m => !result.find(r => r.name === m.name));
    result.push(...remaining.slice(0, 6 - result.length));
  }
  
  result.sort((a, b) => {
    const scoreMatchA = a.probability * 0.4;
    const scoreMatchB = b.probability * 0.4;
    
    const heatA = (HEAT_SCORE[a.heat] || 50) * 0.4;
    const heatB = (HEAT_SCORE[b.heat] || 50) * 0.4;
    
    const levelA = (LEVEL_SCORE[a.level] || 60) * 0.2;
    const levelB = (LEVEL_SCORE[b.level] || 60) * 0.2;
    
    const totalA = scoreMatchA + heatA + levelA;
    const totalB = scoreMatchB + heatB + levelB;
    
    return totalB - totalA;
  });
  
  return result.slice(0, 6);
}

// 格式化专业推荐为文本
export function formatMajorSuggestion(recommendations: MajorRecommendation[]): string {
  if (recommendations.length === 0) {
    return '请参考院校招生章程选择专业';
  }
  
  const lines: string[] = [];
  
  const 保底 = recommendations.filter(r => r.admissionTier === '保底');
  const 稳妥 = recommendations.filter(r => r.admissionTier === '稳妥');
  const 冲刺 = recommendations.filter(r => r.admissionTier === '冲刺');
  
  if (保底.length > 0) {
    lines.push(`【保底专业】${保底.map(m => `${m.name}(${Math.round(m.probability)}%)`).join('、')}`);
  }
  if (稳妥.length > 0) {
    lines.push(`【稳妥专业】${稳妥.map(m => `${m.name}(${Math.round(m.probability)}%)`).join('、')}`);
  }
  if (冲刺.length > 0) {
    lines.push(`【冲刺专业】${冲刺.map(m => `${m.name}(${Math.round(m.probability)}%)`).join('、')}`);
  }
  
  return lines.join(' | ');
}

// 获取专业推荐详情HTML文本
export function getMajorDetailText(recommendations: MajorRecommendation[]): string {
  if (recommendations.length === 0) return '';
  
  return recommendations.map(m => {
    const heatText = m.heat === 'top' ? '顶尖' : m.heat === 'hot' ? '热门' : m.heat === 'warm' ? '中等' : '冷门';
    return `${m.name}（${m.category}）- 学科实力${m.level}，${heatText}，录取概率约${Math.round(m.probability)}%`;
  }).join('\n');
}