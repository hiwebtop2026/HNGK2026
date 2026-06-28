import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'data');
const EXCEL_FILE = 'C:\\Users\\lhp\\Desktop\\2023-2025年海南高考本科投档分数线.xlsx';

const SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o';

const YEARS = [2025, 2024, 2023];
const PROVINCE = '海南';
const BATCH = '本科批';
const GENRE = '综合';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function readSchoolsFromExcel() {
  console.log('正在读取Excel文件获取院校列表...');
  const schools = new Set();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_FILE);

    for (const year of ['2025', '2024', '2023']) {
      try {
        const worksheet = workbook.getWorksheet(year);
        if (!worksheet) continue;

        let nameColIndex = null;
        let headerRowIdx = 2;

        for (let rowNum = 1; rowNum <= 5; rowNum++) {
          const row = worksheet.getRow(rowNum);
          row.eachCell((cell, colNum) => {
            const val = cell.value?.toString() || '';
            if ((val.includes('院校') && val.includes('名称')) || val === '院校专业组名称') {
              nameColIndex = colNum;
              headerRowIdx = rowNum;
            }
          });
          if (nameColIndex) break;
        }

        if (!nameColIndex) continue;

        let count = 0;
        for (let rowNum = headerRowIdx + 1; rowNum <= worksheet.rowCount; rowNum++) {
          const row = worksheet.getRow(rowNum);
          const cellVal = row.getCell(nameColIndex).value?.toString() || '';

          if (!cellVal || cellVal.length < 2) continue;
          if (cellVal.includes('科目') && cellVal.includes('要求')) continue;
          if (['说明', '注', '备注'].includes(cellVal.trim())) continue;

          let schoolName = cellVal.replace(/\([^)]*\)/g, '').trim();
          schoolName = schoolName.replace(/\d+$/g, '').trim();

          if (schoolName.length >= 2 && !/^\d/.test(schoolName)) {
            schools.add(schoolName);
            count++;
          }
        }
        console.log(`  ${year}年: ${count}个`);
      } catch (e) {
        console.log(`读取${year}年失败:`, e.message);
      }
    }
  } catch (e) {
    console.log('读取Excel失败:', e.message);
  }

  const result = Array.from(schools).sort();
  console.log(`共提取 ${result.length} 个唯一院校`);
  return result;
}

async function setupBrowser() {
  console.log('正在启动Edge浏览器...');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--disable-infobars',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  return { browser, context, page };
}

function buildSchoolUrl(schoolName, year) {
  const params = JSON.stringify({
    province: PROVINCE,
    year: year.toString(),
    batch: BATCH,
    genre: GENRE,
  });

  return (
    `https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian` +
    `&university_name=${encodeURIComponent(schoolName)}` +
    `&q=${encodeURIComponent(schoolName)}` +
    `&device=pc` +
    `&bar=pure` +
    `&by=tuijian` +
    `&by2=general_entity_college` +
    `&params=${encodeURIComponent(params)}` +
    `&type=luqu` +
    `&uc_param_str=ntnwvepffrbiprsvchutosstxskp`
  );
}

async function switchToMajorTab(page) {
  console.log('  切换到专业分数线Tab...');
  
  const result = await page.evaluate(() => {
    const tabs = document.querySelectorAll('[class*="tab"], [role="tab"]');
    for (const tab of tabs) {
      const text = (tab.textContent || '').trim();
      if (text.includes('专业分数线') || text === '专业分数线') {
        tab.click();
        return { clicked: true, text };
      }
    }
    
    const allClickable = document.querySelectorAll('div, span, button, a');
    for (const el of allClickable) {
      const text = (el.textContent || '').trim();
      if (text === '专业分数线' || (text.length <= 10 && text.includes('专业') && text.includes('分数线'))) {
        const style = window.getComputedStyle(el);
        if (style.cursor === 'pointer' || el.onclick || el.closest('[role="tab"]')) {
          el.click();
          return { clicked: true, text };
        }
      }
    }
    
    return { clicked: false };
  });

  if (result.clicked) {
    console.log(`    已切换到: ${result.text}`);
    await page.waitForTimeout(3000);
    return true;
  }
  
  console.log('    未找到专业分数线Tab，尝试通过URL直接访问...');
  return false;
}

async function clickViewAll(page) {
  console.log('  点击查看全部...');
  
  const result = await page.evaluate(() => {
    const allBtns = document.querySelectorAll('button, a, div, span');
    for (const btn of allBtns) {
      const text = (btn.textContent || '').trim();
      if (text === '查看全部' || text === '全部') {
        const style = window.getComputedStyle(btn);
        if (style.cursor === 'pointer' || btn.onclick || btn.tagName === 'BUTTON' || btn.tagName === 'A') {
          btn.click();
          return { clicked: true, text };
        }
      }
    }
    
    const moreBtns = document.querySelectorAll('[class*="more"], [class*="all"], [class*="More"], [class*="All"]');
    for (const btn of moreBtns) {
      const text = (btn.textContent || '').trim();
      if (text.includes('全部') || text.includes('more')) {
        btn.click();
        return { clicked: true, text: text || 'more button' };
      }
    }
    
    return { clicked: false };
  });

  if (result.clicked) {
    console.log(`    点击了: ${result.text}`);
    await page.waitForTimeout(3000);
    return true;
  }
  
  console.log('    未找到查看全部按钮');
  return false;
}

