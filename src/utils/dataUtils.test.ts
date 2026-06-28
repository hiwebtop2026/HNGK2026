import { describe, it, expect } from 'vitest';
import {
  parseSubjectRequirement,
  getRefScore,
  getTier,
  getRecommendationReason,
  matchMajorCategories,
} from './dataUtils';

describe('parseSubjectRequirement', () => {
  it('should return "不限" for code 0', () => {
    expect(parseSubjectRequirement(0)).toBe('不限');
  });

  it('should return single subject name for single digit codes', () => {
    expect(parseSubjectRequirement(4)).toBe('物理');
    expect(parseSubjectRequirement(5)).toBe('化学');
    expect(parseSubjectRequirement(6)).toBe('生物');
    expect(parseSubjectRequirement(7)).toBe('思想政治');
    expect(parseSubjectRequirement(8)).toBe('历史');
    expect(parseSubjectRequirement(9)).toBe('地理');
  });

  it('should return "选一门即可" for ascending codes', () => {
    expect(parseSubjectRequirement(45)).toBe('物理+化学(选一门即可)');
    expect(parseSubjectRequirement(78)).toBe('思想政治+历史(选一门即可)');
    expect(parseSubjectRequirement(456)).toBe('物理+化学+生物(选一门即可)');
  });

  it('should return "均须选考" for descending codes', () => {
    expect(parseSubjectRequirement(54)).toBe('化学+物理(均须选考)');
    expect(parseSubjectRequirement(87)).toBe('历史+思想政治(均须选考)');
    expect(parseSubjectRequirement(654)).toBe('生物+化学+物理(均须选考)');
  });
});

describe('getRefScore', () => {
  it('should return 2025 score when available', () => {
    expect(getRefScore(600, 580, 560)).toBe(600);
  });

  it('should return 2024 score when 2025 is null', () => {
    expect(getRefScore(null, 580, 560)).toBe(580);
  });

  it('should return 2023 score when 2025 and 2024 are null', () => {
    expect(getRefScore(null, null, 560)).toBe(560);
  });

  it('should return 0 when all scores are null', () => {
    expect(getRefScore(null, null, null)).toBe(0);
  });
});

describe('getTier', () => {
  it('should return "冲" when refScore is more than 10 points above baseScore', () => {
    expect(getTier(615, 600)).toBe('冲');
    expect(getTier(611, 600)).toBe('冲');
  });

  it('should return "稳" when refScore is within ±10 points of baseScore', () => {
    expect(getTier(600, 600)).toBe('稳');
    expect(getTier(610, 600)).toBe('稳');
    expect(getTier(595, 600)).toBe('稳');
  });

  it('should return "保" when refScore is more than 5 points below baseScore', () => {
    expect(getTier(594, 600)).toBe('保');
    expect(getTier(580, 600)).toBe('保');
  });
});

describe('getRecommendationReason', () => {
  it('should return appropriate reason for chong (冲) tier', () => {
    const reason = getRecommendationReason(615, 600);
    expect(reason).toContain('高于考生分数');
    expect(reason).toContain('冲刺');
  });

  it('should return appropriate reason for wen (稳) tier', () => {
    const reason = getRecommendationReason(600, 600);
    expect(reason).toContain('录取把握较大');
    expect(reason).toContain('理想的稳投');
  });

  it('should return appropriate reason for bao (保) tier', () => {
    const reason = getRecommendationReason(585, 600);
    expect(reason).toContain('低于考生分数');
    expect(reason).toContain('录取概率很高');
  });
});

describe('matchMajorCategories', () => {
  it('should match computer science categories', () => {
    const cats = matchMajorCategories('吉林大学(计算机类)');
    expect(cats).toContain('cs');
  });

  it('should match multiple categories', () => {
    const cats = matchMajorCategories('北京邮电大学(电子信息类)');
    expect(cats).toContain('cs');
    expect(cats).toContain('ee');
  });

  it('should return empty array for unknown names', () => {
    const cats = matchMajorCategories('某某大学(未知专业)');
    expect(cats).toEqual([]);
  });
});
