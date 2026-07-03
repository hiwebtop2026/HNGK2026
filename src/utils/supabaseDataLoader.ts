import { admissionScoreService, type AdmissionScore } from '../services/admissionScoreService';
import type { SchoolScore } from './dataUtils';

export async function loadSchoolDataFromSupabase(): Promise<SchoolScore[]> {
  const result: Map<string, SchoolScore> = new Map();
  
  for (const year of [2023, 2024, 2025]) {
    const scores = await admissionScoreService.getByYear(year);
    
    for (const score of scores) {
      const existing = result.get(score.group_code);
      
      if (existing) {
        if (year === 2025) existing.score2025 = score.score;
        else if (year === 2024) existing.score2024 = score.score;
        else if (year === 2023) existing.score2023 = score.score;
      } else {
        result.set(score.group_code, {
          code: score.group_code,
          name: score.group_name,
          subject: parseInt(score.subject_requirement) || 0,
          province: '其他',
          level: '普通本科',
          nature: '公办',
          region: '海南',
          score2025: year === 2025 ? score.score : null,
          score2024: year === 2024 ? score.score : null,
          score2023: year === 2023 ? score.score : null,
        });
      }
    }
  }
  
  return Array.from(result.values());
}

export async function loadSchoolDataFromSupabaseByScoreRange(
  minScore: number,
  maxScore: number
): Promise<SchoolScore[]> {
  const scores = await admissionScoreService.getByScoreRange(minScore, maxScore);
  const result: Map<string, SchoolScore> = new Map();
  
  for (const score of scores) {
    const existing = result.get(score.group_code);
    
    if (existing) {
      if (score.year === 2025) existing.score2025 = score.score;
      else if (score.year === 2024) existing.score2024 = score.score;
      else if (score.year === 2023) existing.score2023 = score.score;
    } else {
      result.set(score.group_code, {
        code: score.group_code,
        name: score.group_name,
        subject: parseInt(score.subject_requirement) || 0,
        province: '其他',
        level: '普通本科',
        nature: '公办',
        region: '海南',
        score2025: score.year === 2025 ? score.score : null,
        score2024: score.year === 2024 ? score.score : null,
        score2023: score.year === 2023 ? score.score : null,
      });
    }
  }
  
  return Array.from(result.values());
}