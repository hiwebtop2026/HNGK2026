import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testLines = [
  "专业分数线",
  "海南",
  "2025",
  "本科批",
  "请选择",
  "专业",
  "最低分",
  "最低位次",
  "人数",
  "批次线差",
  "中医学",
  "763",
  "333",
  "1",
  "283",
  "本科批",
  "(领军人才培养计划)(不招色盲、色弱)",
  "选科要求：物+化(2科必选)",
  "中医学",
  "727",
  "900",
  "2",
  "247",
  "本科批",
  "(卓越5+3一体化)(不招色盲、色弱)",
  "选科要求：物+化(2科必选)",
  "中药学",
  "692",
  "2130",
  "1",
  "212",
  "本科批",
  "(时珍国药班)(不招色盲、色弱)",
  "选科要求：物+化(2科必选)",
  "中药制药",
  "689",
  "2274",
  "1",
  "209",
  "本科批",
  "(不招色盲、色弱)",
  "选科要求：物+化(2科必选)",
  "针灸推拿学",
  "688",
  "2336",
  "1",
  "208",
  "本科批",
  "(不招色盲、色弱)",
  "选科要求：不限",
];

function isMajorName(line) {
  if (line.length < 2 || line.length > 60) return false;
  if (/^\d+$/.test(line)) return false;
  if (/^\d/.test(line)) return false;
  if (/^[\(（]/.test(line)) return false;
  if (/^选科要求/.test(line)) return false;
  if (line.includes('？') || line.includes('?')) return false;
  if (line.includes('：') && line.length > 20) return false;
  if (line.includes('vs') || line.includes('VS')) return false;
  if (line.includes('怎么样') || line.includes('如何') || line.includes('好吗')) return false;
  if (line.includes('体验') || line.includes('指南') || line.includes('解析') || 
      line.includes('排名') || line.includes('就业前景')) return false;
  if (line.includes('宿舍') || line.includes('食堂') || line.includes('校区') || 
      line.includes('新生') || line.includes('毕业')) return false;
  if (line.includes('考研') || line.includes('读研') || line.includes('研究生')) return false;
  if (line.includes('学习') || line.includes('高效') || line.includes('动力') || 
      line.includes('灵感') || line.includes('节奏') || line.includes('进度')) return false;
  if (line.includes('治愈') || line.includes('实验室') || line.includes('同学') || 
      line.includes('酱') || line.includes('森林')) return false;
  if (line.includes('生存') || line.includes('现状') || line.includes('照片') || line.includes('章程')) return false;
  if (line.includes('升学率') || line.includes('出国率') || line.includes('就业率') || 
      line.includes('薪酬') || line.includes('就业方向') || line.includes('就业单位')) return false;
  if (line.includes('王牌') || line.includes('最牛') || line.includes('哪些')) return false;
  if (line.length > 40 && (line.includes('，') || line.includes(','))) return false;
  if (/^[a-zA-Z]+$/.test(line)) return false;
  return true;
}

function extractFromLines(lines) {
  const results = [];
  let currentRecord = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.length < 1) continue;

    if (line.includes('专业分数线') || line.includes('最低分') || line.includes('最低位次') ||
        line.includes('批次线差') || line.includes('请选择') ||
        line === '选科要求' || line === '专业' || line === '院校' ||
        line === '招生类型' || line === '分数' || line === '位次' || line === '人数') {
      continue;
    }

    if (/^(北京|上海|天津|海南|重庆|广东|湖南|湖北|江苏|浙江|山东|河北|辽宁|福建|四川|河南|安徽|江西|广西|云南|贵州|甘肃|青海|宁夏|新疆|内蒙古|黑龙江|吉林|辽宁|西藏|2025|2024|2023|2022|2021|2020|本科批|本科批A段|专科批|综合|物理类|历史类|物理|历史|请选择|综|理|文)$/.test(line)) {
      continue;
    }

    if (line.includes('暂无') || line.includes('可尝试切换')) continue;
    if (line.includes('数据来源于') || line.includes('掌上志愿')) continue;

    const isMajorLine = isMajorName(line);

    if (isMajorLine) {
      if (currentRecord && currentRecord.major_name) {
        if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
          results.push(JSON.parse(JSON.stringify(currentRecord)));
        }
      }

      currentRecord = {
        major_name: line,
        min_score: undefined,
        min_rank: undefined,
        person_count: undefined,
        major_group: '',
        subject_requirement: '',
        major_description: '',
        batch: '本科批',
      };
      const bracketMatch = line.match(/([\(（].*[\)）])/);
      if (bracketMatch) {
        currentRecord.major_description = bracketMatch[1];
        currentRecord.major_name = line.replace(bracketMatch[1], '').trim();
      }
      continue;
    }

    if (!currentRecord) continue;

    if (line.includes('包含专业') || (line.includes('包含') && line.includes('专业'))) {
      currentRecord.major_description = line;
      continue;
    }

    if (/^[\(（]/.test(line)) {
      currentRecord.major_description = line;
      continue;
    }

    if (line.includes('选科要求：') || line.includes('选科要求:')) {
      const match = line.match(/选科要求[：:]\s*(.+)/);
      if (match) {
        currentRecord.subject_requirement = match[1].trim();
      } else {
        currentRecord.subject_requirement = line;
      }
      continue;
    }

    if (line.includes('选科要求') && line.includes('本科批')) {
      const match = line.match(/选科要求[：:]\s*(.+)/);
      if (match) {
        currentRecord.subject_requirement = match[1].trim();
      }
      continue;
    }

    if ((line.includes('必选') || line.includes('选考') || line.includes('科目要求')) && !currentRecord.subject_requirement) {
      if (line.length < 60) {
        currentRecord.subject_requirement = line;
      }
      continue;
    }

    if (line.includes('专业组')) {
      const groupMatch = line.match(/专业组\s*[（(]?\s*([0-9０-９]+)\s*[）)]?/);
      if (groupMatch) {
        currentRecord.major_group = '专业组（' + groupMatch[1] + '）';
      } else if (line.length < 30) {
        currentRecord.major_group = line;
      }
      continue;
    }

    if (line.includes('本科批A段')) {
      currentRecord.batch = '本科批A段';
      continue;
    }

    const scoreMatch = line.match(/(\d{2,3})\s*分/);
    if (scoreMatch && currentRecord.min_score === undefined) {
      const score = parseInt(scoreMatch[1]);
      if (score > 100 && score < 800) {
        currentRecord.min_score = score;
        continue;
      }
    }

    const rankMatch = line.match(/(\d{3,8})\s*位次/);
    if (rankMatch) {
      currentRecord.min_rank = parseInt(rankMatch[1]);
      continue;
    }

    const countMatch = line.match(/(\d+)\s*人/);
    if (countMatch && currentRecord.person_count === undefined) {
      currentRecord.person_count = parseInt(countMatch[1]);
      continue;
    }

    if (/^\d+$/.test(line)) {
      const num = parseInt(line);

      console.log('  处理数字:', num, '- 分数:', currentRecord?.min_score, '- 位次:', currentRecord?.min_rank, '- 人数:', currentRecord?.person_count);

      // 如果分数和位次都已经设置，那么剩下的数字只能是人数或批次线差
      if (currentRecord.min_score !== undefined && currentRecord.min_rank !== undefined) {
        console.log('    -> 分数和位次都已设置');
        // 只有在1-100范围内才作为人数（超过100的是批次线差）
        if (currentRecord.person_count === undefined && num > 0 && num <= 100) {
          console.log('    -> 作为人数:', num);
          currentRecord.person_count = num;
          continue;
        }
        console.log('    -> 作为批次线差，跳过:', num);
        continue;
      }

      // 第一个数字：优先作为分数（100-799）
      if (currentRecord.min_score === undefined && num >= 100 && num < 800) {
        console.log('    -> 作为分数:', num);
        currentRecord.min_score = num;
        continue;
      }

      // 第二个数字：优先作为位次（300-1000000）
      if (currentRecord.min_rank === undefined && num >= 300 && num < 1000000) {
        console.log('    -> 作为位次:', num);
        currentRecord.min_rank = num;
        continue;
      }

      console.log('    -> 未匹配任何条件，跳过:', num);
    }
  }

  if (currentRecord && currentRecord.major_name) {
    if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
      results.push(JSON.parse(JSON.stringify(currentRecord)));
    }
  }

  return results;
}

console.log('=== 测试提取逻辑 ===');
console.log('输入行数:', testLines.length);
console.log('');

const results = extractFromLines(testLines);

console.log('输出结果:', results.length, '条');
console.log('');

for (const r of results) {
  console.log('专业:', r.major_name);
  console.log('  分数:', r.min_score, '| 位次:', r.min_rank, '| 人数:', r.person_count);
  console.log('  专业说明:', r.major_description || '(空)');
  console.log('  选科要求:', r.subject_requirement || '(空)');
  console.log('');
}

console.log('=== 验证结果 ===');
console.log('期望人数应该是: 1, 2, 1, 1, 1');
console.log('实际人数:', results.map(r => r.person_count).join(', '));
console.log('');

const allCorrect = results.every(r => r.person_count === 1 || r.person_count === 2);
console.log('人数是否全部正确:', allCorrect ? '✓' : '✗');

const allPresent = ['中医学', '中药学', '中药制药', '针灸推拿学'].every(name => 
  results.some(r => r.major_name.includes(name))
);
console.log('专业是否全部存在:', allPresent ? '✓' : '✗');