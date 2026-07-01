/**
 * 夸克高考专业分数线采集脚本 - 简化测试版
 * 逐个切换年份采集数据
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// 配置
const BASE_URL = 'https://www.quark.cn/s/1Hs4KZr0238skIEUWw';
const OUTPUT_DIR = 'C:\\Users\\lhp\\Downloads\\major_scores';

// 等待时间
const WAIT = {
  pageLoad: 3000,
  yearSwitch: 2000,
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
  console.log(`   提取${year}年数据...`);
  
  await page.waitForTimeout(WAIT.dataLoad);
  
  const items = await page.$$('.content-List-li');
  console.log(`   找到 ${items.length} 个列表项`);
  
  if (items.length === 0) {
    // 尝试调试 - 打印页面部分HTML
    const html = await page.evaluate(() => {
      const container = document.querySelector('.content-List');
      return container ? container.innerHTML.substring(0, 500) : '未找到.content-List';
    });
    console.log(`   HTML片段: ${html.substring(0, 200)}...`);
  }
  
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
    
    // 解析专业组和选科要求
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
  
  console.log(`   ✅ 提取到 ${allData.length} 条数据`);
  return allData;
}

/**
 * 切换年份
 */
async function switchYear(page: any, targetYear: number): Promise<boolean> {
  console.log(`   切换到${targetYear}年...`);
  
  try {
    // 查找年份下拉按钮
    const dropdown = await page.$('.select-tabs-tab-nianfen, [class*="year"]');
    if (!dropdown) {
      console.log('   ❌ 未找到年份下拉按钮');
      return false;
    }
    
    await dropdown.click();
    await page.waitForTimeout(WAIT.yearSwitch);
    
    // 等待下拉选项出现
    await page.waitForSelector('[class*="option"], [class*="item"], .qk-select-option', { timeout: 3000 }).catch(() => {});
    
    // 查找年份选项
    const options = await page.$$('[class*="option"], [class*="item"], .qk-select-option, .qk-picker-item');
    console.log(`   找到 ${options.length} 个选项`);
    
    let clicked = false;
    for (const opt of options) {
      const text = (await opt.textContent())?.trim() || '';
      if (text === String(targetYear)) {
        console.log(`   点击 ${text}`);
        await opt.click();
        clicked = true;
        await page.waitForTimeout(WAIT.yearSwitch);
        break;
      }
    }
    
    if (!clicked) {
      console.log(`   ❌ 未找到${targetYear}年选项`);
      // 打印所有选项文本
      for (const opt of options) {
        const t = (await opt.textContent())?.trim() || '';
        console.log(`      选项: ${t}`);
      }
      return false;
    }
    
    return true;
  } catch (e) {
    console.log(`   ❌ 切换年份失败: ${e}`);
    return false;
  }
}

/**
 * 展开专业说明
 */
async function expandAll(page: any) {
  try {
    // 点击所有▼符号
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
 * 采集院校数据
 */
async function scrapeSchool(page: any, schoolName: string): Promise<Map<number, SchoolData[]>> {
  const dataByYear = new Map<number, SchoolData[]>();
  
  console.log(`\n🔍 采集: ${schoolName}`);
  
  try {
    // 点击专业分数线Tab
    const tabs = await page.$$('.qk-tabs-tab');
    for (const tab of tabs) {
      const text = await tab.textContent();
      if (text && text.includes('专业分数线')) {
        console.log('   点击专业分数线tab');
        await tab.click();
        await page.waitForTimeout(WAIT.pageLoad);
        break;
      }
    }
    
    // 采集2023-2025年数据
    for (const year of [2023, 2024, 2025]) {
      const success = await switchYear(page, year);
      if (!success) {
        console.log(`   ⚠️ ${year}年切换失败，跳过`);
        continue;
      }
      
      await expandAll(page);
      const data = await extractYearData(page, schoolName, year);
      dataByYear.set(year, data);
    }
    
  } catch (e) {
    console.log(`   ❌ 采集失败: ${e}`);
  }
  
  return dataByYear;
}

/**
 * 保存数据
 */
function saveData(dataByYear: Map<number, SchoolData[]>, schoolName: string) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  let total = 0;
  for (const [year, data] of dataByYear) {
    if (data.length === 0) continue;
    
    const fileName = path.join(OUTPUT_DIR, `${schoolName}_${year}_专业分数线.json`);
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
    console.log(`   💾 保存: ${path.basename(fileName)} (${data.length}条)`);
    total += data.length;
  }
  
  console.log(`   📊 共保存 ${total} 条数据`);
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('夸克高考专业分数线采集脚本');
  console.log('========================================\n');
  
  // 测试院校列表
  const testSchools = ['北京大学', '清华大学', '复旦大学'];
  
  // 创建输出目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // 启动浏览器
  console.log('🚀 启动Edge浏览器...');
  
  // 直接使用硬编码路径，不依赖环境变量
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'C:\\Users\\lhp\\AppData\\Local\\Microsoft\\Edge\\User Data';
  
  console.log(`   Edge路径: ${edgePath}`);
  console.log(`   用户数据目录: ${userDataDir}`);
  
  // 检查路径是否存在
  const fs = require('fs');
  if (!fs.existsSync(userDataDir)) {
    console.log(`   ⚠️ 用户数据目录不存在，将创建新目录`);
  } else {
    console.log(`   ✅ 用户数据目录存在`);
  }
  
  try {
    const { context, page } = await chromium.launchPersistentContext({
      executablePath: edgePath,
      userDataDir: userDataDir,
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    console.log('✅ 浏览器启动成功');
    
    // 打开网站
    console.log('🌐 打开夸克高考网站...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(WAIT.pageLoad);
    
    console.log('✅ 网站加载成功');
    console.log('请在浏览器中登录夸克账号（如需要），然后在控制台输入 continue() 继续...\n');
    
    // 等待用户确认
    (globalThis as any).continue = async () => {
      console.log('\n继续采集...\n');
      
      for (const schoolName of testSchools) {
        try {
          const dataByYear = await scrapeSchool(page, schoolName);
          
          const total = Array.from(dataByYear.values()).reduce((sum, d) => sum + d.length, 0);
          if (total > 0) {
            saveData(dataByYear, schoolName);
          }
        } catch (e) {
          console.log(`❌ ${schoolName} 采集失败: ${e}`);
        }
        
        await page.waitForTimeout(2000);
      }
      
      console.log('\n========================================');
      console.log('采集完成！');
      console.log(`数据保存目录: ${OUTPUT_DIR}`);
      console.log('========================================\n');
      
      await page.close();
      await context.close();
    };
    
  } catch (e) {
    console.log(`❌ 启动浏览器失败: ${e}`);
    console.log('\n请确保:');
    console.log('1. Edge浏览器已安装');
    console.log('2. 关闭所有Edge窗口');
    console.log('3. 指定的用户数据目录存在\n');
  }
}

main().catch(console.error);
