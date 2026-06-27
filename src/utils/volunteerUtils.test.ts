import { describe, it, expect } from 'vitest';
import {
  calculateAdmissionProbability,
  calculateScoreTrend,
  filterSchools,
} from './volunteerUtils';

describe('calculateAdmissionProbability', () => {
  it('should return 99% when diff >= 30', () => {
    expect(calculateAdmissionProbability(570, 600)).toBe(99);
    expect(calculateAdmissionProbability(565, 600)).toBe(99);
  });

  it('should return high probability for positive diffs', () => {
    expect(calculateAdmissionProbability(580, 600)).toBe(94);
    expect(calculateAdmissionProbability(585, 600)).toBe(88);
    expect(calculateAdmissionProbability(590, 600)).toBe(78);
    expect(calculateAdmissionProbability(595, 600)).toBe(65);
    expect(calculateAdmissionProbability(600, 600)).toBe(50);
  });

  it('should return medium probability for small negative diffs', () => {
    expect(calculateAdmissionProbability(605, 600)).toBe(38);
    expect(calculateAdmissionProbability(610, 600)).toBe(28);
    expect(calculateAdmissionProbability(615, 600)).toBe(18);
  });

  it('should return low probability for large negative diffs', () => {
    expect(calculateAdmissionProbability(620, 600)).toBe(12);
    expect(calculateAdmissionProbability(625, 600)).toBe(8);
    expect(calculateAdmissionProbability(630, 600)).toBe(5);
    expect(calculateAdmissionProbability(650, 600)).toBe(2);
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

describe('filterSchools', () => {
  const mockSchools = [
    {
      code: '10001',
      name: '大学A(理科)',
      subject: 54,
      province: '北京',
      level: '985',
      score2025: 605,
      score2024: 600,
      score2023: 595,
    },
    {
      code: '10002',
      name: '大学B(理科)',
      subject: 54,
      province: '北京',
      level: '985',
      score2025: 598,
      score2024: 595,
      score2023: 592,
    },
    {
      code: '10003',
      name: '大学C(文科)',
      subject: 87,
      province: '上海',
      level: '985',
      score2025: 590,
      score2024: 588,
      score2023: 585,
    },
    {
      code: '10004',
      name: '大学D(计算机类)',
      subject: 54,
      province: '海南',
      level: '普通本科',
      score2025: 580,
      score2024: 578,
      score2023: 575,
    },
  ];

  it('should filter schools by subject', () => {
    const results = filterSchools(mockSchools, 600, 30, 54, 10);
    expect(results.length).toBe(3);
    expect(results.every(r => r.subject === 54)).toBe(true);
  });

  it('should filter schools by level', () => {
    const results = filterSchools(mockSchools, 600, 30, 54, 10, ['普通本科']);
    expect(results.length).toBe(1);
    expect(results[0].level).toBe('普通本科');
  });

  it('should filter schools by province', () => {
    const results = filterSchools(mockSchools, 600, 30, 54, 10, [], ['北京']);
    expect(results.length).toBe(2);
    expect(results.every(r => r.province === '北京')).toBe(true);
  });

  it('should return empty when no schools match', () => {
    const results = filterSchools(mockSchools, 800, 5, 54, 10);
    expect(results.length).toBe(0);
  });

  it('should return results with admissionProbability and scoreTrend', () => {
    const results = filterSchools(mockSchools, 580, 30, 54, 5);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r.admissionProbability).toBeDefined();
      expect(['up', 'down', 'stable']).toContain(r.scoreTrend);
    });
  });
});
