/**
 * 概率校准表
 *
 * 来源：scripts/backtestProbability.ts
 * 方法：用 2024/2023 年投档线（折算为 2025 等效分）预测 2025 年是否达线，
 * 按原始概率分桶统计真实命中率，再用保序回归得到“原始概率 → 真实命中率”的单调映射。
 * 数据按院校奇偶拆分训练/测试集，避免样本内自证。
 *
 * 当前回测（海南普通类，2006 个专业组、30090 个样本，趋势线性化后）：
 *   校准前 测试集 ECE 3.9% / Brier 0.1248
 *   校准后 测试集 ECE 1.8% / Brier 0.1233
 *
 * 没有回测数据的省份不做校准，直接返回原始概率。
 */
const CALIBRATION_ANCHORS: Record<string, Array<[number, number]>> = {
  海南: [
    [0, 1],
    [5, 6.3],
    [15, 13.3],
    [25, 19.3],
    [35, 28.3],
    [45, 35.6],
    [55, 57.7],
    [65, 64.3],
    [75, 72.8],
    [85, 89.1],
    [95, 96.6],
    [100, 99],
  ],
};

export function calibrateProbability(rawProbability: number, province: string): number {
  const anchors = CALIBRATION_ANCHORS[province];
  if (!anchors || anchors.length < 2) return rawProbability;

  const raw = Math.max(0, Math.min(100, rawProbability));
  if (raw <= anchors[0][0]) return anchors[0][1];
  const lastAnchor = anchors[anchors.length - 1];
  if (raw >= lastAnchor[0]) return lastAnchor[1];

  for (let i = 1; i < anchors.length; i++) {
    if (raw <= anchors[i][0]) {
      const [x0, y0] = anchors[i - 1];
      const [x1, y1] = anchors[i];
      return y0 + ((y1 - y0) * (raw - x0)) / (x1 - x0);
    }
  }
  return raw;
}
