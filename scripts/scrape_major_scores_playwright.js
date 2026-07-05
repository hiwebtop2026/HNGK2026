import dotenv from 'dotenv';
dotenv.config();

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const EXCEL_FILE = 'C:\\Users\\lhp\\Desktop\\2023-2025年海南高考本科投档分数线.xlsx';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const YEARS = [2023, 2024, 2025];
const PROVINCE = '海南';
const BATCH = '本科批';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface MajorScore {
  school_name: string;
  school_code?: string;
  province: string;
  level?: string;
  major_name: string;
  major_group?: string;
  subject_requirement?: string;
  year: number;
  min_score?: number;
  min_rank?: number;
  avg_score?: number;
  batch: string;
  batch_line?: number;
  batch_line_diff?: number;
  person_count?: number;
  source: string;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function readSchoolsFromExcel(): Promise<string[]> {
  console.log('正在读取Excel文件获取院校列表...');
  const schools = new Set<string>();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);

    for (const year of ['2023', '2024', '2025']) {
      try {
        const worksheet = workbook.getWorksheet(year);
        if (!worksheet) continue;

        let nameColIndex: number | null = null;
        const headerRow = worksheet.getRow(2);

        headerRow.eachCell((cell, colNum) => {
          const val = cell.value?.toString() || '';
          if (val.includes('名称') || val.includes('院校')) {
            nameColIndex = colNum;
          }
        });

        if (!nameColIndex) continue;

        for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
          const row = worksheet.getRow(rowNum);
          const cellVal = row.getCell(nameColIndex).value?.toString() || '';

          if (cellVal && cellVal.length >= 2) {
            let schoolName = cellVal.replace(/\([^)]*\)/g, '').trim();
            schoolName = schoolName.replace(/\d+$/g, '').trim();
            if (schoolName.length >= 2) {
              schools.add(schoolName);
            }
          }
        }
      } catch (e) {
        console.log(`读取${year}年失败:`, (e as Error).message);
      }
    }
  } catch (e) {
    console.log('读取Excel失败:', (e as Error).message);
  }

  const result = Array.from(schools).sort();
  console.log(`共提取 ${result.length} 个院校`);
  return result;
}

async function setupBrowser(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  console.log('正在启动浏览器...');

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--disable-infobars',
    ],
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  return { browser, context, page };
}

async function goToSchoolPage(page: Page, schoolName: string, year: number): Promise<boolean> {
  const params = JSON.stringify({
    province: PROVINCE,
    year: year.toString(),
    batch: BATCH,
    genre: '综合',
  });

  const url = `https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=${encodeURIComponent(schoolName)}&q=${encodeURIComponent(schoolName)}&device=pc&by=tuijian&by2=general_entity_college&params=${encodeURIComponent(params)}&type=luqu`;

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    return true;
  } catch (e) {
    console.log(`访问页面失败: ${schoolName}`, (e as Error).message);
    return false;
  }
}

async function extractFromNetwork(page: Page, schoolName: string, year: number): Promise<MajorScore[]> {
  const results: MajorScore[] = [];

  const responses: any[] = [];

  const responseHandler = (response: any) => {
    const url = response.url();
    if (
      url.includes('score') ||
      url.includes('major') ||
      url.includes('fen_shu') ||
      url.includes('college') ||
      url.includes('luqu')
    ) {
      responses.push({ url, response });
    }
  };

  page.on('response', responseHandler);

  try {
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    for (const { url, response } of responses) {
      try {
        if (response.status() !== 200) continue;
        const contentType = response.headers()['content-type'] || '';
        if (!contentType.includes('json')) continue;

        const body = await response.json();
        const data = extractDataFromApiResponse(body, schoolName, year);
        if (data.length > 0) {
          results.push(...data);
          console.log(`  从API获取到 ${data.length} 条数据`);
        }
      } catch (e) {
      }
    }
  } finally {
    page.off('response', responseHandler);
  }

  return results;
}

