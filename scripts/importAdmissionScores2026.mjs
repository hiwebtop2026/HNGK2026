/**
 * 2026 年海南普通类投档线入库脚本（校验 + 预览 + 分批写入）
 *
 * 背景：算法已按 2027 届目标改造，参考分/等效分使用 2026、2025、2024 三年。
 * 2026 投档线尚未入库时，脚本必须先把官方数据校验干净，再分批写入
 * admission_scores 表，避免脏数据直接污染志愿推荐结果。
 *
 * 用法：
 *   node scripts/importAdmissionScores2026.mjs --file <路径>
 *   node scripts/importAdmissionScores2026.mjs --file <路径> --write --replace
 *
 * 参数：
 *   --file <path>       必填，官方投档线文件（.csv / .xlsx / .xls）
 *   --year <number>     招生年份，默认 2026
 *   --province <name>   省份，默认 海南
 *   --sheet <name>      Excel 工作表名，默认读取第一个工作表
 *   --write             实际写入数据库（不加该参数时只做校验预览）
 *   --replace           写入前先删除该省份该年份的旧数据（2026 为空时是空操作）
 *   --batch <number>    每批写入条数，默认 200
 *
 * 必填列（中文表头，支持常见别名）：
 *   院校名称（或院校/学校名称）、投档线（或投档最低分/最低分/分数）
 * 可选列：
 *   院校代码、专业组序号（或专业组）、院校专业组代码、科目要求（或选科要求）、
 *   招生计划（或计划数）、批次
 */
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { extname } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY，请检查 .env');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ------------------------------ 参数解析 ------------------------------

function parseArgs(argv) {
  const args = {
    file: null,
    year: 2026,
    province: '海南',
    sheet: null,
    dryRun: true,
    replace: false,
    batchSize: 200,
  };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--file') args.file = argv[++i];
    else if (key === '--year') args.year = parseInt(argv[++i], 10);
    else if (key === '--province') args.province = argv[++i];
    else if (key === '--sheet') args.sheet = argv[++i];
    else if (key === '--dry-run') args.dryRun = true;
    else if (key === '--write') args.dryRun = false;
    else if (key === '--replace') args.replace = true;
    else if (key === '--batch') args.batchSize = parseInt(argv[++i], 10);
    else throw new Error(`未知参数: ${key}`);
  }
  if (!args.file) throw new Error('缺少 --file <投档线文件路径>');
  if (!Number.isInteger(args.year) || args.year < 2020 || args.year > 2030) {
    throw new Error(`年份不合法: ${args.year}`);
  }
  return args;
}

// ------------------------------ 文件读取 ------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const content = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
  return rows;
}

async function readRows(file, sheetName) {
  const ext = extname(file).toLowerCase();
  if (ext === '.csv') {
    return parseCsv(readFileSync(file, 'utf-8'));
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const XLSX = (await import('xlsx')).default || (await import('xlsx'));
    const workbook = XLSX.read(readFileSync(file), { type: 'buffer' });
    const sheet = sheetName ? workbook.Sheets[sheetName] : workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error(`找不到工作表: ${sheetName || workbook.SheetNames[0]}`);
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  }
  throw new Error(`不支持的文件类型: ${ext}（仅支持 .csv / .xlsx / .xls）`);
}

// ------------------------------ 表头与字段映射 ------------------------------

const COLUMN_ALIASES = {
  school_name: ['院校名称', '学校名称', '院校', '招生院校', 'school_name'],
  school_code: ['院校代码', '学校代码', '学校代号', 'school_code'],
  group_number: ['专业组序号', '专业组', '专业组代码', '院校专业组', 'group_number'],
  group_code: ['院校专业组代码', '专业组代码', 'group_code'],
  group_name: ['院校专业组名称', '专业组名称', 'group_name'],
  score: ['投档线', '投档最低分', '最低分', '投档分数线', '分数', 'score'],
  subject_requirement: ['科目要求', '选科要求', '选考科目要求', '选考科目', '科目', 'subject_requirement'],
  plan_count: ['招生计划', '计划数', '计划', 'plan_count'],
  batch_type: ['批次', '录取批次', 'batch_type'],
  province: ['省份', '招生省份', 'province'],
};

