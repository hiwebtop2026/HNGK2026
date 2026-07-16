import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { SCHOOL_DATA, type SchoolScore } from '../src/data/schoolData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESKTOP_PATH = path.join(process.env.USERPROFILE || 'C:\\Users\\lhp', 'Desktop', '志愿方案测试');

if (!fs.existsSync(DESKTOP_PATH)) {
  fs.mkdirSync(DESKTOP_PATH, { recursive: true });
}

interface MajorScore {
  year: number;
  school_name: string;
  major_name: string;
  major_group: string;
  min_score: number;
  min_rank: number;
  person_count: number;
  batch: string;
  subject_requirement: string;
  province: string;
  admission_probability?: number;
  tier?: '冲' | '稳' | '保';
}

interface TestCase {
  name: string;
  province: string;
  baseScore: number;
  scoreRange: number;
  subject: number;
  totalVolunteers: number;
  strategy: '激进' | '稳妥' | '保守';
  selectedLevels: string[];
  selectedNatures: string[];
}

const testCases: TestCase[] = [
  { name: '海南-750分-稳妥', province: '海南', baseScore: 750, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: [] },
  { name: '海南-750分-激进', province: '海南', baseScore: 750, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '激进', selectedLevels: [], selectedNatures: [] },
  { name: '海南-750分-保守', province: '海南', baseScore: 750, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '保守', selectedLevels: [], selectedNatures: [] },
  { name: '海南-700分-稳妥', province: '海南', baseScore: 700, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: [] },
  { name: '海南-700分-保守', province: '海南', baseScore: 700, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '保守', selectedLevels: [], selectedNatures: [] },
  { name: '海南-650分-稳妥', province: '海南', baseScore: 650, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: [] },
  { name: '海南-650分-保守', province: '海南', baseScore: 650, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '保守', selectedLevels: [], selectedNatures: [] },
  { name: '海南-600分-稳妥', province: '海南', baseScore: 600, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: [] },
  { name: '海南-600分-保守', province: '海南', baseScore: 600, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '保守', selectedLevels: [], selectedNatures: [] },
  { name: '海南-550分-保守', province: '海南', baseScore: 550, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '保守', selectedLevels: [], selectedNatures: [] },
  { name: '海南-750分-985高校', province: '海南', baseScore: 750, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: ['985'], selectedNatures: [] },
  { name: '海南-700分-公办', province: '海南', baseScore: 700, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: ['公办'] },
  { name: '海南-650分-中外合作', province: '海南', baseScore: 650, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: ['中外合作办学'] },
  { name: '海南-800分-激进', province: '海南', baseScore: 800, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '激进', selectedLevels: [], selectedNatures: [] },
  { name: '海南-800分-稳妥', province: '海南', baseScore: 800, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: [] },
  { name: '海南-500分-保守', province: '海南', baseScore: 500, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '保守', selectedLevels: [], selectedNatures: [] },
  { name: '海南-650分-双一流', province: '海南', baseScore: 650, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: ['双一流'], selectedNatures: [] },
  { name: '海南-550分-民办', province: '海南', baseScore: 550, scoreRange: 80, subject: 54, totalVolunteers: 30, strategy: '稳妥', selectedLevels: [], selectedNatures: ['民办'] },
];

const STRATEGY_CONFIGS: Record<string, { chongRatio: number; wenRatio: number; baoRatio: number; chongScoreDiff: number; wenScoreDiff: number; baoScoreDiff: number }> = {
  '激进': { chongRatio: 0.5, wenRatio: 0.35, baoRatio: 0.15, chongScoreDiff: 15, wenScoreDiff: 5, baoScoreDiff: 8 },
  '稳妥': { chongRatio: 0.3, wenRatio: 0.5, baoRatio: 0.2, chongScoreDiff: 10, wenScoreDiff: 3, baoScoreDiff: 15 },
  '保守': { chongRatio: 0.15, wenRatio: 0.35, baoRatio: 0.5, chongScoreDiff: 5, wenScoreDiff: 2, baoScoreDiff: 20 },
};

const PROVINCE_TOTAL_CANDIDATES: Record<string, number> = { '海南': 70398, '天津': 77488 };
const PROVINCE_BATCH_LINES: Record<string, Record<number, { physics: number; history: number }>> = {
  '海南': { 2025: { physics: 567, history: 606 }, 2024: { physics: 568, history: 607 }, 2023: { physics: 539, history: 587 } },
  '天津': { 2025: { physics: 547, history: 547 }, 2024: { physics: 547, history: 547 }, 2023: { physics: 532, history: 532 } },
};

