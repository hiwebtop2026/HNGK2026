/**
 * 概率模型回测脚本（海南普通类）
 *
 * 目的：用 2024/2023 年的投档线（折算为 2025 等效分）预测 2025 年是否被录取，
 * 统计“模型给出的概率”与“真实命中率”的偏差，并按院校随机拆分训练/测试集，
 * 避免用同一批数据既拟合校准表又验证校准效果。
 *
 * 运行：npm run backtest:probability
 */
import { loadSchoolDataFromSupabase } from '../src/utils/supabaseDataLoader';
import { scoreDistributionService } from '../src/services/scoreDistributionService';
import type { ScoreDistribution } from '../src/services/scoreDistributionService';
import { getRefScore } from '../src/utils/dataUtils';
import {
  buildRankAnalysis,
  calculateComprehensiveAdmissionProbability,
  convertScoreToEquivalent,
} from '../src/utils/volunteerUtils';

const PROVINCE = '海南';
const TARGET_YEAR = 2025;
const BATCH_LINE_2025 = 480;
const OFFSETS = Array.from({ length: 15 }, (_, i) => -35 + i * 5);

interface Sample {
  key: string;
  rawProbability: number;
  calibratedProbability: number;
  hit: boolean;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) % 1000003;
  }
  return h;
}

function bucketMetrics(samples: Sample[], applyCalibration = false, anchors: Array<[number, number]> = [], useCalibrated = false) {
  const bins = new Map<number, { count: number; hits: number; probSum: number }>();
  let brier = 0;
  for (const s of samples) {
    const p = useCalibrated
      ? s.calibratedProbability
      : applyCalibration
        ? interpolateCalibration(s.rawProbability, anchors)
        : s.rawProbability;
    const bucket = Math.min(9, Math.floor(p / 10)) * 10;
    const bin = bins.get(bucket) || { count: 0, hits: 0, probSum: 0 };
    bin.count += 1;
    bin.hits += s.hit ? 1 : 0;
    bin.probSum += p;
    bins.set(bucket, bin);
    brier += Math.pow(p / 100 - (s.hit ? 1 : 0), 2);
  }
  const rows = [...bins.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, bin]) => ({
      bucket: `${bucket}-${bucket + 10}%`,
      count: bin.count,
      predicted: Math.round(bin.probSum / bin.count * 10) / 10,
      actual: Math.round(bin.hits / bin.count * 1000) / 10,
    }));
  const ece = rows.reduce((sum, r) => sum + Math.abs(r.predicted - r.actual) * r.count, 0) / samples.length;
  return { rows, ece: Math.round(ece * 10) / 10, brier: Math.round(brier / samples.length * 10000) / 10000 };
}

