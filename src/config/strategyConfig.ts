export type StrategyType = '激进' | '稳妥' | '保守' | '个性化';

export interface StrategyConfig {
  name: string;
  chongRatio: number;
  wenRatio: number;
  baoRatio: number;
  chongScoreDiff: number;
  wenScoreDiff: number;
  baoScoreDiff: number;
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
    description: '冲刺更多高分院校',
    color: 'from-red-500 to-orange-500',
  },
  '稳妥': {
    name: '稳妥',
    chongRatio: 0.3,
    wenRatio: 0.5,
    baoRatio: 0.2,
    chongScoreDiff: 10,
    wenScoreDiff: 3,
    baoScoreDiff: 15,
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
    description: '更注重保底，降低落榜风险',
    color: 'from-green-500 to-emerald-500',
  },
  '个性化': {
    name: '个性化',
    chongRatio: 0.3,
    wenRatio: 0.5,
    baoRatio: 0.2,
    chongScoreDiff: 10,
    wenScoreDiff: 3,
    baoScoreDiff: 15,
    description: '自定义冲稳保策略',
    color: 'from-purple-500 to-pink-500',
  },
};