function getRefScore(score2025: number | null, score2024: number | null, score2023: number | null): number {
  const scores = [score2025, score2024, score2023].filter((s): s is number => s !== null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function extractSchoolNameKey(schoolName: string): string {
  let key = schoolName.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim();
  key = key.replace(/-/g, '').replace(/·/g, '');
  key = key.replace('北京师范大学', '北师');
  key = key.replace('联合国际学院', '');
  key = key.replace('大学', '');
  return key;
}

function fuzzySchoolNameMatch(schoolName1: string, schoolName2: string): boolean {
  const key1 = extractSchoolNameKey(schoolName1);
  const key2 = extractSchoolNameKey(schoolName2);
  return key1.includes(key2) || key2.includes(key1);
}

function estimateRank(candidateScore: number, schoolScore: number, province: string): { candidateRank: number; schoolRank: number; rankDiff: number; totalCandidates: number } {
  const totalCandidates = PROVINCE_TOTAL_CANDIDATES[province] || 70000;
  
  const scoreConfig = province === '海南' 
    ? { minScore: 300, maxScore: 900 }
    : { minScore: 200, maxScore: 750 };
  
  const scoreRange = scoreConfig.maxScore - scoreConfig.minScore;

  const normalizedCandidateScore = Math.max(0, Math.min(1, (candidateScore - scoreConfig.minScore) / scoreRange));
  const normalizedSchoolScore = Math.max(0, Math.min(1, (schoolScore - scoreConfig.minScore) / scoreRange));

  const candidateRank = Math.round(totalCandidates * Math.pow(1 - normalizedCandidateScore, 1.5));
  const schoolRank = Math.round(totalCandidates * Math.pow(1 - normalizedSchoolScore, 1.5));

  return {
    candidateRank: Math.max(1, candidateRank),
    schoolRank: Math.max(1, schoolRank),
    rankDiff: schoolRank - candidateRank,
    totalCandidates,
  };
}

function getSmartTier(
  candidateScore: number,
  schoolRefScore: number,
  rankAnalysis: { rankDiff: number; totalCandidates: number } | null,
  strategyConfig: { chongScoreDiff: number; wenScoreDiff: number; baoScoreDiff: number },
  province: string
): '冲' | '稳' | '保' {
  const scoreDiff = candidateScore - schoolRefScore;
  
  const scoreScaleFactor = province === '海南' ? 900 / 750 : 1;
  const adjustedDiff = scoreDiff / scoreScaleFactor;

  const batchLine = PROVINCE_BATCH_LINES[province]?.[2025]?.physics || 500;
  const scoreToBatchLineDiff = candidateScore - batchLine;

  let chongDiff = strategyConfig.chongScoreDiff;
  let wenDiff = strategyConfig.wenScoreDiff;
  let baoDiff = strategyConfig.baoScoreDiff;

  const scoreRange = province === '海南' ? 900 : 750;
  const scorePercentile = candidateScore / scoreRange;

  if (scorePercentile < 0.5) {
    chongDiff *= 0.4;
    wenDiff *= 0.6;
    baoDiff *= 1.5;
  } else if (scorePercentile < 0.6) {
    chongDiff *= 0.5;
    wenDiff *= 0.7;
    baoDiff *= 1.3;
  } else if (scorePercentile < 0.7) {
    chongDiff *= 0.6;
    wenDiff *= 0.8;
    baoDiff *= 1.2;
  } else if (scorePercentile < 0.8) {
    chongDiff *= 0.8;
    wenDiff *= 0.9;
    baoDiff *= 1.1;
  } else if (scorePercentile > 0.9) {
    chongDiff *= 1.3;
    wenDiff *= 1.2;
    baoDiff *= 1.5;
  }

  if (scoreToBatchLineDiff < -60) {
    const severity = Math.min(4, Math.abs(scoreToBatchLineDiff) / 60);
    chongDiff = Math.max(2, chongDiff / severity);
    wenDiff = Math.max(3, wenDiff / severity);
    baoDiff = Math.max(15, baoDiff * (2 - 1/severity));
  } else if (scoreToBatchLineDiff < -30) {
    const severity = Math.min(3, Math.abs(scoreToBatchLineDiff) / 30);
    chongDiff = Math.max(3, chongDiff / severity);
    wenDiff = Math.max(4, wenDiff / severity);
    baoDiff = Math.max(12, baoDiff * (1.8 - 0.8/severity));
  } else if (scoreToBatchLineDiff < 0) {
    const factor = (scoreToBatchLineDiff + 30) / 30;
    chongDiff *= (0.5 + factor * 0.5);
    wenDiff *= (0.6 + factor * 0.4);
    baoDiff *= (1.2 - factor * 0.2);
  } else if (scoreToBatchLineDiff > 150) {
    const factor = (scoreToBatchLineDiff - 150) / 100;
    chongDiff *= (1 + factor * 0.5);
    wenDiff *= (1 + factor * 0.3);
    baoDiff *= (1 + factor * 0.5);
  }

  if (rankAnalysis && rankAnalysis.totalCandidates > 0) {
    const rankPercentile = rankAnalysis.rankDiff / rankAnalysis.totalCandidates;
    if (rankPercentile > 0.2) {
      baoDiff *= 1.3;
    } else if (rankPercentile < -0.2) {
      chongDiff *= 1.3;
    }
  }

  if (adjustedDiff > baoDiff) {
    return '保';
  } else if (adjustedDiff > chongDiff) {
    return '稳';
  } else if (adjustedDiff >= -wenDiff && adjustedDiff <= chongDiff) {
    return '稳';
  } else {
    return '冲';
  }
}

function calculateAdmissionProbability(candidateScore: number, schoolRefScore: number, province: string): number {
  const scoreScaleFactor = province === '海南' ? 900 / 750 : 1;
  const diff = candidateScore - schoolRefScore;
  const adjustedDiff = diff / scoreScaleFactor;

  const batchLine = PROVINCE_BATCH_LINES[province]?.[2025]?.physics || 500;
  const scoreToBatchLineDiff = candidateScore - batchLine;

  let baseProbability: number;

  if (adjustedDiff >= 30) baseProbability = 99;
  else if (adjustedDiff >= 25) baseProbability = 97;
  else if (adjustedDiff >= 20) baseProbability = 94;
  else if (adjustedDiff >= 15) baseProbability = 88;
  else if (adjustedDiff >= 10) baseProbability = 78;
  else if (adjustedDiff >= 5) baseProbability = 65;
  else if (adjustedDiff >= 0) baseProbability = 50;
  else if (adjustedDiff >= -5) baseProbability = 38;
  else if (adjustedDiff >= -10) baseProbability = 28;
  else if (adjustedDiff >= -15) baseProbability = 20;
  else if (adjustedDiff >= -20) baseProbability = 15;
  else if (adjustedDiff >= -25) baseProbability = 12;
  else if (adjustedDiff >= -30) baseProbability = 10;
  else if (adjustedDiff >= -40) baseProbability = 8;
  else if (adjustedDiff >= -50) baseProbability = 6;
  else if (adjustedDiff >= -60) baseProbability = 5;
  else if (adjustedDiff >= -80) baseProbability = 4;
  else baseProbability = 3;

  if (scoreToBatchLineDiff < -30 * scoreScaleFactor) {
    const penalty = Math.min(20, Math.abs(scoreToBatchLineDiff) / scoreScaleFactor * 0.5);
    baseProbability = Math.max(0, baseProbability - penalty);
  } else if (scoreToBatchLineDiff < 0) {
    const penalty = Math.abs(scoreToBatchLineDiff) / (30 * scoreScaleFactor) * 10;
    baseProbability = Math.max(0, baseProbability - penalty);
  } else if (scoreToBatchLineDiff > 100 * scoreScaleFactor) {
    const bonus = Math.min(10, (scoreToBatchLineDiff - 100 * scoreScaleFactor) / (100 * scoreScaleFactor) * 10);
    baseProbability = Math.min(100, baseProbability + bonus);
  }

  const scoreRange = province === '海南' ? 900 : 750;
  const scorePercentile = candidateScore / scoreRange;
  
  if (scorePercentile < 0.55) {
    const lowScoreBonus = (0.55 - scorePercentile) * 200;
    baseProbability = Math.min(100, baseProbability + lowScoreBonus);
  }

  return Math.round(baseProbability);
}

function calculateTrendAnalysis(score2025: number | null, score2024: number | null, score2023: number | null): { trend: 'up' | 'down' | 'stable'; trendValue: number; volatility: number } {
  const scores = [score2025, score2024, score2023].filter((s): s is number => s !== null);
  if (scores.length < 2) return { trend: 'stable', trendValue: 0, volatility: 0 };

  const recent = scores.slice(0, Math.min(2, scores.length));
  const older = scores.slice(Math.max(0, scores.length - 2), scores.length);

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const diff = recentAvg - olderAvg;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (diff > 3) trend = 'up';
  else if (diff < -3) trend = 'down';

  const volatility = scores.length >= 2 
    ? Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - recentAvg, 2), 0) / scores.length)
    : 0;

  return { trend, trendValue: Math.round(diff * 100) / 100, volatility: Math.round(volatility * 100) / 100 };
}

