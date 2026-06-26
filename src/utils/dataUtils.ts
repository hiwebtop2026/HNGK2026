// 海南省2023-2025年投档分数线数据
// 数据来源：海南省考试局官网

export interface SchoolScore {
  code: string;           // 院校专业组代码
  name: string;           // 院校专业组名称
  subject: number;        // 科目要求 (54=物理+化学)
  province: string;       // 省份
  level: string;          // 院校层次 (985/211/双一流/普通本科)
  score2025: number | null;
  score2024: number | null;
  score2023: number | null;
}

// 科目要求说明
export const SUBJECT_REQUIREMENTS: Record<number, string> = {
  0: '不限',
  4: '物理',
  5: '化学',
  6: '生物',
  7: '思想政治',
  8: '历史',
  9: '地理',
  54: '物理+化学(均须选考)',
  45: '物理或化学',
  56: '化学+生物',
  59: '化学+地理',
  654: '化学+生物+物理',
  456: '物理+化学+生物(选一门)',
  457: '物理+化学+生物+历史',
  467: '物理+化学+历史+生物',
  87: '历史+政治',
};

// 热门专业推荐映射
export const MAJOR_SUGGESTIONS: Record<string, string> = {
  '上海海洋大学': '海洋科学、水产养殖、食品科学与工程——海洋特色鲜明，就业前景好',
  '西南石油大学': '石油工程、化学工程、机械工程——能源领域实力强',
  '西交利物浦大学': '金融数学、电子信息、工商管理——国际化办学，升学优势大',
  '南昌大学': '食品科学、材料科学、医学——211高校，学科实力雄厚',
  '延边大学': '朝鲜语、临床医学、化学——211高校，东北区位优势',
  '四川师范大学': '师范类专业、教育学——师范名校，就业稳定',
  '湖南中医药大学': '中医学、中药学、针灸推拿——中医药特色',
  '上海体育大学': '体育学、运动康复、体育经济——体育特色名校',
  '重庆医科大学': '临床医学、口腔医学、药学——医学实力强',
  '南京工程学院': '电气工程、机械工程、土木工程——应用型强',
  '东北林业大学': '林学、林业工程、生态学——211高校，农林特色',
  '长沙理工大学': '交通运输、土木工程、电气工程——行业特色鲜明',
  '海南大学': '海洋科学、农学、法学——211高校，省内首选',
  '广西大学': '土木工程、机械工程——211高校',
  '贵州大学': '土木工程、计算机——211高校',
  '云南大学': '生物学、生态学——双一流高校',
  '河南大学': '历史、文学、化学——双一流高校',
  '山西大学': '物理学、哲学——双一流高校',
  '湘潭大学': '法学、数学、材料科学——综合实力强',
  '江苏大学': '机械工程、农业工程——工科实力强',
  '浙江工业大学': '化学工程、机械工程——省属重点',
  '武汉科技大学': '钢铁冶金、材料科学——行业特色',
  '西安建筑科技大学': '建筑学、土木工程——建筑老八校',
  '青岛大学': '临床医学、材料科学——综合实力强',
  '广州大学': '土木工程、教育学——省市共建',
  '深圳大学': '计算机、电子信息——新兴名校',
};

// 获取院校推荐专业
export function getMajorSuggestion(name: string): string {
  const schoolName = name.replace(/\(\d+\)/, '').trim();
  for (const [key, value] of Object.entries(MAJOR_SUGGESTIONS)) {
    if (schoolName.includes(key)) {
      return value;
    }
  }
  return '计算机科学、电气工程、机械工程等工科专业——就业前景好';
}

// 计算参考分（优先2025年）
export function getRefScore(score2025: number | null, score2024: number | null, score2023: number | null): number {
  if (score2025 !== null) return score2025;
  if (score2024 !== null) return score2024;
  return score2023 ?? 0;
}

// 判断志愿档次
export function getTier(refScore: number, baseScore: number): '冲' | '稳' | '保' {
  const diff = refScore - baseScore;
  if (diff > 5) return '冲';
  if (diff >= -5) return '稳';
  return '保';
}

// 生成推荐理由
export function getRecommendationReason(refScore: number, baseScore: number): string {
  const diff = refScore - baseScore;
  if (diff > 10) {
    return `近三年投档线稳定在${refScore}分左右，高于考生分数${diff}分，作为冲刺院校有一定录取机会，建议谨慎填报。`;
  } else if (diff > 5) {
    return `近三年投档线约${refScore}分，高于考生分数${diff}分，属于合理冲刺范围，录取机会中等。`;
  } else if (diff === 0) {
    return `近三年投档线与考生分数相当，录取把握较大，是理想的稳投院校。`;
  } else if (diff >= -5) {
    return `近三年投档线约${refScore}分，与考生分数接近，录取把握较大，建议优先考虑。`;
  } else if (diff >= -10) {
    return `近三年投档线低于考生分数${Math.abs(diff)}分，录取机会大，适合作为稳妥保底院校。`;
  } else {
    return `近三年投档线显著低于考生分数${Math.abs(diff)}分，录取概率很高，可作为最终保底选择。`;
  }
}

// 档次颜色
export const TIER_COLORS = {
  '冲': { bg: '#FCE4D6', text: '#C55000' },
  '稳': { bg: '#FFF2CC', text: '#B45309' },
  '保': { bg: '#E2EFDA', text: '#2F5233' },
};