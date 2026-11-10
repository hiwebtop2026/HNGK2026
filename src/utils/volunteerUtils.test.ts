import { describe, it, expect, vi } from 'vitest';
import type { SchoolScore } from './dataUtils';
import {
  calculateScoreTrend,
  filterSchools,
  analyzeRank,
  calculateComprehensiveAdmissionProbability,
  convertScoreToEquivalent,
  getSmartTier,
} from './volunteerUtils';
import type { ScoreDistribution } from '../services/scoreDistributionService';
import { calculateAdmissionProbability } from './trendAnalyzer';

// Mock 网络服务，使单元测试脱离真实 Supabase 网络请求：
// filterSchools 内部会调用 majorScoreService.getByProvince 与
// scoreDistributionService.getRankByScore，未 mock 时在受限网络
// 环境下会挂起直到测试超时。
vi.mock('../services/majorScoreService', () => ({
  majorScoreService: {
    getByProvince: vi.fn(async () => []),
    getBySchoolAndProvince: vi.fn(async () => []),
  },
}));

vi.mock('../services/scoreDistributionService', () => ({
  scoreDistributionService: {
    getRankByScore: vi.fn(async () => null),
    getStats: vi.fn(async () => null),
  },
}));

describe('calculateAdmissionProbability', () => {
  it('should return 99% when diff >= 30', () => {
    expect(calculateAdmissionProbability(570, 600, 570, 570, 570).finalProbability).toBe(99);
    expect(calculateAdmissionProbability(565, 600, 565, 565, 565).finalProbability).toBe(99);
  });

  it('should return high probability for positive diffs', () => {
    expect(calculateAdmissionProbability(580, 600, 580, 580, 580).finalProbability).toBe(94);
    expect(calculateAdmissionProbability(585, 600, 585, 585, 585).finalProbability).toBe(88);
    expect(calculateAdmissionProbability(590, 600, 590, 590, 590).finalProbability).toBe(78);
    expect(calculateAdmissionProbability(595, 600, 595, 595, 595).finalProbability).toBe(65);
    expect(calculateAdmissionProbability(600, 600, 600, 600, 600).finalProbability).toBe(50);
  });

  it('should return medium probability for small negative diffs', () => {
    expect(calculateAdmissionProbability(605, 600, 605, 605, 605).finalProbability).toBe(38);
    expect(calculateAdmissionProbability(610, 600, 610, 610, 610).finalProbability).toBe(28);
    expect(calculateAdmissionProbability(615, 600, 615, 615, 615).finalProbability).toBe(18);
  });

  it('should return low probability for large negative diffs', () => {
    expect(calculateAdmissionProbability(620, 600, 620, 620, 620).finalProbability).toBe(12);
    expect(calculateAdmissionProbability(625, 600, 625, 625, 625).finalProbability).toBe(8);
    expect(calculateAdmissionProbability(630, 600, 630, 630, 630).finalProbability).toBe(5);
    expect(calculateAdmissionProbability(650, 600, 650, 650, 650).finalProbability).toBe(2);
  });
});

describe('calculateScoreTrend', () => {
  it('should return "up" when recent scores are higher', () => {
    expect(calculateScoreTrend(600, 595, 590)).toBe('up');
    expect(calculateScoreTrend(605, 598, 595)).toBe('up');
  });

  it('should return "down" when recent scores are lower', () => {
    expect(calculateScoreTrend(590, 595, 600)).toBe('down');
    expect(calculateScoreTrend(595, 598, 605)).toBe('down');
  });

  it('should return "stable" when scores are similar', () => {
    expect(calculateScoreTrend(600, 600, 600)).toBe('stable');
    expect(calculateScoreTrend(600, 598, 602)).toBe('stable');
    expect(calculateScoreTrend(600, 599, 601)).toBe('stable');
  });

  it('should return "stable" when only one score is available', () => {
    expect(calculateScoreTrend(600, null, null)).toBe('stable');
    expect(calculateScoreTrend(null, 600, null)).toBe('stable');
  });
});