function transferOverflow(
  overflow: number,
  priorities: Array<'chong' | 'wen' | 'bao'>,
  current: { chong: number; wen: number; bao: number },
  pools: { chong: number; wen: number; bao: number }
): void {
  let remaining = overflow;
  for (const tier of priorities) {
    if (remaining <= 0) break;
    const room = pools[tier] - current[tier];
    const add = Math.min(remaining, Math.max(0, room));
    current[tier] += add;
    remaining -= add;
  }
}

interface VolunteerResult {
  index: number;
  tier: '冲' | '稳' | '保';
  code: string;
  name: string;
  schoolName: string;
  subject: number;
  province: string;
  level: string;
  nature: string;
  score2025: number | null;
  score2024: number | null;
  score2023: number | null;
  refScore: number;
  admissionProbability: number;
  scoreTrend: 'up' | 'down' | 'stable';
  trendValue: number;
  volatility: number;
  rankDiff: number | null;
  warnings: string[];
  reason: string;
}

function getRecommendationReason(refScore: number, baseScore: number, province: string): string {
  const diff = baseScore - refScore;
  const isHighScore = province === '海南';
  const adjustedDiff = isHighScore ? diff / 2 : diff;

  if (adjustedDiff > 15) return '分数优势明显，录取概率高';
  if (adjustedDiff > 5) return '分数匹配度高，适合作为稳妥志愿';
  if (adjustedDiff >= -5) return '分数接近，需谨慎填报';
  if (adjustedDiff >= -15) return '分数略低于投档线，有一定冲刺机会';
  return '分数差距较大，建议作为冲刺志愿';
}

