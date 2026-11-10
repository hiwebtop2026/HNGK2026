import { admissionScoreService, type AdmissionScore } from '../services/admissionScoreService';
import { cacheService } from '../services/cacheService';
import { extractSubjectCodes } from './dataUtils';
import type { SchoolScore } from './dataUtils';
import { getUniversityLevel, getUniversityNature } from '../data/universityLevels';
import { ADMISSION_YEARS } from '../config/examYearConfig';

function extractSchoolNameKey(schoolName: string): string {
  const cleaned = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  return cleaned;
}

// 院校层次判断统一使用公共数据文件 src/data/universityLevels.ts
// 避免在每个地区的 schoolData 中冗余存储 level 字段
function getSchoolLevel(schoolName: string): string {
  return getUniversityLevel(schoolName);
}

export async function loadSchoolDataFromSupabase(province: string = '海南'): Promise<SchoolScore[]> {
  if (import.meta.env.DEV) console.log(`[DEBUG] ==================== 开始加载${province}数据 ====================`);
  
  // 仅清除项目缓存前缀（gaokao_cache:*），保留用户偏好、主题、登录等业务数据
  cacheService.clear();
  if (import.meta.env.DEV) console.log(`[DEBUG] 缓存已清除`);
  
  const result: Map<string, SchoolScore> = new Map();
  
  // 投档表按“院校专业组”加载：每个专业组有独立的投档线，
  // 若按学校合并取最低分，会把同一所学校最容易进的专业组当作整所学校的分数线，
  // 从而把大量实际需要冲的院校误判为“保”。
  const admissionData = await loadFromAdmissionScores(province);
  if (import.meta.env.DEV) console.log(`[DEBUG] admission_scores表加载了 ${admissionData.length} 个院校专业组`);
  
  for (const item of admissionData) {
    // 用“学校名+专业组序号”作为唯一键，避免不同专业组共用同一 group_code 时被覆盖
    const key = `${extractSchoolNameKey(item.name)}#${item.groupNumber || item.code}`;
    result.set(key, item);
  }
  
  if (import.meta.env.DEV) console.log(`[DEBUG] 合并后共有 ${result.size} 个院校专业组`);
  if (import.meta.env.DEV) console.log(`[DEBUG] ==================== 加载${province}数据完成 ====================`);
  
  return Array.from(result.values());
}

async function loadFromAdmissionScores(province: string): Promise<SchoolScore[]> {
  const result: Map<string, SchoolScore> = new Map();
  const latestYearMap: Map<string, number> = new Map();
  // 记录每年实际取到的记录数，用来判断“最近招生年”：
  // 2026 投档线尚未入库时自动回退到 2025，避免把在招专业组全部剔除。
  const yearRecordCount: Map<number, number> = new Map();

  for (const year of ADMISSION_YEARS) {
    let scores: AdmissionScore[] = [];
    
    try {
      scores = await admissionScoreService.getByProvinceAndYear(province, year);
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`按省份查询失败，跳过该年份:`, error);
      continue;
    }
    
    yearRecordCount.set(year, scores.length);
    if (import.meta.env.DEV) console.log(`[DEBUG] admission_scores ${year}年原始记录数: ${scores.length}`);
    
    for (const score of scores) {
      if (!score.school_name || !score.score) continue;
      
      if (score.province !== province) continue;
      
      // 只取本科普通批，提前批/专项批的投档线与普通志愿不可直接比较
      if (score.batch_type !== '本科普通批') continue;
      
      const schoolKey = extractSchoolNameKey(score.school_name);
      const groupNumber = score.group_number
        || (score.group_name?.match(/\(\d+\)/) || [])[0]
        || '';
      const key = `${schoolKey}#${groupNumber}`;
      
      let item = result.get(key);
      if (!item) {
        item = {
          code: score.group_code || key,
          name: score.group_name || score.school_name,
          subject: 0,
          subject_requirement: null,
          province,
          level: getSchoolLevel(score.school_name),
          nature: getUniversityNature(score.school_name),
          region: province,
          score2026: null,
          score2025: null,
          score2024: null,
          score2023: null,
          groupNumber,
          planCount: null,
        };
        result.set(key, item);
      }
      
      if (year === 2026) item.score2026 = score.score;
      else if (year === 2025) item.score2025 = score.score;
      else if (year === 2024) item.score2024 = score.score;
      else item.score2023 = score.score;
      
      // 以最近一年的专业组代码、名称、选科要求为准
      const prevYear = latestYearMap.get(key) || 0;
      if (year > prevYear) {
        latestYearMap.set(key, year);
        item.code = score.group_code || item.code;
        item.name = score.group_name || score.school_name;
        item.subject_requirement = score.subject_requirement ?? null;
        item.subject = parseSubjectRequirementToCode(score.subject_requirement);
        item.planCount = score.plan_count ?? item.planCount ?? null;
      }
    }
  }
  
  if (import.meta.env.DEV) console.log(`[DEBUG] admission_scores聚合后专业组数: ${result.size}`);

  // 只保留最近一个有投档数据的年份仍在招生的专业组：
  // 早年出现过、最近未再招生的专业组，多数是合并、拆分或撤销，
  // 其组号在当年已不存在，继续推荐会给出无法填报的方案。
  // 2026 投档线入库后自动以 2026 为准，未入库时回退到 2025。
  const latestAdmissionYear = [...yearRecordCount.entries()]
    .filter(([, count]) => count > 0)
    .map(([year]) => year)
    .sort((a, b) => b - a)[0] ?? 2025;

  const getScoreForYear = (item: SchoolScore, year: number): number | null => {
    if (year === 2026) return item.score2026 ?? null;
    if (year === 2025) return item.score2025;
    if (year === 2024) return item.score2024;
    return item.score2023;
  };

  const groups = Array.from(result.values());
  const activeGroups = groups.filter(item => getScoreForYear(item, latestAdmissionYear) !== null);
  if (import.meta.env.DEV) {
    const dropped = groups.length - activeGroups.length;
    console.log(`[DEBUG] 剔除${latestAdmissionYear}年未招生专业组: ${dropped} 个，保留在招专业组: ${activeGroups.length} 个`);
    const recentYears = ADMISSION_YEARS.filter(year => year <= latestAdmissionYear).slice(-3);
    const fullHistory = activeGroups.filter(
      item => recentYears.every(year => getScoreForYear(item, year) !== null)
    ).length;
    console.log(`[DEBUG] ${recentYears.join('/')} 数据齐全的在招专业组: ${fullHistory} 个`);
  }
  return activeGroups;
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
    const scores = [s.score2026, s.score2025, s.score2024, s.score2023]
      .filter((score): score is number => score !== null && score !== undefined);
    if (scores.length === 0) return false;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avgScore >= minScore && avgScore <= maxScore;
  });
}

// extractProvince 函数已删除：未被任何地方调用，属于冗余代码
// 如需根据院校名称提取省份，可从 schoolData 的 province 字段直接获取
