import { admissionScoreService, type AdmissionScore } from '../services/admissionScoreService';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { cacheService } from '../services/cacheService';
import { extractSubjectCodes } from './dataUtils';
import type { SchoolScore } from './dataUtils';

export async function loadSchoolDataFromSupabase(province: string = '海南'): Promise<SchoolScore[]> {
  cacheService.clearByPrefix('getByProvince');
  cacheService.clearByPrefix('getBySchool');
  cacheService.clearByPrefix('getByProvinceAndYear');
  cacheService.clearByPrefix('getByYear');
  
  const result: Map<string, SchoolScore> = new Map();
  
  const admissionData = await loadFromAdmissionScores(province);
  for (const item of admissionData) {
    const key = item.name;
    const existing = result.get(key);
    if (existing) {
      if (item.score2025 !== null && existing.score2025 === null) existing.score2025 = item.score2025;
      if (item.score2024 !== null && existing.score2024 === null) existing.score2024 = item.score2024;
      if (item.score2023 !== null && existing.score2023 === null) existing.score2023 = item.score2023;
    } else {
      result.set(key, item);
    }
  }
  
  const majorData = await loadFromMajorScores(province);
  for (const item of majorData) {
    const key = item.name;
    const existing = result.get(key);
    if (existing) {
      if (item.score2025 !== null && existing.score2025 === null) existing.score2025 = item.score2025;
      if (item.score2024 !== null && existing.score2024 === null) existing.score2024 = item.score2024;
      if (item.score2023 !== null && existing.score2023 === null) existing.score2023 = item.score2023;
    } else {
      result.set(key, item);
    }
  }
  
  return Array.from(result.values());
}

async function loadFromAdmissionScores(province: string): Promise<SchoolScore[]> {
  const result: Map<string, SchoolScore> = new Map();
  
  for (const year of [2023, 2024, 2025]) {
    let scores: AdmissionScore[] = [];
    
    try {
      scores = await admissionScoreService.getByProvinceAndYear(province, year);
    } catch (error) {
      console.warn(`按省份查询失败，尝试按年份查询:`, error);
      scores = await admissionScoreService.getByYear(year);
    }
    
    for (const score of scores) {
      const key = score.school_name;
      if (!key) continue;
      
      const existing = result.get(key);
      
      if (existing) {
        if (year === 2025) {
          if (existing.score2025 === null || score.score < existing.score2025) {
            existing.score2025 = score.score;
          }
        } else if (year === 2024) {
          if (existing.score2024 === null || score.score < existing.score2024) {
            existing.score2024 = score.score;
          }
        } else if (year === 2023) {
          if (existing.score2023 === null || score.score < existing.score2023) {
            existing.score2023 = score.score;
          }
        }
      } else {
        const subjectCode = parseSubjectRequirementToCode(score.subject_requirement);
        
        result.set(key, {
          code: key,
          name: key,
          subject: subjectCode,
          subject_requirement: score.subject_requirement ?? null,
          province: extractProvince(key) || '其他',
          level: '普通本科',
          nature: '公办',
          region: province,
          score2025: year === 2025 ? score.score : null,
          score2024: year === 2024 ? score.score : null,
          score2023: year === 2023 ? score.score : null,
        });
      }
    }
  }
  
  return Array.from(result.values());
}

async function loadFromMajorScores(province: string): Promise<SchoolScore[]> {
  const result: Map<string, SchoolScore> = new Map();
  
  try {
    const scores: MajorScore[] = await majorScoreService.getByProvince(province);
    
    for (const score of scores) {
      if (!score.school_name || score.min_score === null) continue;
      
      const key = score.school_name;
      const existing = result.get(key);
      
      if (existing) {
        if (score.year === 2025) {
          if (existing.score2025 === null || score.min_score < existing.score2025) {
            existing.score2025 = score.min_score;
          }
        } else if (score.year === 2024) {
          if (existing.score2024 === null || score.min_score < existing.score2024) {
            existing.score2024 = score.min_score;
          }
        } else if (score.year === 2023) {
          if (existing.score2023 === null || score.min_score < existing.score2023) {
            existing.score2023 = score.min_score;
          }
        }
        
        const subjectCode = parseSubjectRequirementToCode(score.subject_requirement);
        if (subjectCode > 0 && existing.subject === 0) {
          existing.subject = subjectCode;
        }
      } else {
          const subjectCode = parseSubjectRequirementToCode(score.subject_requirement);
          
          result.set(key, {
            code: key,
            name: score.school_name,
            subject: subjectCode,
            subject_requirement: score.subject_requirement,
            province: score.province || score.school_name ? extractProvince(score.school_name) : '其他',
            level: '普通本科',
            nature: '公办',
            region: province,
            score2025: score.year === 2025 ? score.min_score : null,
            score2024: score.year === 2024 ? score.min_score : null,
            score2023: score.year === 2023 ? score.min_score : null,
          });
        }
    }
  } catch (error) {
    console.warn(`从major_scores表加载数据失败:`, error);
  }
  
  return Array.from(result.values());
}

function parseSubjectRequirementToCode(requirement: string | null): number {
  if (!requirement) return 0;
  
  const codes = extractSubjectCodes(requirement);
  if (codes.length === 0) return 0;
  
  const sortedCodes = [...codes].sort((a, b) => parseInt(b) - parseInt(a));
  return parseInt(sortedCodes.join('')) || 0;
}

export async function loadSchoolDataFromSupabaseByScoreRange(
  minScore: number,
  maxScore: number,
  province: string = '海南'
): Promise<SchoolScore[]> {
  const allData = await loadSchoolDataFromSupabase(province);
  return allData.filter(s => {
    const scores = [s.score2025, s.score2024, s.score2023].filter((s): s is number => s !== null);
    if (scores.length === 0) return false;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avgScore >= minScore && avgScore <= maxScore;
  });
}

function extractProvince(schoolName: string): string {
  const provinceMap: Record<string, string> = {
    '北京': '北京', '天津': '天津', '河北': '河北', '山西': '山西', '内蒙古': '内蒙古',
    '辽宁': '辽宁', '吉林': '吉林', '黑龙江': '黑龙江', '上海': '上海', '江苏': '江苏',
    '浙江': '浙江', '安徽': '安徽', '福建': '福建', '江西': '江西', '山东': '山东',
    '河南': '河南', '湖北': '湖北', '湖南': '湖南', '广东': '广东', '广西': '广西',
    '海南': '海南', '重庆': '重庆', '四川': '四川', '贵州': '贵州', '云南': '云南',
    '西藏': '西藏', '陕西': '陕西', '甘肃': '甘肃', '青海': '青海', '宁夏': '宁夏',
    '新疆': '新疆', '香港': '香港', '澳门': '澳门', '台湾': '台湾',
  };
  
  for (const [key, value] of Object.entries(provinceMap)) {
    if (schoolName.includes(key)) {
      return value;
    }
  }
  
  return '其他';
}
