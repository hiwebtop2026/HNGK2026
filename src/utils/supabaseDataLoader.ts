import { admissionScoreService, type AdmissionScore } from '../services/admissionScoreService';
import { majorScoreService, type MajorScore } from '../services/majorScoreService';
import { cacheService } from '../services/cacheService';
import { extractSubjectCodes } from './dataUtils';
import type { SchoolScore } from './dataUtils';

function extractSchoolNameKey(schoolName: string): string {
  const cleaned = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  return cleaned;
}

const UNIVERSITY_985 = new Set([
  '清华大学', '北京大学', '复旦大学', '上海交通大学', '浙江大学', '南京大学',
  '中国科学技术大学', '武汉大学', '华中科技大学', '四川大学', '中山大学',
  '吉林大学', '中南大学', '山东大学', '厦门大学', '南开大学', '天津大学',
  '北京师范大学', '北京航空航天大学', '北京理工大学', '大连理工大学',
  '东北大学', '哈尔滨工业大学', '西安交通大学', '西北工业大学',
  '重庆大学', '电子科技大学', '华南理工大学', '湖南大学', '兰州大学',
]);

const UNIVERSITY_211 = new Set([
  '清华大学', '北京大学', '复旦大学', '上海交通大学', '浙江大学', '南京大学',
  '中国科学技术大学', '武汉大学', '华中科技大学', '四川大学', '中山大学',
  '吉林大学', '中南大学', '山东大学', '厦门大学', '南开大学', '天津大学',
  '北京师范大学', '北京航空航天大学', '北京理工大学', '大连理工大学',
  '东北大学', '哈尔滨工业大学', '西安交通大学', '西北工业大学',
  '重庆大学', '电子科技大学', '华南理工大学', '湖南大学', '兰州大学',
  '中国人民大学', '北京邮电大学', '北京交通大学', '北京科技大学',
  '北京化工大学', '北京林业大学', '北京农业大学', '北京中医药大学',
  '北京外国语大学', '中央财经大学', '中国政法大学', '对外经济贸易大学',
  '华北电力大学', '中国石油大学', '中国矿业大学', '中国地质大学',
  '中国海洋大学', '同济大学', '华东师范大学', '华东理工大学',
  '东华大学', '上海财经大学', '上海外国语大学', '东南大学',
  '南京航空航天大学', '南京理工大学', '河海大学', '江南大学',
  '苏州大学', '南京师范大学', '中国药科大学', '南京农业大学',
  '浙江大学', '安徽大学', '合肥工业大学', '厦门大学',
  '福州大学', '南昌大学', '山东大学', '中国海洋大学',
  '中国石油大学(华东)', '郑州大学', '武汉大学', '华中科技大学',
  '华中师范大学', '华中农业大学', '中南财经政法大学', '武汉理工大学',
  '湖南大学', '中南大学', '湖南师范大学', '中山大学',
  '华南理工大学', '华南师范大学', '暨南大学', '广西大学',
  '海南大学', '重庆大学', '西南大学', '四川大学',
  '电子科技大学', '西南财经大学', '四川农业大学', '贵州大学',
  '云南大学', '西藏大学', '西安交通大学', '西北工业大学',
  '西安电子科技大学', '西北农林科技大学', '陕西师范大学', '兰州大学',
  '新疆大学', '石河子大学', '宁夏大学', '青海大学',
  '内蒙古大学', '辽宁大学', '延边大学', '东北师范大学',
  '哈尔滨工程大学', '东北农业大学', '东北林业大学', '河北工业大学',
  '太原理工大学', '山西大学',
]);

const UNIVERSITY_DOUBLE_FIRST = new Set([
  ...UNIVERSITY_985,
  ...UNIVERSITY_211,
  '新疆大学', '云南大学', '郑州大学', '河北工业大学',
  '山西大学', '湘潭大学', '南京医科大学', '南京邮电大学',
  '南京信息工程大学', '宁波大学', '河南大学', '广州医科大学',
  '南方医科大学', '天津工业大学', '成都理工大学', '成都中医药大学',
  '华南农业大学', '广州中医药大学', '上海海洋大学', '上海体育大学',
  '南京林业大学', '福建农林大学', '福建师范大学', '西北大学',
]);