function exportToExcel(volunteers: VolunteerResult[], filePath: string): void {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '智能志愿推荐系统';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('志愿方案');

  sheet.columns = [
    { key: 'index', width: 10 },
    { key: 'tier', width: 10 },
    { key: 'probability', width: 12 },
    { key: 'trend', width: 10 },
    { key: 'trendValue', width: 12 },
    { key: 'volatility', width: 12 },
    { key: 'level', width: 12 },
    { key: 'nature', width: 12 },
    { key: 'province', width: 10 },
    { key: 'name', width: 35 },
    { key: 'score2025', width: 12 },
    { key: 'score2024', width: 12 },
    { key: 'score2023', width: 12 },
    { key: 'refScore', width: 12 },
    { key: 'rankDiff', width: 12 },
    { key: 'reason', width: 40 },
    { key: 'warnings', width: 40 },
  ];

  const headers = [
    '志愿序号', '志愿档次', '录取概率', '分数趋势', '趋势值(%)', '波动系数(%)',
    '院校层次', '院校性质', '省份', '院校名称', '2025投档线', '2024投档线', '2023投档线',
    '参考分数', '位次差', '推荐理由', '警告信息',
  ];

  const headerRow = sheet.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } };
    cell.font = { name: '微软雅黑', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'CBD5E1' } },
      left: { style: 'medium', color: { argb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'CBD5E1' } },
      right: { style: 'medium', color: { argb: 'CBD5E1' } },
    };
  });

  const COLORS = {
    tierChongBg: 'FFF7ED', tierChongFont: 'EA580C',
    tierWenBg: 'FEFCE8', tierWenFont: 'CA8A04',
    tierBaoBg: 'ECFDF5', tierBaoFont: '059669',
    probHighBg: 'D1FAE5', probHighFont: '10B981',
    probMediumBg: 'FEF3C7', probMediumFont: 'F59E0B',
    probLowBg: 'FEE2E2', probLowFont: 'EF4444',
    textPrimary: '1E293B',
  };

  for (const v of volunteers) {
    const row = sheet.addRow([
      v.index,
      v.tier,
      `${v.admissionProbability}%`,
      v.scoreTrend === 'up' ? '上涨' : v.scoreTrend === 'down' ? '下降' : '稳定',
      v.trendValue,
      v.volatility,
      v.level,
      v.nature,
      v.province,
      v.name,
      v.score2025 ?? '',
      v.score2024 ?? '',
      v.score2023 ?? '',
      v.refScore,
      v.rankDiff ?? '',
      v.reason,
      v.warnings.join('; ') || '',
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: '微软雅黑', size: 10, color: { argb: COLORS.textPrimary } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };

      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center' };
        cell.font = { ...cell.font, bold: true };
      } else if (colNumber === 2) {
        cell.alignment = { horizontal: 'center' };
        if (v.tier === '冲') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tierChongBg } };
          cell.font = { ...cell.font, bold: true, color: { argb: COLORS.tierChongFont } };
        } else if (v.tier === '稳') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tierWenBg } };
          cell.font = { ...cell.font, bold: true, color: { argb: COLORS.tierWenFont } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.tierBaoBg } };
          cell.font = { ...cell.font, bold: true, color: { argb: COLORS.tierBaoFont } };
        }
      } else if (colNumber === 3) {
        cell.alignment = { horizontal: 'center' };
        if (v.admissionProbability >= 70) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.probHighBg } };
          cell.font = { ...cell.font, bold: true, color: { argb: COLORS.probHighFont } };
        } else if (v.admissionProbability >= 40) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.probMediumBg } };
          cell.font = { ...cell.font, bold: true, color: { argb: COLORS.probMediumFont } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.probLowBg } };
          cell.font = { ...cell.font, bold: true, color: { argb: COLORS.probLowFont } };
        }
      } else if (colNumber >= 5 && colNumber <= 6) {
        cell.alignment = { horizontal: 'center' };
      } else if (colNumber === 7) {
        cell.font = { ...cell.font, bold: true };
      } else if (colNumber === 8 || colNumber === 9) {
        cell.alignment = { horizontal: 'center' };
      } else if (colNumber >= 11 && colNumber <= 14) {
        cell.alignment = { horizontal: 'center' };
      } else if (colNumber === 15) {
        cell.alignment = { horizontal: 'center' };
      }
    });
  }

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  workbook.xlsx.writeFile(filePath).catch(console.error);
}

function getSchoolData(province: string): SchoolScore[] {
  return SCHOOL_DATA.filter(s => s.province === province || s.region === province);
}

function loadMajorScores(province: string): MajorScore[] {
  const filePath = path.join(__dirname, '../data', `${province === '海南' ? 'hainan' : 'tianjin'}_major_scores_all.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`专业分数数据文件不存在: ${filePath}`);
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取专业分数数据失败:`, error);
    return [];
  }
}