function interpolateCalibration(raw: number, anchors: Array<[number, number]>): number {
  if (anchors.length === 0) return raw;
  if (raw <= anchors[0][0]) return anchors[0][1];
  if (raw >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
  for (let i = 1; i < anchors.length; i++) {
    if (raw <= anchors[i][0]) {
      const [x0, y0] = anchors[i - 1];
      const [x1, y1] = anchors[i];
      return y0 + (y1 - y0) * (raw - x0) / (x1 - x0);
    }
  }
  return raw;
}

/** 保序回归（PAVA），确保校准曲线单调不降 */
function makeMonotonic(points: Array<[number, number]>): Array<[number, number]> {
  const blocks: Array<{ x: number; y: number; w: number }> = points.map(([x, y]) => ({ x, y, w: 1 }));
  let i = 0;
  while (i < blocks.length - 1) {
    if (blocks[i].y > blocks[i + 1].y) {
      const merged = {
        x: (blocks[i].x + blocks[i + 1].x) / 2,
        y: (blocks[i].y * blocks[i].w + blocks[i + 1].y * blocks[i + 1].w) / (blocks[i].w + blocks[i + 1].w),
        w: blocks[i].w + blocks[i + 1].w,
      };
      blocks.splice(i, 2, merged);
      i = Math.max(0, i - 1);
    } else {
      i += 1;
    }
  }
  return blocks.map(b => [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10]);
}

async function main() {
  const schools = await loadSchoolDataFromSupabase(PROVINCE);
  const [d2025, d2024] = await Promise.all([
    scoreDistributionService.getByProvinceAndYear(PROVINCE, 2025, '普通类'),
    scoreDistributionService.getByProvinceAndYear(PROVINCE, 2024, '普通类'),
  ]);
  if (d2025.length === 0 || d2024.length === 0) throw new Error('一分一段表缺失');
  const distributions: Partial<Record<number, ScoreDistribution[]>> = { 2025: d2025, 2024: d2024 };

  // 预先为每个整数分数构造位次信息，避免在 3 万次评估中重复查表
  const rankCache = new Map<number, ReturnType<typeof buildRankAnalysis>>();
  const getRank = (candidate: number, ref: number) => {
    const key = candidate * 1000 + ref;
    if (!rankCache.has(key)) {
      rankCache.set(key, buildRankAnalysis(candidate, ref, d2025, PROVINCE));
    }
    return rankCache.get(key) ?? null;
  };

  const samples: Sample[] = [];
  const eligible = schools.filter(s => s.score2025 !== null && s.score2024 !== null);

  for (const school of eligible) {
    const eq2024 = convertScoreToEquivalent(school.score2024, 2024, distributions, TARGET_YEAR);
    const eq2023 = convertScoreToEquivalent(school.score2023, 2024, distributions, TARGET_YEAR);
    const refScore = getRefScore(null, eq2024, eq2023);
    if (!refScore || refScore <= 0) continue;

    for (const offset of OFFSETS) {
      const candidate = refScore + offset;
      if (candidate < 200 || candidate > 900) continue;
      const result = calculateComprehensiveAdmissionProbability(
        candidate, refScore,
        null, eq2024, eq2023,
        PROVINCE, getRank(candidate, refScore), BATCH_LINE_2025
      );
      samples.push({
        key: `${school.name}`,
        rawProbability: result.rawProbability,
        calibratedProbability: result.probability,
        hit: (school.score2025 as number) <= candidate,
      });
    }
  }

  const train = samples.filter(s => hashKey(s.key) % 2 === 0);
  const test = samples.filter(s => hashKey(s.key) % 2 === 1);

  const rawTest = bucketMetrics(test);
  console.log(`样本 ${samples.length}（训练 ${train.length} / 测试 ${test.length}），覆盖 ${eligible.length} 个专业组`);
  console.log('--- 校准前（测试集） ---');
  console.table(rawTest.rows);
  console.log(`ECE=${rawTest.ece}%  Brier=${rawTest.brier}`);

  // 用训练集的分桶结果生成校准锚点（每桶样本≥40 才采信）
  const trainBuckets = new Map<number, { count: number; hits: number }>();
  for (const s of train) {
    const bucket = Math.min(9, Math.floor(s.rawProbability / 10)) * 10;
    const bin = trainBuckets.get(bucket) || { count: 0, hits: 0 };
    bin.count += 1;
    bin.hits += s.hit ? 1 : 0;
    trainBuckets.set(bucket, bin);
  }
  const anchors = makeMonotonic([
    [0, 1] as [number, number],
    ...[...trainBuckets.entries()]
      .filter(([, bin]) => bin.count >= 40)
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, bin]) => [bucket + 5, bin.hits / bin.count * 100] as [number, number]),
    [100, 99] as [number, number],
  ]);

  console.log('--- 训练集校准锚点（原始概率 → 真实命中率） ---');
  console.log(JSON.stringify(anchors));

  const calibratedTest = bucketMetrics(test, true, anchors);
  console.log('--- 校准后（测试集，新锚点） ---');
  console.table(calibratedTest.rows);
  console.log(`ECE=${calibratedTest.ece}%  Brier=${calibratedTest.brier}`);

  // 端到端口径：当前线上概率（含已内置的旧校准表）在测试集上的表现，
  // 用于判断现有校准表在模型改动后是否仍然有效。
  const endToEnd = bucketMetrics(test, false, [], true);
  console.log('--- 端到端（测试集，当前内置校准表） ---');
  console.table(endToEnd.rows);
  console.log(`ECE=${endToEnd.ece}%  Brier=${endToEnd.brier}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
