import { chromium, Browser, Page, BrowserContext, Request, Response } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'data');

const YEARS = [2023, 2024, 2025];
const PROVINCE = '海南';

function readSchoolsList() {
  const schoolsFile = path.join(__dirname, 'schools_list.json');
  if (fs.existsSync(schoolsFile)) {
    return JSON.parse(fs.readFileSync(schoolsFile, 'utf-8'));
  }
  return ['清华大学', '北京大学', '复旦大学', '上海交通大学'];
}

async function main() {
  console.log('='.repeat(70));
  console.log('夸克高考专业分数线自动抓取工具');
  console.log('='.repeat(70));

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const schools = readSchoolsList();
  console.log(`\n院校数量: ${schools.length}`);

  console.log('\n正在启动浏览器...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const collectedResponses = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (
      url.includes('score') ||
      url.includes('major') ||
      url.includes('fen_shu') ||
      url.includes('college') ||
      url.includes('gaokao')
    ) {
      try {
        if (response.status() === 200) {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('json')) {
            const body = await response.json();
            collectedResponses.push({
              url: url,
              status: response.status(),
              data: body,
            });
            console.log(`  [API] ${url.substring(0, 80)}...`);
          }
        }
      } catch (e) {
      }
    }
  });

  try {
    const testSchool = schools[0];
    console.log(`\n测试院校: ${testSchool}`);

    const testUrl = `https://vt.quark.cn/blm/pc-gaokao-1089/index?uc_param_str=dnntnwvepffrgibijbprsvdsdicheiniutstkp&entry=navi`;

    console.log('\n正在访问夸克高考首页...');
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log('\n找到的API请求数量:', collectedResponses.length);

    if (collectedResponses.length > 0) {
      const apiFile = path.join(OUTPUT_DIR, 'api_responses.json');
      fs.writeFileSync(apiFile, JSON.stringify(collectedResponses, null, 2), 'utf-8');
      console.log(`API响应已保存到: ${apiFile}`);
    }

    const screenshotFile = path.join(OUTPUT_DIR, 'screenshot.png');
    await page.screenshot({ path: screenshotFile, fullPage: true });
    console.log(`页面截图已保存到: ${screenshotFile}`);

    const htmlFile = path.join(OUTPUT_DIR, 'page_content.html');
    fs.writeFileSync(htmlFile, await page.content(), 'utf-8');
    console.log(`页面HTML已保存到: ${htmlFile}`);

  } catch (e) {
    console.error('出错:', e);
  } finally {
    console.log('\n10秒后关闭浏览器...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

main().catch(console.error);