describe('analyzeRank', () => {
  it('should return rank analysis with estimated values when no data found', async () => {
    const result = await analyzeRank(600, 590, '海南');
    expect(result).not.toBeNull();
    expect(result?.candidateRank).toBeDefined();
    expect(result?.schoolRank).toBeDefined();
    expect(result?.rankDiff).toBeDefined();
    expect(result?.rankPercentage).toBeDefined();
  });

  it('should return estimated rank analysis for invalid scores', async () => {
    const result = await analyzeRank(-100, 590, '海南');
    expect(result).toBeDefined();
    expect(result?.candidateRank).toBeGreaterThanOrEqual(1);
    expect(result?.schoolRank).toBeGreaterThanOrEqual(1);
  });
});

describe('calculateComprehensiveAdmissionProbability', () => {
  it('should return probability with all factors', () => {
    const rankAnalysis = {
      candidateRank: 10000,
      schoolRank: 12000,
      rankDiff: 2000,
      rankPercentage: 83.33,
      totalCandidates: 70000,
    };
    
    const result = calculateComprehensiveAdmissionProbability(
      600, 590, 590, 588, 585, '海南', rankAnalysis, null
    );
    
    expect(result.probability).toBeDefined();
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(100);
    expect(result.factors.scoreFactor).toBeDefined();
    expect(result.factors.rankFactor).toBeDefined();
    expect(result.factors.trendFactor).toBeDefined();
    expect(result.factors.volatilityFactor).toBeDefined();
  });

  it('should work without rank analysis', () => {
    const result = calculateComprehensiveAdmissionProbability(
      600, 590, 590, 588, 585, '海南', null, null
    );
    
    expect(result.probability).toBeDefined();
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(100);
  });
});

describe('getSmartTier', () => {
  it('should return "冲" for schools above candidate score', () => {
    const strategyConfig = { chongScoreDiff: 20, wenScoreDiff: 10, baoScoreDiff: 15, chongRatio: 0.25, wenRatio: 0.5, baoRatio: 0.25 };
    const tier = getSmartTier(700, 730, null, strategyConfig, '海南');
    expect(tier).toBe('冲');
  });

  it('should return "稳" for schools near candidate score', () => {
    const strategyConfig = { chongScoreDiff: 20, wenScoreDiff: 10, baoScoreDiff: 15, chongRatio: 0.25, wenRatio: 0.5, baoRatio: 0.25 };
    const tier = getSmartTier(700, 695, null, strategyConfig, '海南');
    expect(tier).toBe('稳');
  });

  it('should return "保" for schools below candidate score', () => {
    const strategyConfig = { chongScoreDiff: 20, wenScoreDiff: 10, baoScoreDiff: 15, chongRatio: 0.25, wenRatio: 0.5, baoRatio: 0.25 };
    const tier = getSmartTier(700, 650, null, strategyConfig, '海南');
    expect(tier).toBe('保');
  });
});

describe('convertScoreToEquivalent', () => {
  const makeRows = (year: number, entries: Array<[number, number]>): ScoreDistribution[] =>
    entries.map(([score, cumulative], index) => ({
      id: `${year}-${score}`,
      province: '海南',
      year,
      score,
      count: cumulative - (entries[index + 1]?.[1] ?? 0),
      cumulative_count: cumulative,
      min_rank: (entries[index + 1]?.[1] ?? 0) + 1,
      max_rank: cumulative,
      rank: (entries[index + 1]?.[1] ?? 0) + 1,
      category: '普通类',
      created_at: '',
    }));

  // 源年整体偏松、目标年更卷：同样分数在目标年应折算出更高分
  const distributions = {
    2024: makeRows(2024, [[700, 100], [650, 3000], [600, 12000], [550, 23000], [500, 37000]]),
    2026: makeRows(2026, [[710, 90], [660, 3000], [610, 12000], [560, 24000], [510, 38000]]),
  };

  it('should convert a source score to the target-year equivalent score', () => {
    expect(convertScoreToEquivalent(650, 2024, distributions, 2026)).toBe(660);
    expect(convertScoreToEquivalent(600, 2024, distributions, 2026)).toBe(610);
    expect(convertScoreToEquivalent(550, 2024, distributions, 2026)).toBe(560);
  });

  it('should keep the score unchanged when source and target years match', () => {
    expect(convertScoreToEquivalent(600, 2026, distributions, 2026)).toBe(600);
  });

  it('should fall back to the original score when distributions are missing', () => {
    expect(convertScoreToEquivalent(600, 2023, distributions, 2026)).toBe(600);
    expect(convertScoreToEquivalent(null, 2024, distributions, 2026)).toBeNull();
  });
});

