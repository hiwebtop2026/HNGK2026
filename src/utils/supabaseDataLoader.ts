import { admissionScoreService, type AdmissionScore } from '../services/admissionScoreService';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { cacheService } from '../services/cacheService';
import { extractSubjectCodes } from './dataUtils';
import type { SchoolScore } from './dataUtils';
import { getUniversityLevel } from '../data/universityLevels';

function extractSchoolNameKey(schoolName: string): string {
  const cleaned = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  return cleaned;
}

// 院校层次判断统一使用公共数据文件 src/data/universityLevels.ts
// 避免在每个地区的 schoolData 中冗余存储 level 字段
function getSchoolLevel(schoolName: string): string {
  return getUniversityLevel(schoolName);
}

function normalizeSchoolName(schoolName: string): string {
  const name = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  const universitySuffixes = ['大学', '学院', '职业技术学院', '高等专科学校', '师范学院', '理工大学', '科技大学', '工业大学', '农业大学', '医科大学', '中医药大学', '财经大学', '政法大学', '外国语大学', '邮电大学', '交通大学', '航空航天大学', '矿业大学', '石油大学', '地质大学', '林业大学', '海洋大学', '海事大学', '体育学院', '艺术学院', '音乐学院', '美术学院', '戏剧学院', '电影学院', '传媒大学'];
  
  for (const suffix of universitySuffixes) {
    if (name.endsWith(suffix)) {
      return name;
    }
  }
  
  return name;
}

export async function loadSchoolDataFromSupabase(province: string = '海南'): Promise<SchoolScore[]> {
  if (import.meta.env.DEV) console.log(`[DEBUG] ==================== 开始加载${province}数据 ====================`);
  
  cacheService.clearAll();
  if (import.meta.env.DEV) console.log(`[DEBUG] 缓存已清除`);
  
  const result: Map<string, SchoolScore> = new Map();
  
  const admissionData = await loadFromAdmissionScores(province);
  if (import.meta.env.DEV) console.log(`[DEBUG] admission_scores表加载了 ${admissionData.length} 所学校`);
  
  for (const item of admissionData) {
    const key = extractSchoolNameKey(item.name);
    const existing = result.get(key);
    if (existing) {
      if (item.score2025 !== null && existing.score2025 === null) existing.score2025 = item.score2025;
      if (item.score2024 !== null && existing.score2024 === null) existing.score2024 = item.score2024;
      if (item.score2023 !== null && existing.score2023 === null) existing.score2023 = item.score2023;
      
      if (item.subject !== 0 && existing.subject === 0) {
        existing.subject = item.subject;
      }
      if (item.subject_requirement && existing.subject_requirement) {
        const existingReqs = existing.subject_requirement.split('|');
        const newReq = item.subject_requirement;
        if (!existingReqs.includes(newReq)) {
          existing.subject_requirement += `|${newReq}`;
        }
      } else if (item.subject_requirement) {
        existing.subject_requirement = item.subject_requirement;
      }
    } else {
      result.set(key, { ...item });
    }
  }
  
  if (import.meta.env.DEV) console.log(`[DEBUG] 合并admission_scores后共有 ${result.size} 所学校`);
  
  const majorData = await loadFromMajorScores(province);
  if (import.meta.env.DEV) console.log(`[DEBUG] major_scores表加载了 ${majorData.length} 所学校`);
  
  for (const item of majorData) {
    const key = extractSchoolNameKey(item.name);
    const existing = result.get(key);
    
    if (!existing) {
      const normalizedName = normalizeSchoolName(item.name);
      const normalizedKey = extractSchoolNameKey(normalizedName);
      const matched = result.get(normalizedKey);
      if (matched) {
        if (item.score2025 !== null && matched.score2025 === null) matched.score2025 = item.score2025;
        if (item.score2024 !== null && matched.score2024 === null) matched.score2024 = item.score2024;
        if (item.score2023 !== null && matched.score2023 === null) matched.score2023 = item.score2023;
        if (item.subject !== 0 && matched.subject === 0) {
          matched.subject = item.subject;
        }
        if (item.subject_requirement && matched.subject_requirement) {
          const existingReqs = matched.subject_requirement.split('|');
          const newReq = item.subject_requirement;
          if (!existingReqs.includes(newReq)) {
            matched.subject_requirement += `|${newReq}`;
          }
        } else if (item.subject_requirement) {
          matched.subject_requirement = item.subject_requirement;
        }
        continue;
      }
    }
    
    if (existing) {
      if (item.score2025 !== null && existing.score2025 === null) existing.score2025 = item.score2025;
      if (item.score2024 !== null && existing.score2024 === null) existing.score2024 = item.score2024;
      if (item.score2023 !== null && existing.score2023 === null) existing.score2023 = item.score2023;
      if (item.subject !== 0 && existing.subject === 0) {
        existing.subject = item.subject;
      }
      if (item.subject_requirement && existing.subject_requirement) {
        const existingReqs = existing.subject_requirement.split('|');
        const newReq = item.subject_requirement;
        if (!existingReqs.includes(newReq)) {
          existing.subject_requirement += `|${newReq}`;
        }
      } else if (item.subject_requirement) {
        existing.subject_requirement = item.subject_requirement;
      }
    } else {
      result.set(key, item);
    }
  }
  
  if (import.meta.env.DEV) console.log(`[DEBUG] 合并major_scores后共有 ${result.size} 所学校`);
  if (import.meta.env.DEV) console.log(`[DEBUG] 返回学校列表前5所: ${Array.from(result.values()).slice(0, 5).map(s => s.name).join(', ')}`);
  if (import.meta.env.DEV) console.log(`[DEBUG] ==================== 加载${province}数据完成 ====================`);
  
  return Array.from(result.values());
}