async function switchYear(page, year) {
  console.log(`  切换到${year}年...`);
  
  const yearStr = year.toString();
  
  const result = await page.evaluate((yearStr) => {
    const yearBtns = document.querySelectorAll('[class*="year"], [class*="nianfen"], [class*="Year"], [class*="Nianfen"]');
    for (const btn of yearBtns) {
      const text = (btn.textContent || '').trim();
      if (text === yearStr || text.includes(yearStr)) {
        btn.click();
        return { switched: true, text };
      }
    }
    
    const allBtns = document.querySelectorAll('button, div[role="button"], span, a');
    for (const btn of allBtns) {
      const text = (btn.textContent || '').trim();
      if (text === yearStr || (text.length <= 10 && /^\d{4}$/.test(text) && text === yearStr)) {
        const style = window.getComputedStyle(btn);
        if (style.cursor === 'pointer' || btn.onclick || btn.tagName === 'BUTTON' || btn.tagName === 'A') {
          btn.click();
          return { switched: true, text };
        }
      }
    }
    
    return { switched: false };
  }, yearStr);

  if (result.switched) {
    console.log(`    已切换到: ${result.text}`);
    await page.waitForTimeout(3000);
    return true;
  }
  
  console.log('    未找到年份切换按钮，将通过URL直接访问');
  return false;
}

async function extractMajorScores(page, schoolName, year) {
  console.log('  提取专业分数线数据...');
  
  const networkData = await extractFromNetwork(page, schoolName, year);
  if (networkData.length > 0) {
    console.log(`    从网络请求获取到 ${networkData.length} 条数据`);
    return networkData;
  }
  
  const domData = await extractFromDOM(page, schoolName, year);
  if (domData.length > 0) {
    console.log(`    从DOM提取到 ${domData.length} 条数据`);
    return domData;
  }
  
  console.log('    未提取到数据');
  return [];
}

async function extractFromNetwork(page, schoolName, year) {
  const results = [];
  const responses = [];

  const responseHandler = (response) => {
    const url = response.url();
    if (
      url.includes('score') ||
      url.includes('major') ||
      url.includes('fen_shu') ||
      url.includes('luqu') ||
      url.includes('college') ||
      url.includes('zhuanye')
    ) {
      responses.push({ url, response });
    }
  };

  page.on('response', responseHandler);

  try {
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
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
        }
      } catch (e) {
      }
    }
  } finally {
    page.off('response', responseHandler);
  }

  return results;
}

function extractDataFromApiResponse(body, schoolName, year) {
  const results = [];

  function processItem(item) {
    const majorName =
      item.major_name ||
      item.majorName ||
      item.name ||
      item.major ||
      item.major_title ||
      '';

    if (!majorName) return;

    const record = {
      school_name: schoolName,
      school_code: item.school_code || item.schoolCode || '',
      province: item.province_name || item.province || PROVINCE,
      level: item.school_type || item.level || item.schoolLevel || '',
      major_name: majorName,
      major_group: item.major_group_name || item.majorGroup || item.groupName || item.major_group || '',
      subject_requirement: item.subject_requirement || item.subjectRequirement || item.subject || item.subject_req || '',
      year: year,
      min_score: item.min_score ?? item.minScore ?? item.score ?? item.min_score_num ?? null,
      min_rank: item.min_rank ?? item.minRank ?? item.rank ?? item.min_rank_num ?? null,
      avg_score: item.avg_score ?? item.avgScore ?? null,
      batch: item.batch_name || item.batch || item.batchName || BATCH,
      batch_line: item.batch_line ?? item.batchLine ?? null,
      batch_line_diff: item.batch_line_diff ?? item.score_diff ?? null,
      person_count: item.person_count ?? item.personCount ?? item.plan_num ?? item.plan_count ?? null,
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
    if (typeof record.person_count === 'string') {
      record.person_count = parseInt(record.person_count) || null;
    }

    if (record.min_score !== null || record.min_rank !== null) {
      results.push(record);
    }
  }

  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item));
      return;
    }

    if (obj.major_name || obj.majorName || (obj.name && (obj.min_score || obj.minScore || obj.min_rank))) {
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
    if (obj.items && Array.isArray(obj.items)) {
      obj.items.forEach(item => traverse(item));
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

async function extractFromDOM(page, schoolName, year) {
  return await page.evaluate(({ schoolName, year, province, batch }) => {
    const results = [];

    const listItems = document.querySelectorAll('[class*="list-item"], [class*="List-item"], [class*="item"]');
    
    listItems.forEach(item => {
      const text = item.textContent || '';
      if (text.length < 5 || text.length > 300) return;

      const majorMatch = text.match(/([^\s\d\n]{2,}(?:专业|学|工程|技术|管理|经济|法学|文学|理学|工学|医学|农学|军事|艺术|教育|历史|哲学)[^\s\n]*)/);
      const scoreMatch = text.match(/(\d{2,3})\s*分/);
      const rankMatch = text.match(/(\d{3,6})\s*位次/);
      const countMatch = text.match(/(\d+)\s*人/);

      if (scoreMatch && majorMatch) {
        const record = {
          school_name: schoolName,
          major_name: majorMatch[1],
          min_score: parseInt(scoreMatch[1]),
          province,
          year,
          batch,
          source: '夸克高考',
        };

        if (rankMatch) {
          record.min_rank = parseInt(rankMatch[1]);
        }
        if (countMatch) {
          record.person_count = parseInt(countMatch[1]);
        }

        results.push(record);
      }
    });

    const uniqueResults = [];
    const seen = new Set();
    for (const r of results) {
      const key = r.major_name + '_' + r.min_score;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(r);
      }
    }

    return uniqueResults;
  }, { schoolName, year, province: PROVINCE, batch: BATCH });
}

async function saveToSupabase(records) {
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
    console.log('保存到Supabase失败:', e.message);
    return 0;
  }
}

