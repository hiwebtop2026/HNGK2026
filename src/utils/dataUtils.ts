// 海南省2023-2025年投档分数线数据
// 数据来源：海南省考试局官网

export interface SchoolScore {
  code: string;           // 院校专业组代码
  name: string;           // 院校专业组名称
  subject: number;        // 科目要求 (54=物理+化学)
  subject_requirement?: string | null; // 原始选科要求文字描述（可选）
  province: string;       // 省份
  level: string;          // 院校层次 (985/211/双一流/普通本科)
  nature: '公办' | '民办' | '中外合作办学'; // 院校性质
  region: string;         // 地区（省份）
  score2025: number | null;
  score2024: number | null;
  score2023: number | null;
}

// 专业推荐信息
export interface MajorRecommendation {
  name: string;           // 专业名称
  category: string;       // 专业类别
  heat: 'top' | 'hot' | 'warm' | 'cool';  // 专业热度：顶尖/热门/中等/冷门
  level: 'A+' | 'A' | 'B+' | 'B' | 'C';  // 学科实力
  admissionTier: '冲刺' | '稳妥' | '保底';  // 录取概率档次
  probability: number;    // 录取概率 0-100
}

// 科目名称映射
export const SUBJECT_NAMES: Record<string, string> = {
  '4': '物理',
  '5': '化学',
  '6': '生物',
  '7': '思想政治',
  '8': '历史',
  '9': '地理',
};

// 六科列表
export const SUBJECT_LIST = [
  { code: '4', name: '物理', icon: '⚛️', color: 'from-blue-500 to-cyan-500' },
  { code: '5', name: '化学', icon: '🧪', color: 'from-green-500 to-emerald-500' },
  { code: '6', name: '生物', icon: '🧬', color: 'from-rose-500 to-pink-500' },
  { code: '7', name: '思想政治', icon: '📚', color: 'from-amber-500 to-orange-500' },
  { code: '8', name: '历史', icon: '🏛️', color: 'from-purple-500 to-indigo-500' },
  { code: '9', name: '地理', icon: '🌍', color: 'from-teal-500 to-green-500' },
];

// 解析科目要求代码（数字代码 -> 文字描述）
// 规则：
// - 0: 不限
// - 单位数: 单科
// - 多位数: 数字从小到大=选考其中一门即可，数字从大到小=均须选考
export function parseSubjectRequirement(code: number): string {
  if (code === 0) return '不限';
  
  const digits = String(code).split('');
  
  if (digits.length === 1) {
    return SUBJECT_NAMES[digits[0]] || `科目${code}`;
  }
  
  const isAscending = digits.every((d, i) => i === 0 || parseInt(digits[i - 1]) < parseInt(d));
  const isDescending = digits.every((d, i) => i === 0 || parseInt(digits[i - 1]) > parseInt(d));
  
  const names = digits.map(d => SUBJECT_NAMES[d] || d).join('+');
  
  if (isDescending) {
    return `${names}(均须选考)`;
  } else if (isAscending) {
    return `${names}(选一门即可)`;
  } else {
    return `${names}`;
  }
}

// 判断考生选科是否满足专业选科要求
// selectedSubjects: 考生选择的科目代码数组，如 ['4', '5', '6']
// requirement: 专业选科要求，支持多种格式：
//   - 数字代码：54, 45, 0, 5等
//   - 文字描述："选科要求：物理+化学", "不限", "物理或化学"等
// 科目名称到代码的映射
const SUBJECT_NAME_TO_CODE: Record<string, string> = {
  '物理': '4',
  '化学': '5',
  '生物': '6',
  '政治': '7',
  '思想政治': '7',
  '历史': '8',
  '地理': '9',
  '物': '4',
  '化': '5',
  '生': '6',
  '史': '8',
  '地': '9',
};

