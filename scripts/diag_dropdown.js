import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const CHROME_PATH = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const schoolName = '北京中医药大学';

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH, headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.101 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
  });
  await context.addInitScript(() => { Object.defineProperty(navigator,'webdriver',{get:()=>undefined}); window.chrome={runtime:{}}; });
  await context.route('**/*.png', r=>r.abort()); await context.route('**/*.jpg', r=>r.abort());
  const page = await context.newPage();

  const url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent(schoolName) + '&q=' + encodeURIComponent(schoolName) +
    '&device=pc&by=tuijian&by2=general_entity_college&type=zhuanye&uc_param_str=ntnwvepffrbiprsvchutosstxskp';
  console.log('访问页面...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForSelector('.qk-tabs-tab, [role="tab"]', { timeout: 15000 }); } catch(e){}
  await page.waitForTimeout(3000);

  await page.evaluate(() => { window.scrollTo(0, 600); });
  await page.waitForTimeout(1000);

  console.log('\n=== 点击省份按钮前的页面状态 ===');
  await checkAllDropdowns(page);

  console.log('\n=== 点击省份按钮 ===');
  const container = page.locator('.select-tabs-overflow').nth(4);
  const btn = container.locator('button.select-tabs-tab').nth(0);
  await btn.click({ force: true });
  await page.waitForTimeout(3000);

  console.log('\n=== 点击省份按钮后的页面状态 ===');
  await checkAllDropdowns(page);

  console.log('\n=== 尝试使用hover方式 ===');
  await btn.hover();
  await page.waitForTimeout(2000);
  await checkAllDropdowns(page);

  console.log('\n=== 尝试使用focus + keyboard ===');
  await btn.focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(1000);
  await checkAllDropdowns(page);

  await browser.close();
}

async function checkAllDropdowns(page) {
  const dropdowns = await page.evaluate(() => {
    const results = [];
    
    const modalEls = document.querySelectorAll('[class*="modal"], [class*="dropdown"], [class*="popup"], [class*="select"]');
    for (let i = 0; i < modalEls.length; i++) {
      const el = modalEls[i];
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (r.width > 50 && r.height > 50 && 
          r.top >= 0 && r.top < window.innerHeight &&
          s.display !== 'none' && s.visibility !== 'hidden') {
        const cls = (el.className || '').toString();
        const text = el.innerText || '';
        if (cls.includes('modal') || cls.includes('dropdown')) {
          const options = el.querySelectorAll('li, div, span');
          const optTexts = [];
          for (let j = 0; j < Math.min(20, options.length); j++) {
            const optText = (options[j].innerText || options[j].textContent || '').trim();
            if (optText && optText.length > 0 && optText.length < 20) {
              optTexts.push(optText);
            }
          }
          results.push({
            className: cls.substring(0, 80),
            position: 'top=' + Math.round(r.top) + ', left=' + Math.round(r.left),
            size: r.width + 'x' + r.height,
            options: optTexts.slice(0, 10)
          });
        }
      }
    }
    
    return results;
  });

  console.log('找到 ' + dropdowns.length + ' 个可见的下拉/模态元素:');
  for (const d of dropdowns) {
    console.log('  className: ' + d.className);
    console.log('  position: ' + d.position);
    console.log('  size: ' + d.size);
    if (d.options.length > 0) {
      console.log('  options: ' + d.options.join(', '));
    }
    console.log('');
  }
}

main().catch(e=>{console.error(e);process.exit(1);});