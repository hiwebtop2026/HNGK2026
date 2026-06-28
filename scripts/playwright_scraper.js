import { chromium, Browser, Page, BrowserContext } from 'playwright';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const OUTPUT_DIR = path.join(process.cwd(), 'data');
const EXCEL_FILE = 'C:\\Users\\lhp\\Desktop\\2023-2025年海南高考本科投档分数线.xlsx';
const YEARS = [2023, 2024, 2025];
const PROVINCE = '海南';
const BATCH = '本科批';

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

        let nameColumn: number | null = null;
        const headerRow = worksheet.getRow(2);

        headerRow.eachCell((cell, colNumber) => {
          const value = cell.value?.toString() || '';
          if (value.includes('名称') || value.includes('name')) {
            nameColumn = colNumber;
          }
        });

        if (!nameColumn) continue;

        for (let rowNum = 3; rowNum <= worksheet.rowCount; rowNum++) {
          const row = worksheet.getRow(rowNum);
          const cellValue = row.getCell(nameColumn).value?.toString() || '';

          if (cellValue && cellValue.length >= 2) {
            const schoolName = cellValue.replace(/\([^)]*\)/g, '').replace(/\d+$/g, '').trim();
            if (schoolName.length >= 2) {
              schools.add(schoolName);
            }
          }
        }
      } catch (e) {
        console.log(`读取${year}年失败:`, e);
      }
    }
  } catch (e) {
    console.log('读取Excel文件失败:', e);
  }

  const result = Array.from(schools).sort();
  console.log(`共提取到 ${result.length} 个唯一院校名称`);

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
    ],
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return { browser, context, page };
}

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForTimeout(2000);
}

async function searchSchool(page: Page, schoolName: string): Promise<boolean> {
  console.log(`正在搜索: ${schoolName}`);

  try {
    const searchUrl = `https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=${encodeURIComponent(schoolName)}&params=${encodeURIComponent(JSON.stringify({
      province: PROVINCE,
      year: '2025',
      batch: BATCH
    }))}&type=luqu`;

    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForPageReady(page);

    const title = await page.title();
    return title.includes(schoolName) || title.includes('高考');
  } catch (e) {
    console.log(`搜索失败: ${schoolName}`, e);
    return false;
  }
}

