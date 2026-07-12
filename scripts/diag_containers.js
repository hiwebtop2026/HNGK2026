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

  const containers = await page.evaluate(() => {
    const results = [];
    const cs = document.querySelectorAll('.select-tabs-overflow');
    
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      const r = c.getBoundingClientRect();
      const s = getComputedStyle(c);
      const text = c.innerText || '';
      
      let parent = c.parentElement;
      let parentClass = '';
      while (parent) {
        parentClass = (parent.className || '') + ' ' + parentClass;
        parent = parent.parentElement;
      }
      
      const btns = c.querySelectorAll('button.select-tabs-tab');
      const btnInfo = [];
      for (let j = 0; j < btns.length; j++) {
        const btn = btns[j];
        btnInfo.push({
          index: j,
          text: btn.innerText.trim(),
          className: (btn.className || '').toString(),
          width: btn.getBoundingClientRect().width,
          height: btn.getBoundingClientRect().height
        });
      }
      
      results.push({
        index: i,
        visible: s.display !== 'none' && s.visibility !== 'hidden',
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        inZhuanye: parentClass.includes('zhuanye') || parentClass.includes('card-padding'),
        btnCount: btns.length,
        btns: btnInfo,
        textPreview: text.substring(0, 100)
      });
    }
    
    return results;
  });

  console.log('\n=== 页面容器诊断 ===');
  console.log('共找到 ' + containers.length + ' 个 .select-tabs-overflow 容器');
  console.log('');

  for (const c of containers) {
    console.log('--- 容器 ' + c.index + ' ---');
    console.log('  可见: ' + c.visible);
    console.log('  尺寸: ' + c.width + 'x' + c.height);
    console.log('  位置: top=' + c.top + ', left=' + c.left);
    console.log('  在专业面板内: ' + c.inZhuanye);
    console.log('  按钮数量: ' + c.btnCount);
    for (const btn of c.btns) {
      console.log('    按钮[' + btn.index + ']: "' + btn.text + '" (' + btn.className.substring(0, 50) + ')');
    }
    console.log('');
  }

  const modalOptions = await page.evaluate(() => {
    const results = [];
    const els = document.querySelectorAll('[class*="select-modal-li"]');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const r = el.getBoundingClientRect();
      results.push({
        index: i,
        text: (el.innerText || el.textContent || '').trim(),
        visible: r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight
      });
    }
    return results;
  });

  console.log('\n=== 当前下拉选项 ===');
  console.log('共找到 ' + modalOptions.length + ' 个 select-modal-li 元素');
  for (const opt of modalOptions) {
    console.log('  [' + opt.index + '] "' + opt.text + '" (可见:' + opt.visible + ')');
  }

  await browser.close();
}

main().catch(e=>{console.error(e);process.exit(1);});