function extractDataFromApiResponse(body: any, schoolName: string, year: number): MajorScore[] {
  const results: MajorScore[] = [];

  function processItem(item: any) {
    const majorName =
      item.major_name ||
      item.majorName ||
      item.name ||
      item.major ||
      '';

    if (!majorName) return;

    const record: MajorScore = {
      school_name: schoolName,
      school_code: item.school_code || item.schoolCode || '',
      province: item.province_name || item.province || PROVINCE,
      level: item.school_type || item.level || item.schoolLevel || '',
      major_name: majorName,
      major_group: item.major_group_name || item.majorGroup || item.groupName || '',
      subject_requirement: item.subject_requirement || item.subjectRequirement || item.subject || '',
      year: year,
      min_score: item.min_score ?? item.minScore ?? item.score ?? item.min_score_num ?? null,
      min_rank: item.min_rank ?? item.minRank ?? item.rank ?? null,
      avg_score: item.avg_score ?? item.avgScore ?? null,
      batch: item.batch_name || item.batch || item.batchName || BATCH,
      batch_line: item.batch_line ?? item.batchLine ?? null,
      batch_line_diff: item.batch_line_diff ?? null,
      person_count: item.person_count ?? item.personCount ?? item.plan_num ?? null,
      source: '夸克高考',
    };

    if (typeof record.min_score === 'string') {
      record.min_score = parseInt(record.min_score) || null;
    }
    if (typeof record.min_rank === 'string') {
      record.min_rank = parseInt(record.min_rank) || null;
    }
    if (typeof record.avg_score === 'string') {
      record.avg_score = parseInt(record.avg_score) || null;
    }

    results.push(record);
  }

  function traverse(obj: any) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item));
      return;
    }

    if (obj.major_name || obj.majorName || (obj.name && (obj.min_score || obj.minScore))) {
      processItem(obj);
    }

    if (obj.list && Array.isArray(obj.list)) {
      obj.list.forEach(item => traverse(item));
    }

    if (obj.data) {
      traverse(obj.data);
    }

    if (obj.result) {
      traverse(obj.result);
    }

    Object.values(obj).forEach(val => {
      if (val && typeof val === 'object') {
        traverse(val);
      }
    });
  }

  traverse(body);

  return results;
}

async function extractFromDOM(page: Page, schoolName: string, year: number): Promise<MajorScore[]> {
  return await page.evaluate(({ schoolName, year, province, batch }) => {
    const results: any[] = [];

    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) return;

      const headers: string[] = [];
      rows[0].querySelectorAll('th, td').forEach(cell => {
        headers.push((cell.textContent || '').trim());
      });

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length < 2) continue;

        const record: any = {
          school_name: schoolName,
          province,
          year,
          batch,
          source: '夸克高考',
        };

        cells.forEach((cell, idx) => {
          const header = headers[idx] || `col${idx}`;
          const value = (cell.textContent || '').trim();

          if (header.includes('专业') && !header.includes('组')) {
            record.major_name = value;
          } else if (header.includes('专业组') || header.includes('组名')) {
            record.major_group = value;
          } else if (header.includes('最低分') || (header.includes('分') && !header.includes('位次') && !header.includes('排名') && !header.includes('差'))) {
            const num = parseInt(value);
            if (!isNaN(num)) record.min_score = num;
          } else if (header.includes('位次') || header.includes('排名')) {
            const num = parseInt(value);
            if (!isNaN(num)) record.min_rank = num;
          } else if (header.includes('平均分') || header.includes('均分')) {
            const num = parseInt(value);
            if (!isNaN(num)) record.avg_score = num;
          } else if (header.includes('科目') || header.includes('选科') || header.includes('要求')) {
            record.subject_requirement = value;
          } else if (header.includes('人数') || header.includes('计划')) {
            const num = parseInt(value);
            if (!isNaN(num)) record.person_count = num;
          }
        });

        if (record.major_name && record.min_score) {
          results.push(record);
        }
      }
    });

    if (results.length === 0) {
      const cards = document.querySelectorAll('[class*="major"], [class*="专业"], [class*="score-item"], [class*="list-item"]');
      cards.forEach(card => {
        const text = card.textContent || '';
        const majorMatch = text.match(/([^\s\d]{2,}(?:专业|学|工程|技术|管理|经济|法学|文学|理学|工学|医学|农学|军事|艺术|教育|历史|哲学)[^\s]*)/);
        const scoreMatch = text.match(/(\d{2,3})分/);

        if (scoreMatch) {
          results.push({
            school_name: schoolName,
            major_name: majorMatch ? majorMatch[0] : '',
            min_score: parseInt(scoreMatch[1]),
            province,
            year,
            batch,
            source: '夸克高考',
          });
        }
      });
    }

    return results;
  }, { schoolName, year, province: PROVINCE, batch: BATCH });
}