const HEADER_HINTS = [
  '院校名称', '学校名称', '投档线', '投档最低分', '专业组', '院校专业组代码', '选科要求',
];

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/\uFEFF/g, '')
    .replace(/[（(]/g, '')
    .replace(/[）)]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function findHeaderRow(rows) {
  let best = { index: -1, matched: 0 };
  const scanLimit = Math.min(rows.length, 20);
  for (let i = 0; i < scanLimit; i++) {
    const cells = rows[i].map(normalizeHeader);
    const matched = HEADER_HINTS.filter(hint => cells.some(cell => cell.includes(hint))).length;
    if (matched > best.matched) best = { index: i, matched };
  }
  return best.matched >= 2 ? best.index : -1;
}

function buildColumnMap(headerRow) {
  const cells = headerRow.map(normalizeHeader);
  const map = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const target = normalizeHeader(alias);
      const index = cells.findIndex(cell => cell === target);
      if (index !== -1) {
        map[field] = index;
        break;
      }
    }
    // 精确匹配不到时退化为包含匹配，兼容“投档线（分）”这类带单位的表头
    if (map[field] === undefined) {
      for (const alias of aliases) {
        const target = normalizeHeader(alias);
        const index = cells.findIndex(cell => cell.includes(target));
        if (index !== -1) {
          map[field] = index;
          break;
        }
      }
    }
  }
  return map;
}

// ------------------------------ 字段清洗 ------------------------------

/**
 * 专业组序号统一成 "(02)" 形式，与库中既有记录保持一致。
 * 兼容 "02"、"（02）"、"专业组（02）"、"专业组02" 等写法。
 */
function normalizeGroupNumber(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const match = text.match(/[（(]?\s*(\d{1,3})\s*[）)]?/);
  if (!match) return '';
  const num = parseInt(match[1], 10);
  return Number.isNaN(num) ? '' : `(${String(num).padStart(2, '0')})`;
}

/**
 * 从 "华北电力大学(北京)(02)" 这类专业组名称中拆出学校名。
 * 末尾的专业组序号要剥离，中间校区括号要保留。
 */
function extractSchoolName(groupName) {
  return String(groupName ?? '')
    .replace(/[（(]\s*\d{1,3}\s*[）)]\s*$/, '')
    .trim();
}