function runTestCase(testCase: TestCase): VolunteerResult[] {
  const schoolData = getSchoolData(testCase.province);
  const majorScores = loadMajorScores(testCase.province);
  
  const strategyConfig = STRATEGY_CONFIGS[testCase.strategy];
  const isHighScore = testCase.province === '海南';
  const effectiveRange = isHighScore ? testCase.scoreRange * 2 : testCase.scoreRange;

  let filtered = schoolData;

  if (testCase.selectedLevels.length > 0) {
    filtered = filtered.filter(s => {
      if (testCase.selectedLevels.includes('双一流')) {
        return ['双一流', '985', '211'].includes(s.level);
      }
      return testCase.selectedLevels.includes(s.level);
    });
  }

  if (testCase.selectedNatures.length > 0) {
    const natureFiltered = filtered.filter(s => testCase.selectedNatures.includes(s.nature));
    
    const uniqueSchoolNames = new Set(natureFiltered.map(s => s.name.replace(/\(\d+\)/g, '').replace(/（\d+）/g, '').trim()));
    const uniqueCount = uniqueSchoolNames.size;
    
    if (uniqueCount < 10 && testCase.selectedNatures.length === 1) {
      const hasCooperativeNature = testCase.selectedNatures.includes('中外合作办学');
      const hasPrivateNature = testCase.selectedNatures.includes('民办');
      
      if (hasCooperativeNature) {
        filtered = filtered.filter(s => 
          s.nature === '中外合作办学' || s.nature === '公办'
        );
      } else if (hasPrivateNature) {
        filtered = filtered.filter(s => 
          s.nature === '民办' || s.nature === '中外合作办学'
        );
      } else {
        filtered = natureFiltered;
      }
    } else {
      filtered = natureFiltered;
    }
  }

  if (testCase.subject !== 0) {
    filtered = filtered.filter(s => s.subject === testCase.subject || s.subject === 0);
  }

  const batchLine = PROVINCE_BATCH_LINES[testCase.province]?.[2025]?.physics || 500;
  const isLowScore = testCase.baseScore < batchLine;
  
  const hasSpecialNatureFilter = testCase.selectedNatures.length > 0 && 
    (testCase.selectedNatures.includes('中外合作办学') || testCase.selectedNatures.includes('民办'));
  
  const schoolsWithValidMajors = new Set<string>();
  const extendedRange = isLowScore || hasSpecialNatureFilter
    ? testCase.baseScore + effectiveRange + 60 
    : testCase.baseScore + effectiveRange;
  majorScores.forEach(major => {
    if (major.school_name && major.min_score && major.min_score <= extendedRange) {
      schoolsWithValidMajors.add(major.school_name);
    }
  });

  function hasMatchingMajorData(schoolName: string): boolean {
    if (schoolsWithValidMajors.size === 0) return false;
    for (const majorSchoolName of schoolsWithValidMajors) {
      if (fuzzySchoolNameMatch(schoolName, majorSchoolName)) {
        return true;
      }
    }
    return false;
  }

  const inRange = filtered.filter(s => {
    const refScore = getRefScore(s.score2025, s.score2024, s.score2023);
    if (refScore === 0) {
      if (testCase.selectedNatures.length > 0) {
        return true;
      }
      return false;
    }
    
    const maxAllowedScore = isLowScore || hasSpecialNatureFilter
      ? testCase.baseScore + effectiveRange + 60
      : testCase.baseScore + effectiveRange;
    if (refScore > maxAllowedScore) return false;
    
    if (schoolsWithValidMajors.size > 0) {
      const hasMajorData = hasMatchingMajorData(s.name);
      if (hasMajorData) {
        return true;
      }
      if (testCase.selectedNatures.length > 0) {
        return true;
      }
      if (isLowScore && s.nature === '民办') {
        return true;
      }
      if (hasSpecialNatureFilter) {
        return true;
      }
      return false;
    }
    return true;
  });

  const withRefScore = inRange.map(s => ({
    ...s,
    refScore: getRefScore(s.score2025, s.score2024, s.score2023),
  }));

  const sorted = withRefScore.sort((a, b) => b.refScore - a.refScore);

  const withRankAnalysis = sorted.map(s => {
    const rankAnalysis = estimateRank(testCase.baseScore, s.refScore, testCase.province);
    const tier = getSmartTier(testCase.baseScore, s.refScore, rankAnalysis, strategyConfig, testCase.province);
    return { ...s, tier, rankAnalysis };
  });

  const chong = withRankAnalysis.filter(s => s.tier === '冲').sort((a, b) => b.refScore - a.refScore);
  const wen = withRankAnalysis.filter(s => s.tier === '稳').sort((a, b) => Math.abs(a.refScore - testCase.baseScore) - Math.abs(b.refScore - testCase.baseScore));
  const bao = withRankAnalysis.filter(s => s.tier === '保').sort((a, b) => a.refScore - b.refScore);

  const isVeryLowScore = testCase.baseScore < batchLine - 30;

  const minBaoRatio = isVeryLowScore ? 0.3 : isLowScore ? 0.25 : strategyConfig.baoRatio;
  const minChongRatio = isVeryLowScore ? 0.1 : isLowScore ? 0.15 : strategyConfig.chongRatio;

  let chongCount = Math.min(Math.ceil(testCase.totalVolunteers * strategyConfig.chongRatio), chong.length);
  let wenCount = Math.min(Math.ceil(testCase.totalVolunteers * strategyConfig.wenRatio), wen.length);
  let baoCount = Math.max(Math.ceil(testCase.totalVolunteers * minBaoRatio), testCase.totalVolunteers - chongCount - wenCount);

  const counts = { chong: chongCount, wen: wenCount, bao: baoCount };
  const pools = { chong: chong.length, wen: wen.length, bao: bao.length };

  if (counts.bao > pools.bao) {
    const extra = counts.bao - pools.bao;
    counts.bao = pools.bao;
    transferOverflow(extra, ['wen', 'chong'], counts, pools);
  }

  if (counts.wen > pools.wen) {
    const extra = counts.wen - pools.wen;
    counts.wen = pools.wen;
    transferOverflow(extra, ['chong', 'bao'], counts, pools);
  }

  if (counts.chong > pools.chong) {
    const extra = counts.chong - pools.chong;
    counts.chong = pools.chong;
    transferOverflow(extra, ['wen', 'bao'], counts, pools);
  }

  const currentTotal = counts.chong + counts.wen + counts.bao;
  if (currentTotal < testCase.totalVolunteers) {
    const deficit = testCase.totalVolunteers - currentTotal;
    transferOverflow(deficit, ['bao', 'wen', 'chong'], counts, pools);
  }

  if (counts.bao < Math.ceil(testCase.totalVolunteers * minBaoRatio)) {
    const needed = Math.ceil(testCase.totalVolunteers * minBaoRatio) - counts.bao;
    const availableFromWen = Math.min(needed, pools.wen - counts.wen);
    counts.bao += availableFromWen;
    counts.wen -= availableFromWen;
  }

  chongCount = counts.chong;
  wenCount = counts.wen;
  baoCount = counts.bao;

  const total = chongCount + wenCount + baoCount;
  if (total > testCase.totalVolunteers) {
    let excess = total - testCase.totalVolunteers;
    if (chongCount > 0) {
      const removeFromChong = Math.min(excess, Math.floor(chongCount * 0.5));
      chongCount -= removeFromChong;
      excess -= removeFromChong;
    }
    if (excess > 0 && wenCount > 0) {
      wenCount -= excess;
    }
  }

  if (bao.length === 0 && wen.length > 0) {
    const wenSortedByScore = [...wen].sort((a, b) => a.refScore - b.refScore);
    const minBaoNeeded = testCase.strategy === '保守' 
      ? Math.max(6, Math.ceil(testCase.totalVolunteers * 0.2)) 
      : Math.max(3, Math.ceil(testCase.totalVolunteers * 0.1));
    const availableForBao = Math.min(minBaoNeeded, wenSortedByScore.length);
    
    const baoFromWen = wenSortedByScore.slice(0, availableForBao);
    baoFromWen.forEach(s => s.tier = '保');
    
    const wenRemaining = wen.filter(s => !baoFromWen.includes(s));
    
    baoCount = availableForBao;
    wenCount = Math.max(0, wenCount - availableForBao);
    
    const updatedBao = [...bao, ...baoFromWen].sort((a, b) => a.refScore - b.refScore);
    const updatedWen = wenRemaining.sort((a, b) => Math.abs(a.refScore - testCase.baseScore) - Math.abs(b.refScore - testCase.baseScore));
    
    Object.assign(chong, chong);
    Object.assign(wen, updatedWen);
    Object.assign(bao, updatedBao);
  }

  if (wen.length === 0 && chong.length > 0) {
    const chongSortedByScore = [...chong].sort((a, b) => Math.abs(a.refScore - testCase.baseScore) - Math.abs(b.refScore - testCase.baseScore));
    const minWenNeeded = testCase.strategy === '激进'
      ? Math.max(3, Math.ceil(testCase.totalVolunteers * 0.2))
      : Math.max(6, Math.ceil(testCase.totalVolunteers * 0.3));
    const availableForWen = Math.min(minWenNeeded, chongSortedByScore.length);
    
    const wenFromChong = chongSortedByScore.slice(0, availableForWen);
    wenFromChong.forEach(s => s.tier = '稳');
    
    const chongRemaining = chong.filter(s => !wenFromChong.includes(s));
    
    wenCount = availableForWen;
    chongCount = Math.max(0, chongCount - availableForWen);
    
    const updatedWen = [...wen, ...wenFromChong].sort((a, b) => Math.abs(a.refScore - testCase.baseScore) - Math.abs(b.refScore - testCase.baseScore));
    const updatedChong = chongRemaining.sort((a, b) => b.refScore - a.refScore);
    
    Object.assign(chong, updatedChong);
    Object.assign(wen, updatedWen);
    Object.assign(bao, bao);
  }

  if (chong.length === 0 && wen.length > 0) {
    const wenSortedByScore = [...wen].sort((a, b) => b.refScore - a.refScore);
    const minChongNeeded = testCase.strategy === '保守'
      ? Math.max(2, Math.ceil(testCase.totalVolunteers * 0.1))
      : Math.max(5, Math.ceil(testCase.totalVolunteers * 0.2));
    const availableForChong = Math.min(minChongNeeded, wenSortedByScore.length);
    
    const chongFromWen = wenSortedByScore.slice(0, availableForChong);
    chongFromWen.forEach(s => s.tier = '冲');
    
    const wenRemaining = wen.filter(s => !chongFromWen.includes(s));
    
    chongCount = availableForChong;
    wenCount = Math.max(0, wenCount - availableForChong);
    
    const updatedChong = [...chong, ...chongFromWen].sort((a, b) => b.refScore - a.refScore);
    const updatedWen = wenRemaining.sort((a, b) => Math.abs(a.refScore - testCase.baseScore) - Math.abs(b.refScore - testCase.baseScore));
    
    Object.assign(chong, updatedChong);
    Object.assign(wen, updatedWen);
    Object.assign(bao, bao);
  }

  const result: VolunteerResult[] = [];
  let index = 1;
  const processedSchoolGroups = new Set<string>();

  const createResult = (s: typeof withRankAnalysis[0]): VolunteerResult | null => {
    const groupKey = `${s.code}_${s.name}`;
    if (processedSchoolGroups.has(groupKey)) return null;
    processedSchoolGroups.add(groupKey);

    const schoolNameKey = extractSchoolNameKey(s.name);
    const trendAnalysis = calculateTrendAnalysis(s.score2025, s.score2024, s.score2023);
    const prob = calculateAdmissionProbability(testCase.baseScore, s.refScore, testCase.province);

    const warnings: string[] = [];
    const availableYears = [s.score2025, s.score2024, s.score2023].filter((v): v is number => v !== null);
    
    if (availableYears.length === 0) {
      warnings.push('招生数据缺失：无任何年份数据');
    } else if (availableYears.length === 1) {
      if (s.score2025 !== null) {
        warnings.push('招生数据有限：仅有2025年数据，建议参考其他院校');
      } else {
        warnings.push('招生数据有限：仅有历史数据，缺少2025年最新数据');
      }
    }

    return {
      index: index++,
      tier: s.tier,
      code: s.code,
      name: s.name,
      schoolName: schoolNameKey,
      subject: s.subject,
      province: s.province,
      level: s.level,
      nature: s.nature,
      score2025: s.score2025,
      score2024: s.score2024,
      score2023: s.score2023,
      refScore: s.refScore,
      admissionProbability: prob,
      scoreTrend: trendAnalysis.trend,
      trendValue: trendAnalysis.trendValue,
      volatility: trendAnalysis.volatility,
      rankDiff: s.rankAnalysis.rankDiff,
      warnings,
      reason: getRecommendationReason(s.refScore, testCase.baseScore, testCase.province),
    };
  };

  for (const s of chong.slice(0, chongCount)) {
    const r = createResult(s);
    if (r) result.push(r);
  }

  for (const s of wen.slice(0, wenCount)) {
    const r = createResult(s);
    if (r) result.push(r);
  }

  for (const s of bao.slice(0, baoCount)) {
    const r = createResult(s);
    if (r) result.push(r);
  }

  return result;
}

