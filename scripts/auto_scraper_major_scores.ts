/**
 * 夸克高考专业分数线采集脚本 - 优化版
 * 支持连接到已有浏览器采集数据
 */

import { chromium } from 'playwright';
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Excel文件路径
const EXCEL_FILE = 'C:\\Users\\lhp\\Desktop\\2023-2025年海南高考本科投档分数线.xlsx';
// 输出目录
const OUTPUT_DIR = 'C:\\Users\\lhp\\Downloads\\major_scores';

// 夸克志愿网站URL
const BASE_URL = 'https://www.quark.cn/s/1Hs4KZr0238skIEUWw';

// 等待时间配置
const WAIT_CONFIG = {
  pageLoad: 3000,
  yearSwitch: 3000,
  dataLoad: 2000,
  expandAll: 1000
};

interface SchoolData {
  school_name: string;
  year: number;
  major_name: string;
  major_group: string;
  min_score: number;
  min_rank: number;
  person_count: number;
  batch: string;
  major_description: string;
  subject_requirement: string;
  province: string;
}

/**
 * 读取Excel文件获取院校名称列表
 */
function readSchoolsFromExcel(): string[] {
  console.log('📖 读取Excel文件...');
  try {
    // 兼容多种导入方式
    const readFile = XLSX.readFile || (XLSX as any).default?.readFile;
    if (!readFile) {
      console.log('❌ XLSX.readFile 不可用');
      return [];
    }
    
    const workbook = readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

    const headerRow = rawData[0];
    let schoolNameColIndex = -1;

    for (let i = 0; i < headerRow.length; i++) {
      const cell = headerRow[i];
      if (cell && (cell.includes('院校专业组名称') || cell.includes('院校名称') || cell.includes('学校名称'))) {
        schoolNameColIndex = i;
        break;
      }
    }

    if (schoolNameColIndex === -1) {
      console.log('❌ 未找到院校专业组名称列');
      return [];
    }

    const schoolNameToDisplay = new Map<string, string>();
    const schools = new Set<string>();

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length <= schoolNameColIndex) continue;

      const rawSchoolName = row[schoolNameColIndex];
      if (!rawSchoolName || typeof rawSchoolName !== 'string') continue;

      const displayName = rawSchoolName.replace(/[（(].*?[）)]/g, '').trim();
      const searchName = rawSchoolName.trim();

      if (displayName && searchName) {
        schools.add(searchName);
        schoolNameToDisplay.set(searchName, displayName);
      }
    }

    const schoolList = Array.from(schools);
    console.log(`✅ 共找到 ${schoolList.length} 所院校`);
    (globalThis as any).schoolNameMap = schoolNameToDisplay;

    return schoolList;
  } catch (e) {
    console.log(`❌ 读取Excel失败: ${e}`);
    return [];
  }
}

/**
 * 展开专业说明
 */
async function expandAllDescriptions(page: any) {
  try {
    const spans = await page.$$('.content-List-li span');
    for (const span of spans) {
      const text = await span.textContent();
      if (text && text.trim() === '▼') {
        await span.click().catch(() => {});
      }
    }
  } catch (e) {
    // 忽略
  }
  await page.waitForTimeout(500);
}

/**
 * 提取专业说明
 */
