import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const CHROME_PATH = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const schoolName = '北京中医药大学';

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH, headless: true,
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

  console.log('\n=== 选择省份: 海南 ===');
  await selectProvince(page, '海南');
  await page.waitForTimeout(3000);

  console.log('\n=== 选择年份: 2023 ===');
  await selectYear(page, '2023');
  await page.waitForTimeout(5000);

  const currentState = await page.evaluate(() => {
    const container = document.querySelectorAll('.select-tabs-overflow')[4];
    const btns = container.querySelectorAll('button.select-tabs-tab');
    return {
      btn0: btns[0] ? btns[0].innerText.trim() : '无',
      btn1: btns[1] ? btns[1].innerText.trim() : '无',
      btn2: btns[2] ? btns[2].innerText.trim() : '无',
      btn3: btns[3] ? btns[3].innerText.trim() : '无'
    };
  });
  console.log('\n当前选择状态:', JSON.stringify(currentState));

  const rawData = await page.evaluate(() => {
    const results = [];
    const cards = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const text = card.innerText || '';
      
      if (text.includes('专业分数线')) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        results.push({
          cardIndex: i,
          totalLines: lines.length,
          lines: lines.slice(0, 100),
          fullText: text.substring(0, 3000)
        });
      }
    }
    
    return results;
  });

  console.log('\n=== 2023年海南原始数据 ===');
  for (const card of rawData) {
    console.log('\n--- 卡片 ' + card.cardIndex + ' (' + card.totalLines + '行) ---');
    for (let i = 0; i < card.lines.length; i++) {
      console.log('[' + i + '] "' + card.lines[i] + '"');
    }
  }

  await browser.close();
}

async function selectProvince(page, targetText) {
  return await selectDropdownOption(page, 4, 0, targetText, '省份');
}

async function selectYear(page, targetText) {
  return await selectDropdownOption(page, 4, 1, targetText, '年份');
}

async function selectDropdownOption(page, containerIdx, buttonIdx, targetText, buttonType) {
  const container = page.locator('.select-tabs-overflow').nth(containerIdx);
  const btn = container.locator('button.select-tabs-tab').nth(buttonIdx);
  
  let currentText = '';
  try { currentText = await btn.textContent({ timeout: 3000 }) || ''; } catch(e) {}
  console.log('  当前' + buttonType + ': "' + currentText + '"');
  
  if (currentText && currentText.includes(targetText)) {
    console.log('  ✓ ' + buttonType + '已是: ' + targetText);
    return true;
  }

  await container.evaluate(el => { el.scrollIntoView({ behavior: 'instant', block: 'center' }); }).catch(() => {});
  await page.waitForTimeout(500);
  await btn.evaluate(el => { el.scrollIntoView({ behavior: 'instant', block: 'center' }); }).catch(() => {});
  await page.waitForTimeout(500);

  try {
    await btn.click({ force: true, timeout: 5000 });
    console.log('  ✓ 点击' + buttonType + '按钮成功');
  } catch(clickErr) {
    console.log('  ⚠ Playwright点击失败: ' + clickErr.message.substring(0, 50));
    await btn.evaluate(el => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }).catch(() => {});
  }

  await page.waitForTimeout(2000);

  const found = await page.evaluate((target) => {
    const modal = document.querySelector('[class*="select-modal-grid-pc"]');
    if (modal) {
      const items = modal.querySelectorAll('[class*="select-modal-grid-pc-item"]');
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const text = (el.innerText || el.textContent || '').trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (text === target.targetText || text === target.targetText + '\n') {
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight) {
            el.click();
            return true;
          }
        }
      }
    }
    return false;
  }, { targetText: targetText });

  if (found) {
    console.log('  ✓ ' + buttonType + '选择成功: ' + targetText);
    return true;
  }

  console.log('  ⚠ 尝试备用方式：直接查找页面上的' + buttonType + '选项...');
  const foundByText = await page.evaluate((target) => {
    const allEls = document.querySelectorAll('div, span, li, button');
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      const text = (el.innerText || el.textContent || '').trim();
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      if (text === target.targetText || text === target.targetText + '\n') {
        if (style.display !== 'none' && style.visibility !== 'hidden' &&
            rect.width > 0 && rect.height > 0 &&
            rect.top >= 0 && rect.top < window.innerHeight &&
            rect.left >= 0 && rect.left < window.innerWidth) {

          const className = (el.className || '').toString();
          if (className.includes('select-tabs-tab')) continue;
          if (className.includes('qk-tabs-tab')) continue;

          el.click();
          return true;
        }
      }
    }
    return false;
  }, { targetText: targetText });

  if (foundByText) {
    console.log('  ✓ ' + buttonType + '选择成功(备用): ' + targetText);
    return true;
  }

  console.log('  ⚠ ' + buttonType + '未找到选项: ' + targetText);
  return false;
}

main().catch(e=>{console.error(e);process.exit(1);});