// 从文字描述的选科要求中解析出科目代码和类型
function parseSubjectRequirementFromString(requirement: string): { codes: string[]; type: 'all' | 'any' } {
  const reqStr = String(requirement).trim();
  
  if (!reqStr || reqStr === '0' || reqStr.includes('不限')) {
    return { codes: [], type: 'any' };
  }
  
  if (reqStr.match(/^\d+$/)) {
    const digits = reqStr.match(/[4-9]/g) || [];
    const isAscending = digits.length > 1 && digits.every((d, i) => i === 0 || parseInt(digits[i - 1]) < parseInt(d));
    return { codes: digits, type: isAscending ? 'any' : 'all' };
  }
  
  let codes: string[] = [];
  let type: 'all' | 'any' = 'all';
  
  if (reqStr.includes('必选')) {
    type = 'all';
    for (const [name, code] of Object.entries(SUBJECT_NAME_TO_CODE)) {
      if (reqStr.includes(name) && !codes.includes(code)) {
        codes.push(code);
      }
    }
  } else if (reqStr.includes('+') || reqStr.includes('均须') || reqStr.includes('均需') || reqStr.includes('2科必选') || reqStr.includes('3科必选')) {
    type = 'all';
    const parts = reqStr.split(/[+\/、，,]/);
    for (const part of parts) {
      for (const [name, code] of Object.entries(SUBJECT_NAME_TO_CODE)) {
        if (part.trim().startsWith(name) && !codes.includes(code)) {
          codes.push(code);
          break;
        }
      }
    }
  } else if (reqStr.includes('/') || reqStr.includes('选') || reqStr.includes('或')) {
    type = 'any';
    const parts = reqStr.split(/[\/、，,]/);
    for (const part of parts) {
      for (const [name, code] of Object.entries(SUBJECT_NAME_TO_CODE)) {
        if (part.trim().startsWith(name) && !codes.includes(code)) {
          codes.push(code);
          break;
        }
      }
    }
  } else {
    const reqDigits = reqStr.match(/[4-9]/g) || [];
    if (reqDigits.length > 0) {
      codes = reqDigits;
      const isAscending = codes.length > 1 && codes.every((d, i) => i === 0 || parseInt(codes[i - 1]) < parseInt(d));
      type = isAscending ? 'any' : 'all';
    }
  }
  
  codes = [...new Set(codes)];
  
  return { codes, type };
}

export function isSubjectMatch(selectedSubjects: string[], requirement: string | number): boolean {
  if (!selectedSubjects || selectedSubjects.length === 0) {
    return true;
  }
  
  const reqStr = String(requirement).trim();
  
  if (!reqStr || reqStr === '0' || reqStr.includes('不限')) {
    return true;
  }
  
  const { codes, type } = parseSubjectRequirementFromString(reqStr);
  
  if (codes.length === 0) {
    return true;
  }
  
  if (type === 'any') {
    return codes.some(d => selectedSubjects.includes(d));
  } else {
    return codes.every(d => selectedSubjects.includes(d));
  }
}

// 从选科要求文字描述中提取科目代码
export function extractSubjectCodes(requirement: string): string[] {
  const { codes } = parseSubjectRequirementFromString(String(requirement));
  return codes;
}

// 科目要求说明（保留向后兼容，使用函数生成）
export const SUBJECT_REQUIREMENTS: Record<number, string> = {
  0: '不限',
  4: '物理',
  5: '化学',
  6: '生物',
  7: '思想政治',
  8: '历史',
  9: '地理',
  54: '物理+化学(均须选考)',
  45: '物理或化学(选一门即可)',
  56: '化学+生物(均须选考)',
  65: '化学+生物(选一门即可)',
  456: '物理+化学+生物(选一门即可)',
  654: '物理+化学+生物(均须选考)',
  87: '历史+思想政治(均须选考)',
  78: '历史+思想政治(选一门即可)',
};

// 计算参考分（优先2025年）
export function getRefScore(score2025: number | null, score2024: number | null, score2023: number | null): number {
  if (score2025 !== null) return score2025;
  if (score2024 !== null) return score2024;
  return score2023 ?? 0;
}

// 判断志愿档次
export function getTier(
  refScore: number, 
  baseScore: number, 
  customDiffs?: { chong: number, wen: number, bao: number },
  province: string = '海南'
): '冲' | '稳' | '保' {
  const { chong = 10, wen = 5, bao = 5 } = customDiffs || {};
  const diff = refScore - baseScore;
  
  const isHighScoreSystem = ['海南'].includes(province);
  const adjustedChong = isHighScoreSystem ? chong * 2 : chong;
  const adjustedWen = isHighScoreSystem ? wen * 2 : wen;
  const adjustedBao = isHighScoreSystem ? bao * 2 : bao;
  
  if (diff > adjustedChong) return '冲';
  if (diff >= -adjustedWen && diff <= adjustedChong) return '稳';
  if (diff < -adjustedBao) return '保';
  return '稳';
}