function toNumber(raw) {
  const text = String(raw ?? '').replace(/[分\s]/g, '').trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function normalizeSubjectRequirement(raw) {
  const text = String(raw ?? '').trim();
  if (!text || text === '不限') return '';
  // 库中选科要求统一存数字编码（如 "54"），能规整成数字的直接规整
  const digits = text.replace(/[^0-9]/g, '');
  return digits || text;
}

// ------------------------------ 校验 ------------------------------

function validateRow(row, columnMap, args) {
  const get = field => (columnMap[field] !== undefined ? row[columnMap[field]] : '');

  const rawGroupName = String(get('group_name') ?? '').trim();
  // school_name 列可能因表头包含“院校”被误映射到专业组代码列（纯数字），
  // 院校名一律以专业组名称剥离末尾组号后的结果为准，名称缺失时才用独立列。
  const rawSchoolName = String(get('school_name') ?? '').trim();
  const schoolName = extractSchoolName(rawGroupName)
    || (/^\d+$/.test(rawSchoolName) ? '' : extractSchoolName(rawSchoolName));
  const rawGroupNumber = get('group_number');
  // group_number 列也可能被误映射到“院校专业组代码”列（6 位代码会被当成序号），
  // 组号以名称末尾的 (NN) 为准，名称没有时才用独立列。
  const groupNumber = normalizeGroupNumber(rawGroupName) || normalizeGroupNumber(rawGroupNumber);
  const rawGroupCode = String(get('group_code') ?? '').trim();
  const rawSchoolCode = String(get('school_code') ?? '').trim();
  const score = toNumber(get('score'));
  const subjectRequirement = normalizeSubjectRequirement(get('subject_requirement'));
  const planCount = toNumber(get('plan_count'));
  const batchType = String(get('batch_type') ?? '').trim() || '本科普通批';
  const province = String(get('province') ?? '').trim() || args.province;

  const errors = [];
  const warnings = [];

  if (!schoolName) errors.push('院校名称为空');
  if (score === null) errors.push('投档线缺失或非数字');
  else if (score < 300 || score > 900) errors.push(`投档线超出合理区间(300-900): ${score}`);
  else if (score < 400) warnings.push(`投档线偏低，请确认是否本科普通批: ${score}`);
  if (batchType !== '本科普通批') errors.push(`批次不是本科普通批: ${batchType}`);
  if (province !== args.province) errors.push(`省份不匹配: ${province}`);

  // group_code 缺失时按"院校代码(4位)+专业组序号"补全，与库中既有记录一致
  let groupCode = rawGroupCode;
  if (!groupCode && rawSchoolCode && groupNumber) {
    const seq = groupNumber.replace(/[^0-9]/g, '').padStart(2, '0');
    groupCode = `${rawSchoolCode}${seq}`;
  }
  if (!groupCode) warnings.push('院校专业组代码缺失，将用学校名+专业组序号作为唯一键');
  if (!groupNumber) warnings.push('专业组序号缺失，可能与同校其他专业组互相覆盖');

  const groupName = rawGroupName || `${schoolName}${groupNumber}`;
  const uniqueKey = `${schoolName}#${groupNumber || groupCode || groupName}`;

  return {
    errors,
    warnings,
    record: {
      year: args.year,
      province,
      school_name: schoolName,
      school_code: rawSchoolCode,
      group_code: groupCode || uniqueKey,
      group_name: groupName,
      group_number: groupNumber,
      subject_requirement: subjectRequirement,
      score: score === null ? 0 : score,
      plan_count: planCount,
      admission_count: null,
      batch_type: batchType,
    },
  };
}

// ------------------------------ 数据库操作 ------------------------------

async function countExisting(province, year) {
  const { count, error } = await supabase
    .from('admission_scores')
    .select('id', { count: 'exact', head: true })
    .eq('province', province)
    .eq('year', year);
  if (error) throw new Error(`查询已有数据失败: ${error.message}`);
  return count ?? 0;
}

async function replaceYear(province, year) {
  const { error } = await supabase
    .from('admission_scores')
    .delete()
    .eq('province', province)
    .eq('year', year);
  if (error) throw new Error(`删除旧数据失败: ${error.message}`);
}

async function insertBatches(records, batchSize) {
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    const { error } = await supabase.from('admission_scores').insert(chunk);
    if (error) throw new Error(`第 ${i / batchSize + 1} 批写入失败: ${error.message}`);
    inserted += chunk.length;
    console.log(`   已写入 ${inserted}/${records.length}`);
  }
  return inserted;
}

// ------------------------------ 主流程 ------------------------------