function extractDesc(fullText: string): string {
  let start = fullText.indexOf('(包含专业');
  if (start === -1) start = fullText.indexOf('（包含专业');
  if (start === -1) return '';
  
  let depth = 0;
  let end = -1;
  for (let i = start; i < fullText.length; i++) {
    if (fullText[i] === '(' || fullText[i] === '（') depth++;
    if (fullText[i] === ')' || fullText[i] === '）') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  
  if (end === -1) end = fullText.indexOf('选科要求');
  if (end === -1) end = fullText.length;
  
  let desc = fullText.substring(start, end + 1).trim();
  desc = desc.replace(/^[（(]包含专业[:：]/, '').replace(/[）)]$/, '');
  return desc;
}

/**
 * 提取单年数据
 */
async function extractYearData(page: any, schoolName: string, year: number): Promise<SchoolData[]> {
  await page.waitForTimeout(WAIT_CONFIG.dataLoad);
  
  const items = await page.$$('.content-List-li');
  console.log(`   找到 ${items.length} 个列表项`);
  
  const allData: SchoolData[] = [];
  let lastGroup = '';
  let lastReq = '';
  const seen = new Set<string>();
  
  for (const item of items) {
    const majorEl = await item.$('.content-List-major');
    if (!majorEl) continue;
    
    const name = (await majorEl.textContent())?.trim() || '';
    if (name.length < 2 || name === '普通类') continue;
    
    const sEl = await item.$('.content-List-low_score');
    const rEl = await item.$('.content-List-low_rank');
    const cEl = await item.$('.content-List-luqurenshu');
    const bEl = await item.$('.qk-margin-top-s');
    const tEl = await item.$('.content-List-subTitle');
    const fullText = await item.textContent() || '';
    
    const scoreText = sEl ? await sEl.textContent() : null;
    const rankText = rEl ? await rEl.textContent() : null;
    const cntText = cEl ? await cEl.textContent() : null;
    const batch = bEl ? (await bEl.textContent())?.trim() || '' : '';
    const subTitle = tEl ? (await tEl.textContent())?.trim() || '' : null;
    
    const score = scoreText ? parseInt(scoreText.match(/\d{2,3}/)?.[0] || '0') : null;
    const rank = rankText ? parseInt(rankText.match(/\d{1,7}/)?.[0] || '0') : null;
    const cnt = cntText ? parseInt(cntText.match(/\d+/)?.[0] || '0') : null;
    
    if (score && (score < 100 || score > 900)) continue;
    
    let group = '';
    let req = '';
    
    if (subTitle) {
      if (subTitle.indexOf('专业组') >= 0) {
        const mgMatch = subTitle.match(/专业组[（(](\d+)[）)]/);
        if (mgMatch) group = '专业组（' + mgMatch[1] + '）';
      }
      const dashIdx = subTitle.indexOf(' - ');
      if (dashIdx >= 0) {
        req = subTitle.substring(dashIdx + 3).trim();
      }
    }
    
    if (!group) group = lastGroup;
    if (!req) req = lastReq;
    if (group.indexOf('专业组') >= 0) lastGroup = group;
    if (req) lastReq = req;
    
    const desc = extractDesc(fullText);
    const key = name + '|' + req + '|' + desc;
    
    if (seen.has(key)) continue;
    seen.add(key);
    
    allData.push({
      school_name: schoolName,
      year: year,
      major_name: name,
      major_group: group,
      min_score: score,
      min_rank: rank,
      person_count: cnt,
      batch: batch,
      major_description: desc,
      subject_requirement: req,
      province: '海南'
    });
  }
  
  return allData;
}

/**
 * 切换年份 - 使用JavaScript点击
 */
async function switchYear(page: any, targetYear: number): Promise<boolean> {
  console.log(`   切换到${targetYear}年...`);
  
  try {
    await page.waitForTimeout(1000);
    
    // 1. 先确保在专业分数线tab上
    console.log('   检查专业分数线tab...');
    const tabs = await page.$$('.qk-tabs-tab');
    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text && text.includes('专业分数线')) {
        // 使用JavaScript点击确保成功
        await page.evaluate((el) => el.click(), tab);
        console.log('   已点击专业分数线tab');
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // 2. 查找年份下拉按钮
    const yearDropdowns = await page.$$('button.select-tabs-tab-nianfen, button[class*="nianfen"], div[class*="year-"]');
    console.log(`   找到 ${yearDropdowns.length} 个年份下拉`);
    
    let dropdownBtn: any = null;
    
    // 3. 找到当前显示年份的按钮（必须是可见的）
    for (const btn of yearDropdowns) {
      try {
        const isVisible = await btn.isVisible();
        const text = (await btn.textContent())?.trim() || '';
        
        if (isVisible && /^202[0-9]$/.test(text)) {
          dropdownBtn = btn;
          console.log(`   找到当前年份按钮: ${text}`);
          break;
        }
      } catch (e) {
        // 忽略
      }
    }
    
    if (!dropdownBtn) {
      console.log(`   ❌ 未找到可见的年份按钮`);
      return false;
    }
    
    // 4. 使用JavaScript点击打开下拉
    console.log(`   JS点击下拉...`);
    await page.evaluate((el) => el.click(), dropdownBtn);
    await page.waitForTimeout(2000);
    
    // 5. 查找并点击目标年份选项
    const options = await page.$$('[class*="option"], [class*="item"], li, .qk-scroll-item');
    console.log(`   找到 ${options.length} 个选项`);
    
    for (const opt of options) {
      try {
        const text = (await opt.textContent())?.trim() || '';
        if (text === String(targetYear)) {
          console.log(`   ✅ JS点击选项: ${text}`);
          await page.evaluate((el) => el.click(), opt);
          await page.waitForTimeout(3000);
          return true;
        }
      } catch (e) {
        // 忽略
      }
    }
    
    console.log(`   ❌ 未找到${targetYear}年选项`);
    await page.keyboard.press('Escape');
    return false;
    
  } catch (e) {
    console.log(`   ❌ 切换年份失败: ${e}`);
    return false;
  }
}

/**
 * 采集院校数据
 */
async function scrapeSchool(page: any, searchName: string): Promise<Map<number, SchoolData[]>> {
  const dataByYear = new Map<number, SchoolData[]>();
  
  const schoolNameMap: Map<string, string> = (globalThis as any).schoolNameMap || new Map();
  const displayName = schoolNameMap.get(searchName) || searchName;
  
  console.log(`\n🔍 采集: ${displayName}`);
  
  try {
    // 输入搜索
    const searchInput = await page.$('input[type="text"], input[placeholder*="搜索"]');
    if (searchInput) {
      await searchInput.click();
      await page.keyboard.type(searchName, { delay: 50 });
      await page.waitForTimeout(500);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }
    
    // 点击专业分数线Tab
    const tabs = await page.$$('.qk-tabs-tab');
    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text && text.includes('专业分数线')) {
        await tab.click();
        console.log('   已点击专业分数线tab');
        break;
      }
    }
    await page.waitForTimeout(3000);
    
    // 采集三年数据
    for (const year of [2023, 2024, 2025]) {
      try {
        const success = await switchYear(page, year);
        if (!success) {
          console.log(`   ⚠️ ${year}年切换失败`);
          continue;
        }
        
        await expandAllDescriptions(page);
        const data = await extractYearData(page, displayName, year);
        dataByYear.set(year, data);
        console.log(`   ✅ ${year}年: ${data.length}条`);
        
      } catch (e) {
        console.log(`   ❌ ${year}年出错: ${e}`);
        continue;
      }
    }
    
  } catch (e) {
    console.log(`   ❌ 采集失败: ${e}`);
  }
  
  return dataByYear;
}