// 生成推荐理由
export function getRecommendationReason(refScore: number, baseScore: number, province: string = '海南'): string {
  const diff = refScore - baseScore;
  const isHighScoreSystem = ['海南'].includes(province);
  
  if (isHighScoreSystem) {
    if (diff > 20) {
      return `近三年投档线稳定在${refScore}分左右，高于考生分数${diff}分，作为冲刺院校有一定录取机会，建议谨慎填报。`;
    } else if (diff > 10) {
      return `近三年投档线约${refScore}分，高于考生分数${diff}分，属于合理冲刺范围，录取机会中等。`;
    } else if (diff === 0) {
      return `近三年投档线与考生分数相当，录取把握较大，是理想的稳投院校。`;
    } else if (diff >= -10) {
      return `近三年投档线约${refScore}分，与考生分数接近，录取把握较大，建议优先考虑。`;
    } else if (diff >= -20) {
      return `近三年投档线低于考生分数${Math.abs(diff)}分，录取机会大，适合作为稳妥保底院校。`;
    } else {
      return `近三年投档线显著低于考生分数${Math.abs(diff)}分，录取概率很高，可作为最终保底选择。`;
    }
  }
  
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

// 专业类别定义
export interface MajorCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const MAJOR_CATEGORIES: MajorCategory[] = [
  {
    id: 'cs',
    name: '计算机类',
    icon: '💻',
    color: 'from-blue-500 to-cyan-500',
    keywords: ['计算机', '软件', '人工智能', '大数据', '数据科学', '网络工程', '信息安全', '物联网', '智能',
               '理工', '工业', '科技', '电子', '信息', '邮电', '通信', '航空航天', '航天', '工程'],
  },
  {
    id: 'ee',
    name: '电子信息类',
    icon: '📡',
    color: 'from-purple-500 to-pink-500',
    keywords: ['电子', '通信', '信息工程', '微电子', '集成电路', '光电', '自动化', '电信',
               '邮电', '理工', '工业', '科技', '航空航天', '航天', '工程'],
  },
  {
    id: 'edu',
    name: '师范类',
    icon: '📚',
    color: 'from-green-500 to-emerald-500',
    keywords: ['师范', '教育', '教学'],
  },
  {
    id: 'elec',
    name: '电气类',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-500',
    keywords: ['电气', '电力', '电工', '能源与动力', '新能源', '发电', '电网',
               '理工', '工业', '科技', '工程', '交通'],
  },
  {
    id: 'med',
    name: '医学类',
    icon: '🏥',
    color: 'from-red-500 to-rose-500',
    keywords: ['医学', '临床', '口腔', '药学', '护理', '中医', '公共卫生', '预防医学', '医科', '中医药', '医'],
  },
  {
    id: 'fin',
    name: '经管类',
    icon: '📊',
    color: 'from-indigo-500 to-violet-500',
    keywords: ['经济', '金融', '会计', '管理', '工商', '市场营销', '国际贸易', '财政', '税务',
               '财经', '商业', '经贸'],
  },
  {
    id: 'law',
    name: '法学类',
    icon: '⚖️',
    color: 'from-amber-500 to-yellow-500',
    keywords: ['法学', '法律', '政治', '社会学', '公安', '侦查', '政法'],
  },
  {
    id: 'art',
    name: '文科综合',
    icon: '🎭',
    color: 'from-pink-500 to-rose-500',
    keywords: ['文学', '新闻', '传播', '历史', '哲学', '外语', '翻译', '汉语言',
               '师范', '语言', '财经', '政法', '文科', '综合'],
  },
  {
    id: 'international',
    name: '中外合作办学类',
    icon: '🌍',
    color: 'from-cyan-500 to-blue-500',
    keywords: ['中外合作', '国际', '中外合办', '国际学院', '国际交流', '海外', '留学', '国际教育'],
  },
];

// 根据院校专业组名称匹配专业类别
export function matchMajorCategories(schoolName: string): string[] {
  const matched: string[] = [];
  for (const category of MAJOR_CATEGORIES) {
    if (category.keywords.some(kw => schoolName.includes(kw))) {
      matched.push(category.id);
    }
  }
  return matched;
}

// 一分一段位次信息接口
export interface RankInfo {
  score: number;                    // 考生分数
  rank: number;                     // 全体考生位次
  categoryRank?: number;            // 分科位次（物理类/历史类）
  subjectRank?: number;             // 选考科目位次（3+3模式下选考科目的位次）
  subjectRankCategory?: string;     // 选考科目位次对应的科目（如"物理"）
  category?: '物理类' | '历史类' | '普通类';  // 考生类别（普通类用于不分文理的省份）
  percentile: number;               // 超过百分比
  totalCandidates: number;          // 总考生人数
  year2025: number | null;         // 2025年对应分数
  year2024: number | null;         // 2024年对应分数
  year2023: number | null;         // 2023年对应分数
  dataSource: string;              // 数据来源
  note: string;                     // 说明
}

// 海南省历年本科分数线
// 数据来源：海南省考试局官方公布、掌上高考大数据
const HAINAN_SCORE_LINES = {
  物理类: {
    2026: { batch: 567, special: 482 },  // 2026年预估
    2025: { batch: 567, special: 482 },
    2024: { batch: 568, special: 483 },
    2023: { batch: 539, special: 466 },
  },
  历史类: {
    2026: { batch: 606, special: 530 },  // 2026年预估
    2025: { batch: 606, special: 530 },
    2024: { batch: 607, special: 530 },
    2023: { batch: 587, special: 518 },
  },
};

// 海南省2026年普通类考生总人数
// 数据来源：海南省考试局2026年一分一段表PDF（254分及以上共70398人）
const HAINAN_CANDIDATES_2026 = {
  普通类: 70398,
  物理类: 39739,
  历史类: 24686,
};

// 获取考生类别
function getSubjectCategory(subject: number): '物理类' | '历史类' {
  const subjectStr = String(subject);
  if (subjectStr.includes('4') || subjectStr.includes('5') || subjectStr.includes('6')) {
    return '物理类';
  }
  if (subjectStr.includes('7') || subjectStr.includes('8') || subjectStr.includes('9')) {
    return '历史类';
  }
  if (subject === 54 || subject === 45 || subject === 456 || subject === 654) {
    return '物理类';
  }
  return '历史类';
}

// 从选科代码中提取各选考科目名称（用于3+3模式省份查询选考科目位次）
// 例如: 456 → ['物理', '化学', '生物']
function getSubjectCategoryNames(subject: number): string[] {
  const subjectStr = String(subject);
  const subjectMap: Record<string, string> = {
    '4': '物理',
    '5': '化学',
    '6': '生物',
    '7': '思想政治',
    '8': '历史',
    '9': '地理',
  };
  const categories: string[] = [];
  for (const digit of subjectStr) {
    if (subjectMap[digit] && !categories.includes(subjectMap[digit])) {
      categories.push(subjectMap[digit]);
    }
  }
  return categories;
}

// 海南省2026年普通类考生一分一段表（官方PDF数据）
// 数据来源：海南省考试局2026年一分一段表PDF（P020260625627884748040.pdf）
// 全体考生一分一段关键数据点（官方准确数据）
const ALL_RANK_REFERENCE: [number, number][] = [
  [800, 111],
  [780, 209],
  [760, 378],
  [750, 500],
  [740, 659],
  [720, 1122],
  [710, 1435],
  [700, 1835],
  [690, 2306],
  [680, 2893],
  [670, 3576],
  [660, 4396],
  [650, 5351],
  [640, 6472],
  [630, 7745],
  [620, 9168],
  [610, 10820],
  [605, 11708],
  [603, 12081],
  [600, 12630],
  [590, 14626],
  [580, 16831],
  [570, 19201],
  [567, 19984],
  [560, 21745],
  [550, 24383],
  [540, 27160],
  [530, 30064],
  [520, 32991],
  [510, 35999],
  [500, 38953],
  [490, 41906],
  [479, 45098],
  [470, 47520],
  [460, 50150],
  [450, 52581],
  [440, 54832],
  [430, 56926],
  [420, 58832],
  [410, 60574],
  [400, 62105],
  [390, 63526],
  [380, 64715],
  [370, 65786],
  [360, 66703],
  [350, 67511],
  [340, 68189],
  [330, 68729],
  [320, 69174],
  [310, 69531],
  [300, 69781],
  [290, 70016],
  [280, 70156],
  [270, 70276],
  [260, 70349],
  [254, 70398],
];

// 物理类一分一段关键数据点（官方PDF数据）- 选考物理的考生
const PHYSICS_RANK_REFERENCE: [number, number][] = [
  [800, 95],
  [780, 176],
  [760, 320],
  [750, 425],
  [740, 548],
  [720, 903],
  [710, 1130],
  [700, 1450],
  [690, 1812],
  [680, 2243],
  [670, 2752],
  [660, 3366],
  [650, 4068],
  [640, 4880],
  [630, 5782],
  [620, 6786],
  [610, 7914],
  [605, 8530],
  [603, 8785],
  [600, 9155],
  [590, 10505],
  [580, 11905],
  [570, 13392],
  [567, 13887],
  [560, 15003],
  [550, 16621],
  [540, 18318],
  [530, 20099],
  [520, 21881],
  [510, 23605],
  [500, 25298],
  [490, 26908],
  [479, 28583],
  [470, 29830],
  [460, 31151],
  [450, 32314],
  [440, 33327],
  [430, 34230],
  [420, 35055],
  [410, 35776],
  [400, 36400],
  [390, 36961],
  [380, 37429],
  [370, 37865],
  [360, 38224],
  [350, 38539],
  [340, 38836],
  [330, 39069],
  [320, 39249],
  [310, 39396],
  [300, 39498],
  [290, 39579],
  [280, 39635],
  [270, 39686],
  [260, 39717],
  [254, 39739],
];

// 历史类一分一段关键数据点（官方PDF数据）- 选考历史的考生
const HISTORY_RANK_REFERENCE: [number, number][] = [
  [800, 18],
  [780, 40],
  [760, 72],
  [750, 93],
  [740, 130],
  [720, 236],
  [710, 325],
  [700, 404],
  [690, 510],
  [680, 659],
  [670, 826],
  [660, 1034],
  [650, 1272],
  [640, 1560],
  [630, 1914],
  [620, 2290],
  [610, 2793],
  [605, 3039],
  [603, 3140],
  [600, 3303],
  [590, 3892],
  [580, 4600],
  [570, 5385],
  [567, 5636],
  [560, 6199],
  [550, 7042],
  [540, 7959],
  [530, 8887],
  [520, 9847],
  [510, 10898],
  [500, 11924],
  [490, 12992],
  [479, 14188],
  [470, 15103],
  [460, 16144],
  [450, 17111],
  [440, 18034],
  [430, 18932],
  [420, 19749],
  [410, 20520],
  [400, 21157],
  [390, 21748],
  [380, 22278],
  [370, 22744],
  [360, 23130],
  [350, 23476],
  [340, 23752],
  [330, 23959],
  [320, 24154],
  [310, 24305],
  [300, 24414],
  [290, 24521],
  [280, 24579],
  [270, 24633],
  [260, 24667],
  [254, 24686],
];

// 使用线性插值计算位次（基于参考数据点）
function interpolateRank(score: number, references: [number, number][]): number {
  if (score >= references[0][0]) return references[0][1];
  if (score <= references[references.length - 1][0]) return references[references.length - 1][1];
  
  for (let i = 0; i < references.length - 1; i++) {
    const [highScore, highRank] = references[i];
    const [lowScore, lowRank] = references[i + 1];
    
    if (score <= highScore && score >= lowScore) {
      const ratio = (highScore - score) / (highScore - lowScore);
      return Math.round(highRank + (lowRank - highRank) * ratio);
    }
  }
  
  return references[references.length - 1][1];
}

// 根据分数计算位次（基于数据库一分一段表）
// 优先从数据库获取，失败时回退到本地参考数据
export async function fetchRankInfo(score: number, subject: number, province: string = '海南'): Promise<RankInfo> {
  const category = getSubjectCategory(subject);
  console.debug(`[fetchRankInfo] 开始查询: score=${score}, subject=${subject}, province=${province}, category=${category}`);

  const is3Plus3Mode = ['海南', '天津', '北京', '上海', '山东', '浙江'].includes(province);
  const queryCategory = is3Plus3Mode ? '普通类' : category;
  console.debug(`[fetchRankInfo] 3+3模式=${is3Plus3Mode}, queryCategory=${queryCategory ?? 'undefined'}`);

  // 获取考生的选考科目列表（用于查询选考科目位次）
  const subjectCategories = is3Plus3Mode ? getSubjectCategoryNames(subject) : [];

  const yearsToTry = [2026, 2025, 2024, 2023];
  let dbResult: RankInfo | null = null;
  let matchedYear: number | null = null;

  for (const year of yearsToTry) {
    try {
      const { scoreDistributionService } = await import('../services/scoreDistributionService');

      const rankInfo = await scoreDistributionService.getRankByScore(province, score, year, queryCategory);
      const stats = await scoreDistributionService.getStats(province, year);

      console.debug(`[fetchRankInfo] 尝试年份${year}: rankInfo=`, rankInfo, `stats=`, stats);

      if (rankInfo && rankInfo.minRank && rankInfo.maxRank) {
        const expectedTotal = province === '海南' ? 70398 : (province === '天津' ? 77488 : null);

        if (expectedTotal && rankInfo.maxRank > expectedTotal * 1.5) {
          console.warn(`[fetchRankInfo] 年份${year}数据异常: maxRank=${rankInfo.maxRank} > 预期${expectedTotal}，跳过`);
          continue;
        }

        const totalCandidates = stats?.max_cumulative || rankInfo.cumulativeCount || rankInfo.maxRank;
        const percentile = totalCandidates > 0
          ? Math.round((1 - rankInfo.cumulativeCount / totalCandidates) * 10000) / 100
          : null;

        dbResult = {
          score,
          rank: rankInfo.minRank,
          categoryRank: rankInfo.minRank,
          category: is3Plus3Mode ? '普通类' : category,
          percentile,
          totalCandidates,
          year2025: null,
          year2024: null,
          year2023: null,
          dataSource: `${province}${year}年一分一段表`,
          note: `位次区间：${rankInfo.minRank}~${rankInfo.maxRank}，同分人数：${rankInfo.count}人`,
        };
        matchedYear = year;
        break;
      }
    } catch (error) {
      console.debug(`[fetchRankInfo] 年份${year}查询失败:`, error);
    }
  }

  // 如果成功获取了普通类位次，且是3+3模式，尝试查询选考科目位次
  if (dbResult && is3Plus3Mode && subjectCategories.length > 0 && matchedYear) {
    try {
      const { scoreDistributionService } = await import('../services/scoreDistributionService');
      // 优先查询第一个选考科目（通常是主科）
      for (const subjectCat of subjectCategories) {
        const subjectRankInfo = await scoreDistributionService.getRankByScore(province, score, matchedYear, subjectCat);
        if (subjectRankInfo && subjectRankInfo.minRank && subjectRankInfo.maxRank) {
          dbResult.subjectRank = subjectRankInfo.minRank;
          dbResult.subjectRankCategory = subjectCat;
          dbResult.note += `；${subjectCat}选考位次：${subjectRankInfo.minRank}~${subjectRankInfo.maxRank}（同分${subjectRankInfo.count}人）`;
          console.debug(`[fetchRankInfo] 选考科目位次: ${subjectCat}=${subjectRankInfo.minRank}~${subjectRankInfo.maxRank}`);
          break;
        }
      }
    } catch (error) {
      console.debug(`[fetchRankInfo] 查询选考科目位次失败:`, error);
    }
  }

  if (dbResult) {
    console.debug(`[fetchRankInfo] 使用数据库数据: rank=${dbResult.rank}, subjectRank=${dbResult.subjectRank ?? 'N/A'}`);
    return dbResult;
  }

  console.warn(`[fetchRankInfo] 数据库查询无结果或数据异常，回退到本地参考数据`);

  const localData = getLocalRankInfo(province, score, category);
  if (localData) {
    console.debug(`[fetchRankInfo] 使用本地参考数据`);
    return localData;
  }

  console.warn(`[fetchRankInfo] ${province} 无任何位次数据`);
  return {
    score,
    rank: null,
    categoryRank: null,
    category: is3Plus3Mode ? '普通类' : category,
    percentile: null,
    totalCandidates: null,
    year2025: null,
    year2024: null,
    year2023: null,
    dataSource: '暂无数据',
    note: `${province}一分一段表数据暂未录入数据库，请选择其他地区或稍后再试`,
  };
}

// 天津2026年一分一段表参考数据（关键分数点）
// 数据来源：天津市教育招生考试院2026年6月24日官方发布
// 验证日期：2026年7月4日
const TIANJIN_RANK_REFERENCE: [number, number][] = [
  [680, 197],   // 680分=197名
  [650, 1822],  // 650分=1822名
  [640, 2905],  // 640分=2905名
  [630, 4218],  // 630分=4218名
  [620, 5940],  // 620分=5940名
  [610, 7886],  // 610分=7886名
  [600, 10077], // 600分=10077名
  [590, 12449], // 590分=12449名
  [580, 15083], // 580分=15083名
  [570, 17814], // 570分=17814名
  [560, 20579], // 560分=20579名
  [550, 23491], // 550分=23491名
  [547, 24370], // 547分=24370名（特招线）
  [540, 26502], // 540分=26502名
  [530, 29562], // 530分=29562名
  [520, 32718], // 520分=32718名
  [510, 35936], // 510分=35936名
  [500, 39232], // 500分=39232名
  [490, 42525], // 490分=42525名
  [480, 45829], // 480分=45829名
  [458, 52753], // 458分=52753名（本科线）
  [450, 55108], // 450分=55108名
  [400, 67300], // 400分=67300名
  [350, 74278], // 350分=74278名
  [300, 77488], // 300分=77488名
];

// 天津考生总人数（300分及以上）
const TIANJIN_CANDIDATES_2026 = 77488;

// 获取本地位次参考数据
function getLocalRankInfo(province: string, score: number, category: '物理类' | '历史类'): RankInfo | null {
  if (province === '海南') {
    const totalCandidates = HAINAN_CANDIDATES_2026.普通类;
    
    const allRank = interpolateRank(score, ALL_RANK_REFERENCE);
    
    const categoryRef = category === '物理类' ? PHYSICS_RANK_REFERENCE : HISTORY_RANK_REFERENCE;
    const categoryRank = interpolateRank(score, categoryRef);
    
    const percentile = Math.round((1 - allRank / totalCandidates) * 10000) / 100;
    
    const batch2026 = HAINAN_SCORE_LINES[category][2026].batch;
    const batch2025 = HAINAN_SCORE_LINES[category][2025].batch;
    const batch2024 = HAINAN_SCORE_LINES[category][2024].batch;
    const batch2023 = HAINAN_SCORE_LINES[category][2023].batch;
    
    const diff2025 = batch2026 - batch2025;
    const diff2024 = batch2026 - batch2024;
    const diff2023 = batch2026 - batch2023;
    
    const year2025 = Math.round(score - diff2025);
    const year2024 = Math.round(score - diff2024);
    const year2023 = Math.round(score - diff2023);
    
    return {
      score,
      rank: allRank,
      categoryRank,
      category,
      percentile,
      totalCandidates,
      year2025: year2025,
      year2024: year2024,
      year2023: year2023,
      dataSource: '海南省考试局2026年一分一段表（参考）',
      note: '注：数据库查询失败，使用本地参考数据，仅供参考',
    };
  }
  
  if (province === '天津') {
    const totalCandidates = TIANJIN_CANDIDATES_2026;
    const rank = interpolateRank(score, TIANJIN_RANK_REFERENCE);
    const percentile = Math.round((1 - rank / totalCandidates) * 10000) / 100;
    
    return {
      score,
      rank,
      categoryRank: rank,
      category: '普通类',
      percentile,
      totalCandidates,
      year2025: null,
      year2024: null,
      year2023: null,
      dataSource: '天津市教育招生考试院2026年一分一段表（参考）',
      note: '注：数据库查询失败，使用本地参考数据，仅供参考',
    };
  }
  
  return null;
}