async function scrapeSchool(page, schoolName) {
  console.log(`\n处理院校: ${schoolName}`);
  const allRecords = [];

  for (const year of YEARS) {
    console.log(`\n  === ${year}年 ===`);
    
    const url = buildSchoolUrl(schoolName, year);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (e) {
      console.log(`  页面加载超时: ${e.message}`);
      try {
        await page.waitForTimeout(5000);
      } catch {}
    }

    await page.waitForTimeout(3000);

    const screenshotFile = path.join(OUTPUT_DIR, `${schoolName}_${year}.png`);
    try {
      await page.screenshot({ path: screenshotFile, fullPage: true });
    } catch (e) {
      console.log(`  截图失败: ${e.message}`);
    }

    await switchToMajorTab(page);
    await clickViewAll(page);
    await page.waitForTimeout(2000);

    const records = await extractMajorScores(page, schoolName, year);
    console.log(`  提取到 ${records.length} 条数据`);

    if (records.length > 0) {
      allRecords.push(...records);
      
      console.log('  数据预览:');
      records.slice(0, 3).forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.major_name} - ${r.min_score || '--'}分 - ${r.min_rank || '--'}位次`);
      });
    }

    await page.waitForTimeout(2000);
  }

  return allRecords;
}

async function main() {
  console.log('='.repeat(70));
  console.log('夸克高考专业分数线自动抓取工具 v4 (Playwright + Edge)');
  console.log('='.repeat(70));

  ensureDir(OUTPUT_DIR);

  const schools = await readSchoolsFromExcel();
  if (schools.length === 0) {
    console.log('未找到院校数据，退出');
    return;
  }

  const { browser, context, page } = await setupBrowser();

  const allRecords = [];
  let successCount = 0;
  let failCount = 0;

  try {
    const testSchool = '华东理工大学';
    console.log(`\n测试院校: ${testSchool}`);

    const records = await scrapeSchool(page, testSchool);
    
    if (records.length > 0) {
      allRecords.push(...records);
      successCount++;
      
      const testFile = path.join(OUTPUT_DIR, 'test_major_scores.json');
      fs.writeFileSync(testFile, JSON.stringify(records, null, 2), 'utf-8');
      console.log(`\n测试数据已保存到: ${testFile}`);
      
      console.log('\n是否继续批量抓取所有院校？');
      console.log('如需批量抓取，请修改脚本中的 BATCH_SCRAPE = true');
    } else {
      failCount++;
      console.log('\n测试抓取失败，请检查页面结构');
    }

    const allFile = path.join(OUTPUT_DIR, 'major_scores_all.json');
    fs.writeFileSync(allFile, JSON.stringify(allRecords, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(70));
    console.log('测试抓取完成！');
    console.log(`共获取 ${allRecords.length} 条专业分数线数据`);
    console.log(`成功: ${successCount} | 失败: ${failCount}`);
    console.log(`数据已保存到: ${allFile}`);
    console.log('='.repeat(70));

    console.log('\n浏览器将在60秒后自动关闭...');
    await page.waitForTimeout(60000);

  } catch (e) {
    console.error('抓取出错:', e);
    await page.waitForTimeout(30000);
  } finally {
    try {
      await browser.close();
    } catch {}
    console.log('浏览器已关闭');
  }
}

main().catch(console.error);