async function switchProvince(page: Page, province: string): Promise<boolean> {
  console.log(`正在切换地区为: ${province}`);

  try {
    const provinceSelectors = [
      'text=' + province,
      '.province-selector',
      'select[name="province"]',
      '[class*="province"]',
      '[class*="地区"]',
    ];

    for (const selector of provinceSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          await elements[0].click();
          await page.waitForTimeout(1000);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  } catch (e) {
    console.log('切换地区失败:', e);
    return false;
  }
}

async function switchYear(page: Page, year: number): Promise<boolean> {
  console.log(`正在切换年份为: ${year}`);

  try {
    const yearStr = year.toString();

    const yearElements = await page.evaluate((year) => {
      const allElements = document.querySelectorAll('*');
      const found: string[] = [];

      for (const el of allElements) {
        const text = (el.textContent || '').trim();
        if (text === year) {
          const style = window.getComputedStyle(el);
          if (style.cursor === 'pointer' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'OPTION') {
            found.push(text);
          }
        }
      }

      return found;
    }, yearStr);

    if (yearElements.length > 0) {
      const yearBtn = page.getByText(yearStr, { exact: true }).first();
      if (yearBtn) {
        await yearBtn.click({ timeout: 3000 });
        await page.waitForTimeout(2000);
        return true;
      }
    }

    const selectors = [
      `text=${yearStr}`,
      '.year-selector',
      'select[name="year"]',
      '[class*="year"]',
      '[class*="年份"]',
    ];

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          for (const el of elements) {
            const text = await el.textContent();
            if (text?.includes(yearStr)) {
              await el.click();
              await page.waitForTimeout(1000);
              return true;
            }
          }
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  } catch (e) {
    console.log('切换年份失败:', e);
    return false;
  }
}

async function clickShowAll(page: Page): Promise<boolean> {
  console.log('正在点击"查看全部"...');

  try {
    const showAllTexts = ['查看全部', '全部', '更多', '展开全部', '显示全部'];

    for (const text of showAllTexts) {
      try {
        const btn = page.getByText(text, { exact: false }).first();
        if (btn && await btn.isVisible({ timeout: 2000 })) {
          await btn.click();
          await page.waitForTimeout(2000);
          console.log(`点击了: ${text}`);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    const selectors = [
      '.show-all',
      '.view-all',
      '.more-btn',
      '[class*="全部"]',
      '[class*="全部"]',
    ];

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          await elements[0].click();
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (e) {
        continue;
      }
    }

    return false;
  } catch (e) {
    console.log('点击"查看全部"失败:', e);
    return false;
  }
}

async function extractMajorScores(page: Page, schoolName: string, year: number): Promise<MajorScore[]> {
  console.log(`正在提取${year}年专业分数线数据...`);

  try {
    const data = await page.evaluate(({ schoolName, year, province, batch }) => {
      const results: any[] = [];

      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        const headers: string[] = [];

        if (rows.length > 0) {
          rows[0].querySelectorAll('th, td').forEach(cell => {
            headers.push((cell.textContent || '').trim());
          });
        }

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) continue;

          const rowData: any = {
            school_name: schoolName,
            province: province,
            year: year,
            batch: batch,
            source: '夸克高考',
          };

          cells.forEach((cell, idx) => {
            const header = headers[idx] || `col${idx}`;
            const value = (cell.textContent || '').trim();

            if (header.includes('专业')) {
              rowData.major_name = value;
            } else if (header.includes('专业组') || header.includes('组')) {
              rowData.major_group = value;
            } else if (header.includes('最低分') || (header.includes('分') && !header.includes('位次') && !header.includes('位次'))) {
              const num = parseInt(value);
              if (!isNaN(num)) rowData.min_score = num;
            } else if (header.includes('位次') || header.includes('排名')) {
              const num = parseInt(value);
              if (!isNaN(num)) rowData.min_rank = num;
            } else if (header.includes('平均分') || header.includes('均分')) {
              const num = parseInt(value);
              if (!isNaN(num)) rowData.avg_score = num;
            } else if (header.includes('科目') || header.includes('选科') || header.includes('要求')) {
              rowData.subject_requirement = value;
            } else if (header.includes('人数')) {
              const num = parseInt(value);
              if (!isNaN(num)) rowData.person_count = num;
            }
          });

          if (rowData.major_name) {
            results.push(rowData);
          }
        }
      });

      if (results.length === 0) {
        const items = document.querySelectorAll('[class*="major"], [class*="专业"], [class*="score-item"], [class*="item"]');
        items.forEach(item => {
          const text = item.textContent || '';
          if (text.includes('分') && text.length > 10) {
            const majorMatch = text.match(/([^\s\d]+专业[^\s]*)|([^\s\d]+大学[^\s]*)|([^\s]+学院[^\s]*)/);
            const scoreMatch = text.match(/(\d{2,3})分/);
            const rankMatch = text.match(/(\d+)位次/);

            if (scoreMatch) {
              results.push({
                school_name: schoolName,
                major_name: majorMatch ? majorMatch[0] : '',
                min_score: parseInt(scoreMatch[1]),
                min_rank: rankMatch ? parseInt(rankMatch[1]) : undefined,
                province: province,
                year: year,
                batch: batch,
                source: '夸克高考',
              });
            }
          }
        });
      }

      return results;
    }, { schoolName, year, province: PROVINCE, batch: BATCH });

    console.log(`提取到 ${data.length} 条专业分数线数据`);
    return data as MajorScore[];
  } catch (e) {
    console.log('提取数据失败:', e);
    return [];
  }
}

async function interceptNetworkRequests(page: Page): Promise<any[]> {
  const responses: any[] = [];

  await page.route('**/*', async (route, request) => {
    const url = request.url();
    if (url.includes('score') || url.includes('major') || url.includes('fen_shu') || url.includes('college')) {
      const response = await route.fetch();
      if (response && response.status() === 200) {
        try {
          const body = await response.json();
          responses.push({ url, data: body });
        } catch (e) {
        }
      }
    }
    await route.continue();
  });

  return responses;
}

async function main() {
  console.log('='.repeat(70));
  console.log('夸克高考专业分数线自动抓取工具');
  console.log('='.repeat(70));

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const schools = await readSchoolsFromExcel();
  if (schools.length === 0) {
    console.log('未找到院校数据，使用默认院校进行测试');
  }

  const testSchool = schools[0] || '清华大学';
  console.log(`\n测试院校: ${testSchool}`);

  const { browser, context, page } = await setupBrowser();

  try {
    console.log('\n正在访问夸克高考页面...');
    await searchSchool(page, testSchool);
    await page.waitForTimeout(3000);

    const allData: MajorScore[] = [];

    for (const year of YEARS) {
      console.log(`\n--- ${year}年 ---`);
      await switchYear(page, year);
      await clickShowAll(page);
      await page.waitForTimeout(2000);

      const data = await extractMajorScores(page, testSchool, year);
      allData.push(...data);

      const yearDataFile = path.join(OUTPUT_DIR, `major_scores_${year}.json`);
      fs.writeFileSync(yearDataFile, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`已保存到: ${yearDataFile}`);
    }

    const allDataFile = path.join(OUTPUT_DIR, 'major_scores_all.json');
    fs.writeFileSync(allDataFile, JSON.stringify(allData, null, 2), 'utf-8');

    console.log('\n' + '='.repeat(70));
    console.log(`测试完成！共获取到 ${allData.length} 条专业分数线数据`);
    console.log(`数据已保存到: ${allDataFile}`);
    console.log('='.repeat(70));

  } catch (e) {
    console.error('抓取过程出错:', e);
  } finally {
    console.log('\n浏览器将在10秒后关闭...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

main().catch(console.error);