async function loadFromAdmissionScores(province: string): Promise<SchoolScore[]> {
  const result: Map<string, SchoolScore> = new Map();
  
  for (const year of [2023, 2024, 2025]) {
    let scores: AdmissionScore[] = [];
    
    try {
      scores = await admissionScoreService.getByProvinceAndYear(province, year);
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`按省份查询失败，跳过该年份:`, error);
      continue;
    }
    
    if (import.meta.env.DEV) console.log(`[DEBUG] admission_scores ${year}年原始记录数: ${scores.length}`);
    
    for (const score of scores) {
      if (!score.school_name) continue;
      
      const key = extractSchoolNameKey(score.school_name);
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
        
        const subjectCode = parseSubjectRequirementToCode(score.subject_requirement);
        if (subjectCode > 0 && existing.subject === 0) {
          existing.subject = subjectCode;
        }
        if (score.subject_requirement && !existing.subject_requirement) {
          existing.subject_requirement = score.subject_requirement;
        }
      } else {
        const subjectCode = parseSubjectRequirementToCode(score.subject_requirement);
        
        result.set(key, {
          code: key,
          name: normalizeSchoolName(score.school_name),
          subject: subjectCode,
          subject_requirement: score.subject_requirement ?? null,
          province: province,
          level: getSchoolLevel(score.school_name),
          nature: '公办',
          region: province,
          score2025: year === 2025 ? score.score : null,
          score2024: year === 2024 ? score.score : null,
          score2023: year === 2023 ? score.score : null,
        });
      }
    }
  }
  
  if (import.meta.env.DEV) console.log(`[DEBUG] admission_scores聚合后学校数: ${result.size}`);
  return Array.from(result.values());
}

async function loadFromMajorScores(province: string): Promise<SchoolScore[]> {
  const result: Map<string, SchoolScore> = new Map();
  let skipped = 0;
  
  try {
    if (import.meta.env.DEV) console.log(`[DEBUG] 开始调用 majorScoreService.getByProvince('${province}')`);
    const scores: MajorScore[] = await majorScoreService.getByProvince(province);
    if (import.meta.env.DEV) console.log(`[DEBUG] major_scores原始记录数: ${scores.length}`);
    
    if (scores.length > 0) {
      const firstItem = scores[0];
      if (import.meta.env.DEV) console.log(`[DEBUG] 第一条记录: province=${firstItem.province}, school_name=${firstItem.school_name}, year=${firstItem.year}, min_score=${firstItem.min_score}`);
    }
    
    const provinceValues = [...new Set(scores.map(s => s.province))];
    if (import.meta.env.DEV) console.log(`[DEBUG] province字段值分布: ${provinceValues.join(', ')}`);
    
    const schoolNames = [...new Set(scores.map(s => s.school_name))];
    if (import.meta.env.DEV) console.log(`[DEBUG] 原始学校数: ${schoolNames.length}`);
    if (import.meta.env.DEV) console.log(`[DEBUG] 前10所学校: ${schoolNames.slice(0, 10).join(', ')}`);
    
    for (const score of scores) {
      if (!score.school_name || score.min_score === null) {
        skipped++;
        continue;
      }
      
      const key = extractSchoolNameKey(score.school_name);
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
        if (score.subject_requirement && !existing.subject_requirement) {
          existing.subject_requirement = score.subject_requirement;
        }
      } else {
          const subjectCode = parseSubjectRequirementToCode(score.subject_requirement);
          
          result.set(key, {
            code: key,
            name: normalizeSchoolName(score.school_name),
            subject: subjectCode,
            subject_requirement: score.subject_requirement,
            province: province,
            level: getSchoolLevel(score.school_name),
            nature: '公办',
            region: province,
            score2025: score.year === 2025 ? score.min_score : null,
            score2024: score.year === 2024 ? score.min_score : null,
            score2023: score.year === 2023 ? score.min_score : null,
          });
        }
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`从major_scores表加载数据失败:`, error);
  }
  
  if (import.meta.env.DEV) console.log(`[DEBUG] major_scores跳过的记录数: ${skipped}`);
  if (import.meta.env.DEV) console.log(`[DEBUG] major_scores聚合后学校数: ${result.size}`);
  
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

// extractProvince 函数已删除：未被任何地方调用，属于冗余代码
// 如需根据院校名称提取省份，可从 schoolData 的 province 字段直接获取