async function main() {
  const args = parseArgs(process.argv);
  console.log('='.repeat(60));
  console.log(`投档线导入：${args.province} ${args.year} 年`);
  console.log(`文件：${args.file}`);
  console.log(`模式：${args.dryRun ? 'dry-run（仅校验，不写库）' : '写入数据库'}`);
  console.log('='.repeat(60));

  const rows = await readRows(args.file, args.sheet);
  const headerIndex = findHeaderRow(rows);
  if (headerIndex === -1) throw new Error('未识别到表头，请确认文件包含“院校名称/投档线”等列');

  const columnMap = buildColumnMap(rows[headerIndex]);
  const missingRequired = ['school_name', 'score'].filter(field => columnMap[field] === undefined);
  if (missingRequired.length > 0) {
    throw new Error(`缺少必填列: ${missingRequired.join(', ')}；已识别表头: ${rows[headerIndex].join(' | ')}`);
  }

  console.log(`表头行号: ${headerIndex + 1}，识别列: ${Object.keys(columnMap).join(', ')}`);

  const dataRows = rows.slice(headerIndex + 1);
  const records = [];
  const errors = [];
  const warnings = [];
  const duplicateMap = new Map();
  let duplicateCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i];
    if (!raw || raw.every(cell => String(cell ?? '').trim() === '')) continue;

    // 官方文件末尾常有“科目要求”代码说明等页脚注释：
    // 整行只有一格长文本、没有分数和代码，直接跳过，不当错误数据处理。
    const nonEmptyCells = raw.filter(cell => String(cell ?? '').trim() !== '');
    if (nonEmptyCells.length === 1 && String(nonEmptyCells[0]).length > 20) {
      console.log(`跳过页脚注释行（第 ${headerIndex + i + 2} 行）`);
      continue;
    }

    const result = validateRow(raw, columnMap, args);
    const lineNo = headerIndex + i + 2;

    if (result.errors.length > 0) {
      errors.push({ lineNo, messages: result.errors, raw });
      continue;
    }
    if (result.warnings.length > 0) {
      warnings.push({ lineNo, messages: result.warnings });
    }

    const key = `${result.record.school_name}#${result.record.group_number || result.record.group_code}`;
    if (duplicateMap.has(key)) {
      duplicateCount++;
      errors.push({
        lineNo,
        messages: [`与第 ${duplicateMap.get(key)} 行重复（${key}）`],
        raw,
      });
      continue;
    }
    duplicateMap.set(key, lineNo);
    records.push(result.record);
  }

  const scores = records.map(r => r.score);
  const summary = {
    read: dataRows.length,
    valid: records.length,
    errors: errors.length,
    warnings: warnings.length,
    duplicates: duplicateCount,
    minScore: scores.length ? Math.min(...scores) : null,
    maxScore: scores.length ? Math.max(...scores) : null,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    missingGroupNumber: records.filter(r => !r.group_number).length,
    missingGroupCode: records.filter(r => !r.group_code).length,
  };

  console.log('\n--- 校验报告 ---');
  console.log(JSON.stringify(summary, null, 2));

  if (errors.length > 0) {
    console.log(`\n--- 错误明细（前 20 条，共 ${errors.length} 条）---`);
    for (const item of errors.slice(0, 20)) {
      console.log(`第 ${item.lineNo} 行: ${item.messages.join('；')}`);
    }
    console.log('\n存在错误，已中止导入。请修正源文件后重试。');
    process.exitCode = 1;
    return;
  }

  if (warnings.length > 0) {
    console.log(`\n--- 警告明细（前 10 条，共 ${warnings.length} 条）---`);
    for (const item of warnings.slice(0, 10)) {
      console.log(`第 ${item.lineNo} 行: ${item.messages.join('；')}`);
    }
  }

  const existing = await countExisting(args.province, args.year);
  console.log(`\nadmission_scores 中 ${args.province} ${args.year} 年现有记录: ${existing} 条`);

  if (args.dryRun) {
    console.log('\ndry-run 完成，未写入数据库。确认无误后加 --write（如该年份已有数据再加 --replace）。');
    return;
  }

  if (existing > 0 && !args.replace) {
    console.log('\n该年份已有数据，为避免覆盖已中止。如确认要整年替换，请加 --replace。');
    process.exitCode = 1;
    return;
  }

  if (args.replace && existing > 0) {
    console.log(`删除旧数据 ${existing} 条...`);
    await replaceYear(args.province, args.year);
  }

  console.log(`开始写入 ${records.length} 条记录...`);
  const inserted = await insertBatches(records, args.batchSize);
  console.log(`\n完成：成功写入 ${inserted} 条。`);

  const after = await countExisting(args.province, args.year);
  console.log(`写入后 ${args.province} ${args.year} 年记录: ${after} 条`);
}

main().catch(err => {
  console.error(`\n导入失败: ${err.message}`);
  process.exit(1);
});
