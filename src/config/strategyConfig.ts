export type StrategyType = '激进' | '稳妥' | '保守' | '个性化';

export interface StrategyConfig {
  name: string;
  chongRatio: number;
  wenRatio: number;
  baoRatio: number;
  chongScoreDiff: number;
  wenScoreDiff: number;
  baoScoreDiff: number;
  // 分档概率阈值（已按真实命中率校准）：低于 wenThreshold 为冲，
  // 达到 baoThreshold 为保，介于两者之间为稳。
  wenThreshold: number;
  baoThreshold: number;
  description: string;
  color: string;
}

export const STRATEGY_CONFIGS: Record<StrategyType, StrategyConfig> = {
  '激进': {
    name: '激进',
    chongRatio: 0.5,
    wenRatio: 0.35,
    baoRatio: 0.15,
    chongScoreDiff: 15,
    wenScoreDiff: 5,
    baoScoreDiff: 8,
    wenThreshold: 40,
    baoThreshold: 75,
    description: '冲刺更多高分院校',
    color: 'from-red-500 to-orange-500',
  },
  '稳妥': {
    name: '稳妥',
    chongRatio: 0.25,
    wenRatio: 0.5,
    baoRatio: 0.25,
    chongScoreDiff: 10,
    wenScoreDiff: 3,
    baoScoreDiff: 15,
    wenThreshold: 45,
    baoThreshold: 80,
    description: '均衡分配，适合大多数考生',
    color: 'from-amber-500 to-yellow-500',
  },
  '保守': {
    name: '保守',
    chongRatio: 0.15,
    wenRatio: 0.35,
    baoRatio: 0.5,
    chongScoreDiff: 5,
    wenScoreDiff: 2,
    baoScoreDiff: 20,
    wenThreshold: 55,
    baoThreshold: 85,
    description: '更注重保底，降低落榜风险',
    color: 'from-green-500 to-emerald-500',
  },
  '个性化': {
    name: '个性化',
    chongRatio: 0.3,
    wenRatio: 0.4,
    baoRatio: 0.3,
    chongScoreDiff: 15,
    wenScoreDiff: 5,
    baoScoreDiff: 15,
    wenThreshold: 45,
    baoThreshold: 80,
    description: '结合专业偏好，定制专属方案',
    color: 'from-blue-500 to-purple-500',
  },
};