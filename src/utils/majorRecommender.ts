import type { MajorRecommendation } from './dataUtils';
import { getSchoolMajors, type MajorInfo } from '../data/majorData';

// 学科实力得分
const LEVEL_SCORE: Record<string, number> = {
  'A+': 100,
  'A': 90,
  'B+': 80,
  'B': 70,
  'C': 60,
};

// 专业热度对分数线的影响（估算的分差）
// 热门专业通常比投档线高5-15分，中等高0-5分，冷门可能低于投档线
const HEAT_SCORE_DIFF: Record<string, number> = {
  'hot': 8,    // 热门专业比投档线高约8分
  'warm': 2,   // 中等热度高约2分
  'cool': -5,  // 冷门专业可能比投档线低约5分
};

// 基于分数差计算录取概率
export function calculateAdmissionProbability(
  scoreDiff: number,  // 考生分数 - 专业预估分数（正值表示考生分数更高）
): number {
  // 分数差为正表示考生分数高于专业预估分
  // 分数差 >= 10分，概率95%+
  // 分数差 5-10分，概率 80-95%
  // 分数差 0-5分，概率 60-80%
  // 分数差 -5-0分，概率 40-60%
  // 分数差 -10~-5分，概率 20-40%
  // 分数差 < -10分，概率 <20%
  
  if (scoreDiff >= 15) return 98;
  if (scoreDiff >= 10) return 95;
  if (scoreDiff >= 7) return 88;
  if (scoreDiff >= 5) return 80;
  if (scoreDiff >= 3) return 72;
  if (scoreDiff >= 0) return 60;
  if (scoreDiff >= -3) return 48;
  if (scoreDiff >= -5) return 38;
  if (scoreDiff >= -8) return 28;
  if (scoreDiff >= -10) return 18;
  if (scoreDiff >= -15) return 10;
  return 5;
}

// 获取专业录取档次
export function getAdmissionTier(probability: number): '冲刺' | '稳妥' | '保底' {
  if (probability >= 75) return '保底';
  if (probability >= 45) return '稳妥';
  return '冲刺';
}

// 生成专业推荐
export function generateMajorRecommendations(
  schoolName: string,
  baseScore: number,
  schoolRefScore: number,
): MajorRecommendation[] {
  const majors = getSchoolMajors(schoolName);
  
  const recommendations: MajorRecommendation[] = majors.map(major => {
    // 计算专业预估分数 = 院校投档线 + 热度分差
    const estimatedMajorScore = schoolRefScore + HEAT_SCORE_DIFF[major.heat];
    
    // 考生分数与专业预估分的差值
    const scoreDiff = baseScore - estimatedMajorScore;
    
    // 计算录取概率
    const probability = calculateAdmissionProbability(scoreDiff);
    
    // 录取档次
    const admissionTier = getAdmissionTier(probability);
    
    return {
      name: major.name,
      category: major.category,
      heat: major.heat,
      level: major.level,
      admissionTier,
      probability,
    };
  });
  
  // 按录取概率从高到低排序
  recommendations.sort((a, b) => b.probability - a.probability);
  
  // 分档次选择，确保每个档次都有推荐
  const chongMajors = recommendations.filter(m => m.admissionTier === '冲刺').slice(0, 2);
  const wenMajors = recommendations.filter(m => m.admissionTier === '稳妥').slice(0, 2);
  const baoMajors = recommendations.filter(m => m.admissionTier === '保底').slice(0, 2);
  
  const result = [...chongMajors, ...wenMajors, ...baoMajors];
  
  // 如果结果不足6个，补充其他专业
  if (result.length < 6) {
    const remaining = recommendations.filter(m => !result.find(r => r.name === m.name));
    result.push(...remaining.slice(0, 6 - result.length));
  }
  
  // 保持排序（保底在前，冲刺在后，便于考生了解梯度）
  result.sort((a, b) => b.probability - a.probability);
  
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
    const heatText = m.heat === 'hot' ? '热门' : m.heat === 'warm' ? '中等' : '冷门';
    return `${m.name}（${m.category}）- 学科实力${m.level}，${heatText}，录取概率约${Math.round(m.probability)}%`;
  }).join('\n');
}