/**
 * 保存数据
 */
function saveData(dataByYear: Map<number, SchoolData[]>, searchName: string) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const schoolNameMap: Map<string, string> = (globalThis as any).schoolNameMap || new Map();
  const displayName = schoolNameMap.get(searchName) || searchName;
  
  let total = 0;
  for (const [year, data] of dataByYear) {
    if (data.length === 0) continue;
    
    const fileName = path.join(OUTPUT_DIR, `${displayName}_${year}_专业分数线.json`);
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
    console.log(`   💾 ${path.basename(fileName)} (${data.length}条)`);
    total += data.length;
  }
  
  console.log(`   📊 共 ${total} 条`);
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('夸克高考专业分数线采集');
  console.log('========================================\n');
  
  // 读取院校列表
  const schools = readSchoolsFromExcel();
  if (schools.length === 0) {
    console.log('❌ 没有院校数据，退出');
    return;
  }
  
  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log('\n请确保:');
  console.log('1. 夸克高考网站已打开');
  console.log('2. 已登录夸克账号');
  console.log('');
  
  let context: any;
  let page: any;
  
  const mode = (globalThis as any).mode || '2';
  
  try {
    // 使用 launchPersistentContext 启动有用户数据的浏览器
    console.log('🚀 启动浏览器...');
    
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const debugProfileDir = 'C:\\Users\\lhp\\AppData\\Local\\Microsoft\\Edge\\DebugProfile';
    
    const result = await chromium.launchPersistentContext(debugProfileDir, {
      executablePath: edgePath,
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    // 获取 page
    const pages = result._pages;
    if (pages && pages.length > 0) {
      page = pages[0];
    } else {
      page = await result.newPage();
    }
    context = result;
    
    console.log('   ✅ 浏览器启动成功');
    
    console.log('🌐 等待页面...');
    await page.waitForTimeout(2000);
    
    console.log('\n开始采集...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    // 遍历院校 - 先测试前10所
    for (let i = 0; i < Math.min(schools.length, 10); i++) {
      const searchName = schools[i];
      
      try {
        const dataByYear = await scrapeSchool(page, searchName);
        const total = Array.from(dataByYear.values()).reduce((sum, d) => sum + d.length, 0);
        
        if (total > 0) {
          saveData(dataByYear, searchName);
          successCount++;
        } else {
          failCount++;
        }
      } catch (e) {
        console.log(`❌ ${searchName} 处理失败: ${e}`);
        failCount++;
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log('\n========================================');
    console.log(`完成！成功: ${successCount}, 失败: ${failCount}`);
    console.log(`保存目录: ${OUTPUT_DIR}`);
    console.log('========================================');
    
  } catch (e) {
    console.log(`❌ 执行失败: ${e}`);
    console.log('\n请确保夸克高考网站已打开并登录');
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    console.log('   浏览器已关闭');
  }
}

main().catch(console.error);
