import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHROME_PATH = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
const schoolName = '北京中医药大学';

async function main() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH, headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });
  const context = await browser.newContext({
    viewport: null, locale: 'zh-CN', timezoneId: 'Asia/Shanghai',
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
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(2000);

  const containerIdx = await page.evaluate(() => {
    const cs = document.querySelectorAll('.select-tabs-overflow');
    const candidates = [];
    for (let i = 0; i < cs.length; i++) {
      const container = cs[i];
      const style = window.getComputedStyle(container);
      const rect = container.getBoundingClientRect();
      const visible = style.display !== 'none' && style.visibility !== 'hidden' &&
                      rect.width > 0 && rect.height > 0;
      if (!visible) continue;

      let parent = container.parentElement;
      let parentClass = '';
      while (parent) {
        parentClass = (parent.className || '') + ' ' + parentClass;
        parent = parent.parentElement;
      }
      const inZhuanye = parentClass.includes('zhuanye') || parentClass.includes('card-padding-zhuanye');
      if (!inZhuanye) continue;

      if (rect.left < -50 || rect.left > window.innerWidth - 50) continue;

      const btns = container.querySelectorAll('button.select-tabs-tab');
      let hasNianfen = false, hasPici = false;
      for (let j = 0; j < btns.length; j++) {
        const cls = (btns[j].className || '').toString();
        if (cls.includes('nianfen')) hasNianfen = true;
        else if (cls.includes('pici')) hasPici = true;
      }
      if (!hasNianfen || !hasPici) continue;

      let score = 0;
      if (rect.top >= 50 && rect.top < window.innerHeight - 100) score += 20;
      score += Math.min(10, Math.round(rect.width / 100));

      candidates.push({ idx: i, score: score });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].idx;
    }
    return 4;
  });
  console.log('容器索引:', containerIdx);

  console.log('\n=== 选海南 ===');
  await selectDropdown(page, containerIdx, 0, '海南', '省份');

  console.log('\n=== 选2025 ===');
  await selectDropdown(page, containerIdx, 1, '2025', '年份');
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    const expandBtns = document.querySelectorAll('[class*="expand"], [class*="zhankai"], [class*="show-more"], [class*="view-all"], [class*="展开"], button');
    for (const btn of expandBtns) {
      const text = (btn.innerText || btn.textContent || '').trim();
      if (text.includes('展开') || text.includes('查看全部') || text.includes('查看更多') || text.includes('详情')) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          btn.click();
        }
      }
    }
  });
  await page.waitForTimeout(2000);

  const cardData = await page.evaluate(() => {
    const cards = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
    const result = [];
    for (let i=0;i<cards.length;i++){
      const card = cards[i];
      const text = card.innerText || '';
      const lines = text.split('\n').filter(l => l.trim());
      result.push({
        idx: i,
        lineCount: lines.length,
        lines: lines,
      });
    }
    return result;
  });

  console.log('\n=== 卡片数据 ===');
  for (const card of cardData) {
    console.log('\n--- 卡片[' + card.idx + '] ' + card.lineCount + '行 ---');
    for (const line of card.lines) {
      console.log('  "' + line + '"');
    }
  }

  const outFile = path.join(__dirname, 'diag_bjzyy_output.json');
  fs.writeFileSync(outFile, JSON.stringify({cardData}, null, 2), 'utf-8');
  console.log('\n保存: ' + outFile);
  await new Promise(() => {});
}

async function selectDropdown(page, containerIdx, buttonIdx, targetText, buttonType) {
  try {
    const container = page.locator('.select-tabs-overflow').nth(containerIdx);
    const btn = container.locator('button.select-tabs-tab').nth(buttonIdx);

    let currentText = '';
    try {
      currentText = await btn.textContent({ timeout: 3000 }) || '';
    } catch (e) {}
    if (currentText && currentText.includes(targetText)) {
      console.log('    ✓ ' + buttonType + '已是: ' + targetText);
      return true;
    }

    await container.evaluate(el => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }).catch(() => {});
    await page.waitForTimeout(500);

    await btn.evaluate(el => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }).catch(() => {});
    await page.waitForTimeout(500);

    try {
      await btn.click({ force: true, timeout: 5000 });
    } catch (clickErr) {
      console.log('    ⚠ Playwright点击失败，尝试备用方式');
      await btn.evaluate(el => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }).catch(() => {});
    }

    await page.waitForTimeout(1500);

    const clicked = await page.evaluate((target) => {
      const optionEls = document.querySelectorAll('[class*="select-modal-li"]');
      for (let i = 0; i < optionEls.length; i++) {
        const el = optionEls[i];
        const text = (el.innerText || el.textContent || '').trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (text === target.targetText || text === target.targetText + '\n') {
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight) {
            el.click();
            return { found: true, text: text, src: 'modal-li' };
          }
        }
      }

      const allEls = document.querySelectorAll('div, span, li, button, a');
      for (let i = 0; i < allEls.length; i++) {
        const el = allEls[i];
        const text = (el.innerText || el.textContent || '').trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        if (text === target.targetText || text === target.targetText + '\n') {
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight) {

            const className = (el.className || '').toString();
            if (className.includes('select-tabs-tab')) continue;
            if (className.includes('qk-tabs-tab')) continue;
            if (rect.left < -10 || rect.left > window.innerWidth - 10) continue;

            el.click();
            return { found: true, text: text, src: 'fallback' };
          }
        }
      }

      return { found: false };
    }, { targetText: targetText });

    await page.waitForTimeout(2000);

    if (clicked.found) {
      console.log('    ✓ ' + buttonType + '选择成功: ' + targetText + ' (' + clicked.src + ')');
      return true;
    } else {
      console.log('    ⚠ ' + buttonType + '未找到选项: ' + targetText);
      return false;
    }
  } catch (e) {
    console.log('    ✗ ' + buttonType + '选择失败: ' + e.message.substring(0, 50));
    return false;
  }
}

main().catch(e=>{console.error(e);process.exit(1);});
