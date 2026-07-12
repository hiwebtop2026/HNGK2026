import { chromium } from 'playwright';

async function main() {
  const browserPath = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
  
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.101 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: null,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  const schoolName = '安徽财经大学';
  const url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent(schoolName) + '&q=' + encodeURIComponent(schoolName) +
    '&uc_biz_str=qk_enable_gesture:true%7COPT:W_ENTER_ANI@1%7COPT:TOOLBAR_STYLE@0%7COPT:W_PAGE_REFRESH@0%7COPT:BACK_BTN_STYLE@0%7COPT:IMMERSIVE@1%7COPT%3AW_PAGE_REFRESH%400&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp';

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('=== 页面结构分析 ===');
  
  const sections = await page.evaluate(() => {
    const result = [];
    
    const elements = document.querySelectorAll('div');
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const text = el.innerText || '';
      const className = el.className || '';
      
      if (text.includes('专业分数线') || text.includes('录取分数线')) {
        result.push({
          className: className,
          text: text.substring(0, 200),
          tagName: el.tagName,
        });
      }
    }
    
    return result;
  });

  console.log('\n--- 包含分数线的元素 ---');
  sections.forEach((s, i) => {
    console.log(`\n[${i + 1}] className: ${s.className}`);
    console.log(`    text: ${s.text}`);
  });

  const dropdowns = await page.evaluate(() => {
    const result = [];
    const selects = document.querySelectorAll('select, [class*="select"], [class*="dropdown"], [class*="picker"]');
    
    for (let i = 0; i < selects.length; i++) {
      const el = selects[i];
      const text = el.innerText || '';
      const className = el.className || '';
      const parentText = el.parentElement ? el.parentElement.innerText.substring(0, 100) : '';
      
      result.push({
        className: className,
        text: text.substring(0, 100),
        parentText: parentText,
        tagName: el.tagName,
      });
    }
    
    return result;
  });

  console.log('\n--- 下拉框元素 ---');
  dropdowns.forEach((d, i) => {
    console.log(`\n[${i + 1}] tagName: ${d.tagName}, className: ${d.className}`);
    console.log(`    text: ${d.text}`);
    console.log(`    parentText: ${d.parentText}`);
  });

  const buttons = await page.evaluate(() => {
    const result = [];
    const btns = document.querySelectorAll('button');
    
    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i];
      const text = btn.innerText || '';
      const className = btn.className || '';
      
      if (text.includes('地区') || text.includes('省份') || text.includes('年份') || text.includes('批次') || text.includes('科目')) {
        result.push({
          className: className,
          text: text,
        });
      }
    }
    
    return result;
  });

  console.log('\n--- 包含筛选文字的按钮 ---');
  buttons.forEach((b, i) => {
    console.log(`[${i + 1}] className: ${b.className}, text: ${b.text}`);
  });

  await page.waitForTimeout(10000);
  await browser.close();
}

main().catch(console.error);