function getSchoolLevel(schoolName: string): string {
  const baseName = extractSchoolNameKey(schoolName);
  
  if (UNIVERSITY_985.has(baseName)) return '985';
  if (UNIVERSITY_211.has(baseName)) return '211';
  if (UNIVERSITY_DOUBLE_FIRST.has(baseName)) return '双一流';
  
  for (const name of UNIVERSITY_985) {
    if (baseName.startsWith(name)) return '985';
  }
  for (const name of UNIVERSITY_211) {
    if (baseName.startsWith(name)) return '211';
  }
  for (const name of UNIVERSITY_DOUBLE_FIRST) {
    if (baseName.startsWith(name)) return '双一流';
  }
  
  return '普通本科';
}

function normalizeSchoolName(schoolName: string): string {
  let name = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  const universitySuffixes = ['大学', '学院', '职业技术学院', '高等专科学校', '师范学院', '理工大学', '科技大学', '工业大学', '农业大学', '医科大学', '中医药大学', '财经大学', '政法大学', '外国语大学', '邮电大学', '交通大学', '航空航天大学', '矿业大学', '石油大学', '地质大学', '林业大学', '海洋大学', '海事大学', '体育学院', '艺术学院', '音乐学院', '美术学院', '戏剧学院', '电影学院', '传媒大学'];
  
  for (const suffix of universitySuffixes) {
    if (name.endsWith(suffix)) {
      return name;
    }
  }
  
  return name;
}

export async function loadSchoolDataFromSupabase(province: string = '海南'): Promise<SchoolScore[]> {
  console.log(`[DEBUG] ==================== 开始加载${province}数据 ====================`);
  
  cacheService.clearAll();
  console.log(`[DEBUG] 缓存已清除`);
  
  const result: Map<string, SchoolScore> = new Map();
  
  const admissionData = await loadFromAdmissionScores(province);
  console.log(`[DEBUG] admission_scores表加载了 ${admissionData.length} 所学校`);
  
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
      if (item.subject_requirement && !existing.subject_requirement) {
        existing.subject_requirement = item.subject_requirement;
      }
    } else {
      result.set(key, { ...item });
    }
  }
  
  console.log(`[DEBUG] 合并admission_scores后共有 ${result.size} 所学校`);
  
  const majorData = await loadFromMajorScores(province);
  console.log(`[DEBUG] major_scores表加载了 ${majorData.length} 所学校`);
  
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
    } else {
      result.set(key, item);
    }
  }
  
  console.log(`[DEBUG] 合并major_scores后共有 ${result.size} 所学校`);
  console.log(`[DEBUG] 返回学校列表前5所: ${Array.from(result.values()).slice(0, 5).map(s => s.name).join(', ')}`);
  console.log(`[DEBUG] ==================== 加载${province}数据完成 ====================`);
  
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
    
    console.log(`[DEBUG] admission_scores ${year}年原始记录数: ${scores.length}`);
    
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
  
  console.log(`[DEBUG] admission_scores聚合后学校数: ${result.size}`);
  return Array.from(result.values());
}

async function loadFromMajorScores(province: string): Promise<SchoolScore[]> {
  const result: Map<string, SchoolScore> = new Map();
  let skipped = 0;
  
  try {
    console.log(`[DEBUG] 开始调用 majorScoreService.getByProvince('${province}')`);
    const scores: MajorScore[] = await majorScoreService.getByProvince(province);
    console.log(`[DEBUG] major_scores原始记录数: ${scores.length}`);
    
    if (scores.length > 0) {
      const firstItem = scores[0];
      console.log(`[DEBUG] 第一条记录: province=${firstItem.province}, school_name=${firstItem.school_name}, year=${firstItem.year}, min_score=${firstItem.min_score}`);
    }
    
    const provinceValues = [...new Set(scores.map(s => s.province))];
    console.log(`[DEBUG] province字段值分布: ${provinceValues.join(', ')}`);
    
    const schoolNames = [...new Set(scores.map(s => s.school_name))];
    console.log(`[DEBUG] 原始学校数: ${schoolNames.length}`);
    console.log(`[DEBUG] 前10所学校: ${schoolNames.slice(0, 10).join(', ')}`);
    
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
    console.warn(`从major_scores表加载数据失败:`, error);
  }
  
  console.log(`[DEBUG] major_scores跳过的记录数: ${skipped}`);
  console.log(`[DEBUG] major_scores聚合后学校数: ${result.size}`);
  
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