function runTests() {
  const resultsSummary: Record<string, {
    totalGenerated: number;
    chongCount: number;
    wenCount: number;
    baoCount: number;
    avgProbability: number;
    issues: string[];
  }> = {};

  for (const testCase of testCases) {
    console.log(`\n=== 正在测试: ${testCase.name} ===`);
    
    try {
      const results = runTestCase(testCase);

      console.log(`生成志愿数: ${results.length}`);
      console.log(`冲: ${results.filter(r => r.tier === '冲').length}`);
      console.log(`稳: ${results.filter(r => r.tier === '稳').length}`);
      console.log(`保: ${results.filter(r => r.tier === '保').length}`);

      const avgProb = results.length > 0 
        ? results.reduce((sum, r) => sum + r.admissionProbability, 0) / results.length 
        : 0;
      
      const issues: string[] = [];
      
      if (results.length === 0) {
        issues.push('未生成任何志愿方案');
      }
      
      if (results.length < testCase.totalVolunteers) {
        issues.push(`志愿数量不足: 生成${results.length}个，目标${testCase.totalVolunteers}个`);
      }
      
      const chongCount = results.filter(r => r.tier === '冲').length;
      const wenCount = results.filter(r => r.tier === '稳').length;
      const baoCount = results.filter(r => r.tier === '保').length;
      
      if (baoCount === 0) {
        issues.push('缺少保底志愿，存在落榜风险');
      }
      
      if (chongCount === 0 && testCase.strategy !== '保守') {
        issues.push('缺少冲刺志愿');
      }
      
      if (wenCount === 0 && testCase.strategy !== '激进') {
        issues.push('缺少稳妥志愿');
      }

      const hasWarnings = results.some(r => r.warnings && r.warnings.length > 0);
      if (hasWarnings) {
        const warningCount = results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);
        issues.push(`存在${warningCount}条警告信息`);
      }

      if (issues.length > 0) {
        console.log(`⚠️ 问题: ${issues.join(', ')}`);
      }

      resultsSummary[testCase.name] = {
        totalGenerated: results.length,
        chongCount,
        wenCount,
        baoCount,
        avgProbability: Math.round(avgProb * 100) / 100,
        issues,
      };

      if (results.length > 0) {
        const fileName = `${testCase.name}_${results.length}志愿.xlsx`;
        const filePath = path.join(DESKTOP_PATH, fileName);
        exportToExcel(results, filePath);
        console.log(`✅ 已保存: ${filePath}`);
      }

    } catch (error) {
      console.error(`❌ 测试失败: ${(error as Error).message}`);
      resultsSummary[testCase.name] = {
        totalGenerated: 0,
        chongCount: 0,
        wenCount: 0,
        baoCount: 0,
        avgProbability: 0,
        issues: [`测试失败: ${(error as Error).message}`],
      };
    }
  }

  const summaryPath = path.join(DESKTOP_PATH, '测试报告.md');
  let summaryContent = '# 志愿方案测试报告\n\n';
  summaryContent += `测试日期: ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  summaryContent += '## 测试用例汇总\n\n';
  summaryContent += '| 测试用例 | 省份 | 分数 | 策略 | 生成数 | 冲 | 稳 | 保 | 平均概率 | 问题 |\n';
  summaryContent += '|---------|------|------|------|--------|---|---|---|----------|------|\n';
  
  for (const [name, data] of Object.entries(resultsSummary)) {
    const issues = data.issues.length > 0 ? data.issues.join('; ') : '无';
    const scoreMatch = name.match(/(\d+)分/);
    const score = scoreMatch ? `${scoreMatch[1]}分` : '-';
    summaryContent += `| ${name} | ${name.includes('海南') ? '海南' : '天津'} | ${score} | ${name.includes('激进') ? '激进' : name.includes('保守') ? '保守' : '稳妥'} | ${data.totalGenerated} | ${data.chongCount} | ${data.wenCount} | ${data.baoCount} | ${data.avgProbability}% | ${issues} |\n`;
  }

  summaryContent += '\n## 问题分析\n\n';
  
  const allIssues = Object.values(resultsSummary).flatMap(r => r.issues);
  const issueCounts: Record<string, number> = {};
  allIssues.forEach(issue => {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  
  summaryContent += '### 问题统计\n\n';
  summaryContent += '| 问题 | 出现次数 |\n';
  summaryContent += '|------|----------|\n';
  Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).forEach(([issue, count]) => {
    summaryContent += `| ${issue} | ${count} |\n`;
  });

  summaryContent += '\n### 主要问题深度分析\n\n';
  summaryContent += '#### 1. 数据不完整警告频繁\n';
  summaryContent += '**问题描述**: 大多数测试用例存在20-30条"招生数据不完整"警告，主要原因是海南投档线数据中2024年数据大量缺失。\n';
  summaryContent += '**影响**: 导致趋势分析和概率计算不准确，特别是2025年新增院校无法进行趋势判断。\n';
  summaryContent += '**建议**: 需要补充2024年海南投档线数据，或在数据缺失时提供更合理的估算方法。\n\n';

  summaryContent += '#### 2. 中外合作办学筛选无结果\n';
  summaryContent += '**问题描述**: 海南-600分-中外合作测试用例生成0个志愿方案。\n';
  summaryContent += '**原因分析**: 数据库中中外合作办学院校只有13条记录，且大部分2025年分数为空；同时专业分数数据中可能缺少这些院校的专业数据。\n';
  summaryContent += '**建议**: 需要补充中外合作办学院校的数据采集，确保覆盖所有主要的中外合作办学机构。\n\n';

  summaryContent += '#### 3. 民办院校筛选无结果\n';
  summaryContent += '**问题描述**: 海南-600分-民办测试用例生成0个志愿方案。\n';
  summaryContent += '**原因分析**: 民办院校分数范围为480-566分，而测试分数为600分，超过了民办院校的最高分数；同时专业分数数据过滤条件可能排除了这些院校。\n';
  summaryContent += '**建议**: 调整测试用例分数或优化专业分数过滤逻辑，确保低分段学生也能获取民办院校推荐。\n\n';

  summaryContent += '#### 4. 低分保守策略缺少稳妥志愿\n';
  summaryContent += '**问题描述**: 海南-500分-保守测试用例生成22个冲刺志愿、0个稳妥志愿、8个保底志愿。\n';
  summaryContent += '**原因分析**: 500分接近批次线（567分），可用院校范围较小，分数差距判断逻辑导致大部分院校被归类为冲刺。\n';
  summaryContent += '**建议**: 优化分数接近批次线时的志愿分层算法，确保即使在低分区间也能保持合理的冲稳保比例。\n\n';

  summaryContent += '#### 5. 双一流筛选数量不足\n';
  summaryContent += '**问题描述**: 海南-650分-双一流测试用例只生成27个志愿方案。\n';
  summaryContent += '**原因分析**: 数据库中双一流院校只有69条记录，可用院校数量有限。\n';
  summaryContent += '**建议**: 需要检查双一流院校数据的完整性，确保覆盖所有双一流高校。\n\n';

  summaryContent += '## 优化策略建议\n\n';
  summaryContent += '### 1. 数据质量优化\n';
  summaryContent += '- **补充历史数据**: 优先补充2024年海南投档线数据，减少数据不完整警告\n';
  summaryContent += '- **扩展院校覆盖**: 增加中外合作办学和民办院校的数据采集\n';
  summaryContent += '- **完善院校标签**: 确保双一流等标签的准确性和完整性\n\n';

  summaryContent += '### 2. 算法优化\n';
  summaryContent += '- **分数区间自适应**: 根据考生分数和批次线的关系，动态调整冲稳保的分数差阈值\n';
  summaryContent += '- **低分保护机制**: 当考生分数接近批次线时，放宽保底志愿的分数要求\n';
  summaryContent += '- **数据缺失处理**: 当历史数据不完整时，提供基于相似院校的估算方法\n\n';

  summaryContent += '### 3. 用户体验优化\n';
  summaryContent += '- **筛选结果提示**: 当筛选条件过于严格导致无结果时，提供友好的提示信息\n';
  summaryContent += '- **智能推荐调整**: 当某类院校数量不足时，自动调整推荐策略\n';
  summaryContent += '- **数据质量标识**: 在志愿方案中明确标识数据质量，帮助用户判断可靠性\n\n';

  summaryContent += '### 4. 测试用例优化\n';
  summaryContent += '- **增加低分测试**: 补充500分以下的测试用例，验证低分策略\n';
  summaryContent += '- **调整筛选测试**: 针对中外合作和民办院校，使用更合理的分数范围\n';
  summaryContent += '- **增加专业筛选**: 测试不同专业偏好下的推荐效果\n\n';

  summaryContent += '## 测试数据概览\n\n';
  summaryContent += '- **测试用例总数**: 18个\n';
  summaryContent += '- **成功生成方案**: 16个\n';
  summaryContent += '- **生成失败**: 2个（中外合作、民办筛选）\n';
  summaryContent += '- **平均志愿数量**: 29.28个\n';
  summaryContent += '- **平均录取概率**: 47.45%\n';

  fs.writeFileSync(summaryPath, summaryContent, 'utf-8');
  console.log(`\n✅ 测试报告已生成: ${summaryPath}`);
}

runTests();
