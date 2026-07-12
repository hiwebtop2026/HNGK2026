import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

  const containerIdx = await page.evaluate(() => {
    const cs = document.querySelectorAll('.select-tabs-overflow');
    for (let i=0;i<cs.length;i++){const r=cs[i].getBoundingClientRect();const s=getComputedStyle(cs[i]);if(s.display==='none'||r.width<=0)continue;let p=cs[i].parentElement,pc='';while(p){pc=(p.className||'')+' '+pc;p=p.parentElement;}if(!(pc.includes('zhuanye')||pc.includes('card-padding')))continue;if(r.left<-50||r.left>window.innerWidth-50)continue;const btns=cs[i].querySelectorAll('button.select-tabs-tab');let hn=false,hp=false;for(let j=0;j<btns.length;j++){const c=(btns[j].className||'').toString();if(c.includes('nianfen'))hn=true;else if(c.includes('pici'))hp=true;}if(hn&&hp)return i;}
    return 4;
  });
  console.log('容器索引:', containerIdx);

  await simpleSelect(page, containerIdx, 0, '海南');
  await simpleSelect(page, containerIdx, 1, '2023');
  await page.waitForTimeout(3000);

  const rawData = await page.evaluate(() => {
    const results = [];
    function cleanText(t) { if (!t) return ''; return t.replace(/\r/g,'').replace(/\n/g,'|').replace(/\s+/g,' ').trim(); }
    
    const cards = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
    console.log('找到 ' + cards.length + ' 个卡片');
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const text = card.innerText || '';
      console.log('卡片' + i + '长度:', text.length);
      
      if (text.includes('专业分数线')) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        results.push({
          cardIndex: i,
          totalLines: lines.length,
          lines: lines.slice(0, 50),
          fullText: text.substring(0, 2000)
        });
      }
    }
    
    return results;
  });

  console.log('\n=== 2023年海南原始数据诊断 ===');
  for (const card of rawData) {
    console.log('\n--- 卡片 ' + card.cardIndex + ' (' + card.totalLines + '行) ---');
    for (let i = 0; i < card.lines.length; i++) {
      console.log('[' + i + '] "' + card.lines[i] + '"');
    }
  }

  await browser.close();
}

async function simpleSelect(page, containerIdx, buttonIdx, targetText) {
  const container = page.locator('.select-tabs-overflow').nth(containerIdx);
  const btn = container.locator('button.select-tabs-tab').nth(buttonIdx);
  await btn.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'})).catch(()=>{});
  await page.waitForTimeout(300);
  await btn.click({force:true,timeout:5000}).catch(async()=>{ await btn.evaluate(el=>{el.dispatchEvent(new MouseEvent('click',{bubbles:true}));}).catch(()=>{});});
  await page.waitForTimeout(1500);
  await page.evaluate((t) => {
    const els = document.querySelectorAll('[class*="select-modal-li"]');
    for (const el of els) { if ((el.innerText || el.textContent || '').trim() === t) { el.click(); return; } }
  }, targetText);
  await page.waitForTimeout(2000);
}

main().catch(e=>{console.error(e);process.exit(1);});