import { chromium } from 'playwright';
import fs from 'fs';

async function main() {
  const userDataDir = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\User Data Playwright';
  const browserPath = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: browserPath,
    headless: false,
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.101 Safari/537.36',
    args: ['--start-maximized'],
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('正在访问页面...');
  
  const schoolName = '东南大学';
  const url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent(schoolName) + '&q=' + encodeURIComponent(schoolName) +
    '&uc_biz_str=qk_enable_gesture:true%7COPT:W_ENTER_ANI@1%7COPT:TOOLBAR_STYLE@0%7COPT:W_PAGE_REFRESH@0%7COPT:BACK_BTN_STYLE@0%7COPT:IMMERSIVE@1%7COPT%3AW_PAGE_REFRESH%400&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp';

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('页面加载完成');

  await page.waitForTimeout(5000);

  console.log('保存截图...');
  await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });

  console.log('保存HTML...');
  const html = await page.content();
  fs.writeFileSync('debug_page.html', html, 'utf-8');

  console.log('分析页面元素...');
  const pageInfo = await page.evaluate(function() {
    const info = {
      title: document.title,
      bodyLength: document.body.innerText.length,
      tables: [],
      lists: [],
      divs: [],
      selectors: [],
    };

    const tables = document.querySelectorAll('table');
    tables.forEach(function(table, idx) {
      const rows = table.querySelectorAll('tr');
      if (rows.length > 1) {
        info.tables.push({
          index: idx,
          rows: rows.length,
          innerText: table.innerText.substring(0, 500),
        });
      }
    });

    const listItems = document.querySelectorAll('li, [role="listitem"], [class*="item"]');
    listItems.forEach(function(item, idx) {
      const text = item.innerText || '';
      if (text.length > 20 && text.length < 500) {
        info.lists.push({
          index: idx,
          className: item.className,
          innerText: text.substring(0, 300),
        });
      }
    });

    const divs = document.querySelectorAll('div');
    divs.forEach(function(div, idx) {
      const text = div.innerText || '';
      if (text.includes('分') && text.length > 50 && text.length < 800) {
        info.divs.push({
          index: idx,
          className: div.className,
          innerText: text.substring(0, 400),
        });
      }
    });

    const allSelectors = [];
    const elements = document.querySelectorAll('*');
    elements.forEach(function(el) {
      const cls = el.className || '';
      if (cls.includes('score') || cls.includes('major') || cls.includes('fen') || cls.includes('线')) {
        if (!allSelectors.includes(cls)) {
          allSelectors.push(cls);
        }
      }
    });
    info.selectors = allSelectors;

    return info;
  });

  console.log('页面信息:', JSON.stringify(pageInfo, null, 2));

  const dropdownInfo = await page.evaluate(function() {
    const info = {
      selects: [],
      dropdowns: [],
      buttons: [],
    };

    const selects = document.querySelectorAll('select');
    selects.forEach(function(s) {
      info.selects.push({
        className: s.className,
        options: Array.from(s.options).map(function(o) { return o.text; }).slice(0, 10),
      });
    });

    const buttons = document.querySelectorAll('button');
    buttons.forEach(function(b) {
      const text = b.innerText || '';
      if (text.length > 0 && text.length < 50) {
        info.buttons.push({
          className: b.className,
          text: text,
        });
      }
    });

    const dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="select"], [class*="picker"]');
    dropdowns.forEach(function(d) {
      info.dropdowns.push({
        className: d.className,
        text: d.innerText.substring(0, 100),
      });
    });

    return info;
  });

  console.log('交互元素:', JSON.stringify(dropdownInfo, null, 2));

  console.log('\n调试完成！');
  console.log('截图: debug_screenshot.png');
  console.log('HTML: debug_page.html');

  await page.waitForTimeout(10000);
  await context.close();
}

main().catch(console.error);