describe('filterSchools', () => {
  const mockSchools: SchoolScore[] = [
    {
      code: '10001',
      name: '大学A(理科)',
      subject: 54,
      subject_requirement: '物+化(2科必选)',
      province: '北京',
      level: '985',
      nature: '公办',
      region: '海南',
      score2025: 605,
      score2024: 600,
      score2023: 595,
    },
    {
      code: '10002',
      name: '大学B(理科)',
      subject: 54,
      subject_requirement: '物+化(2科必选)',
      province: '北京',
      level: '985',
      nature: '公办',
      region: '海南',
      score2025: 598,
      score2024: 595,
      score2023: 592,
    },
    {
      code: '10003',
      name: '大学C(文科)',
      subject: 87,
      subject_requirement: '史+政(2科必选)',
      province: '上海',
      level: '985',
      nature: '公办',
      region: '海南',
      score2025: 590,
      score2024: 588,
      score2023: 585,
    },
    {
      code: '10004',
      name: '大学D(计算机类)',
      subject: 54,
      subject_requirement: '物+化(2科必选)',
      province: '海南',
      level: '普通本科',
      nature: '公办',
      region: '海南',
      score2025: 580,
      score2024: 578,
      score2023: 575,
    },
  ];

  it('should filter schools by subject', async () => {
    const results = await filterSchools(mockSchools, 600, 30, 54, 10);
    expect(results.length).toBe(3);
    expect(results.every(r => r.subject === 54)).toBe(true);
  });

  it('should filter schools by level', async () => {
    const results = await filterSchools(mockSchools, 600, 30, 54, 10, ['普通本科']);
    expect(results.length).toBe(1);
    expect(results[0].level).toBe('普通本科');
  });

  it('should filter schools by province', async () => {
    const results = await filterSchools(mockSchools, 600, 30, 54, 10, [], ['北京']);
    expect(results.length).toBe(2);
    expect(results.every(r => r.province === '北京')).toBe(true);
  });

  it('should include schools well below candidate score as safe (保) choices', async () => {
    // 高分考生（800分）远高于所有学校投档线时，这些学校应作为保底志愿入选
    const results = await filterSchools(mockSchools, 800, 5, 54, 10);
    expect(results.length).toBe(3);
    expect(results.every(r => r.tier === '保')).toBe(true);
  });

  it('should return results with admissionProbability and scoreTrend', async () => {
    const results = await filterSchools(mockSchools, 580, 30, 54, 5);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r.admissionProbability).toBeDefined();
      expect(['up', 'down', 'stable']).toContain(r.scoreTrend);
    });
  });

  it('should return results with rank information', async () => {
    const results = await filterSchools(mockSchools, 600, 30, 54, 5);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r.rankDiff).toBeDefined();
      expect(r.rankPercentage).toBeDefined();
      expect(r.candidateRank).toBeDefined();
      expect(r.schoolRank).toBeDefined();
    });
  });

  it('should cap the number of groups selected from the same university', async () => {
    // 同一所院校的 4 个专业组 + 另一所院校的 4 个专业组，共 8 个候选，
    // 30 个志愿中同一院校最多保留 2 个组，避免方案被少数学校占满。
    const sameSchoolGroups: SchoolScore[] = [
      '测试大学(01)', '测试大学(02)', '测试大学(03)', '测试大学(04)',
      '另一大学(01)', '另一大学(02)', '另一大学(03)', '另一大学(04)',
    ].map((name, i) => ({
      code: `test-${i}`,
      name,
      subject: 54,
      subject_requirement: '物+化(2科必选)',
      province: '北京',
      level: '普通本科',
      nature: '公办',
      region: '海南',
      score2025: 590 - i,
      score2024: 585 - i,
      score2023: 580 - i,
    }));

    const results = await filterSchools(sameSchoolGroups, 800, 5, 54, 4);
    expect(results.length).toBe(4);
    const perSchool = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.schoolName] = (acc[r.schoolName] || 0) + 1;
      return acc;
    }, {});
    Object.values(perSchool).forEach(count => expect(count).toBeLessThanOrEqual(2));
  });
});