async function saveToSupabase(records: MajorScore[]): Promise<number> {
  if (records.length === 0) return 0;

  try {
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from('major_scores').insert(batch);
      if (error) {
        console.log('  插入Supabase失败:', error.message);
        break;
      }
      inserted += batch.length;
    }

    return inserted;
  } catch (e) {
    console.log('保存到Supabase失败:', (e as Error).message);
    return 0;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('夸克高考专业分数线自动抓取工具');
  console.log('='.repeat(70));

  ensureDir(OUTPUT_DIR);

  const schools = await readSchoolsFromExcel();
  if (schools.length === 0) {
    console.log('未找到院校数据，退出');
    return;
  }

  const { browser, context, page } = await setupBrowser();

  const allRecords: MajorScore[] = [];
  let successCount = 0;
  let failCount = 0;

  try {
    const testSchool = schools[0];
    console.log(`\n测试院校: ${testSchool}`);

    for (const year of YEARS) {
      console.log(`\n  --- ${year}年 ---`);

      const success = await goToSchoolPage(page, testSchool, year);
      if (!success) {
        console.log('  页面加载失败');
        continue;
      }

      let records: MajorScore[] = [];

      try {
        records = await extractFromNetwork(page, testSchool, year);
      } catch (e) {
        console.log('  网络提取失败，尝试DOM提取:', (e as Error).message);
      }

      if (records.length === 0) {
        try {
          records = await extractFromDOM(page, testSchool, year);
          console.log(`  从DOM提取到 ${records.length} 条数据`);
        } catch (e) {
          console.log('  DOM提取失败:', (e as Error).message);
        }
      }

      if (records.length > 0) {
        allRecords.push(...records);
        successCount++;
      } else {
        failCount++;
      }

      const yearFile = path.join(OUTPUT_DIR, `major_scores_${year}.json`);
      fs.writeFileSync(yearFile, JSON.stringify(records, null, 2), 'utf-8');
      console.log(`  已保存到: ${yearFile}`);

      await page.waitForTimeout(1000);
    }

    const allFile = path.join(OUTPUT_DIR, 'major_scores_all.json');
    fs.writeFileSync(allFile, JSON.stringify(allRecords, null, 2), 'utf-8');

    const screenshotFile = path.join(OUTPUT_DIR, 'screenshot_test.png');
    await page.screenshot({ path: screenshotFile, fullPage: true });

    console.log('\n' + '='.repeat(70));
    console.log('测试抓取完成！');
    console.log(`共获取 ${allRecords.length} 条专业分数线数据`);
    console.log(`成功: ${successCount} 年 | 失败: ${failCount} 年`);
    console.log(`数据已保存到: ${allFile}`);
    console.log('='.repeat(70));

    console.log('\n如果测试成功，可以继续抓取所有院校数据。');
    console.log('是否继续批量抓取所有院校？(请手动修改脚本中的 BATCH_SCRAPE = true)');

  } catch (e) {
    console.error('抓取出错:', e);
  } finally {
    console.log('\n30秒后关闭浏览器...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

main().catch(console.error);
