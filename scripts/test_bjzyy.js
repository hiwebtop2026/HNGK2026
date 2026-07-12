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
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForSelector('.qk-tabs-tab, [role="tab"]', { timeout: 15000 }); } catch(e){}
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(2000);

  const containerIdx = await page.evaluate(() => {
    const cs = document.querySelectorAll('.select-tabs-overflow');
    for (let i=0;i<cs.length;i++){const r=cs[i].getBoundingClientRect();const s=getComputedStyle(cs[i]);if(s.display==='none'||r.width<=0)continue;let p=cs[i].parentElement,pc='';while(p){pc=(p.className||'')+' '+pc;p=p.parentElement;}if(!(pc.includes('zhuanye')||pc.includes('card-padding')))continue;if(r.left<-50||r.left>window.innerWidth-50)continue;const btns=cs[i].querySelectorAll('button.select-tabs-tab');let hn=false,hp=false;for(let j=0;j<btns.length;j++){const c=(btns[j].className||'').toString();if(c.includes('nianfen'))hn=true;else if(c.includes('pici'))hp=true;}if(hn&&hp)return i;}
    return 4;
  });

  await simpleSelect(page, containerIdx, 0, '海南');
  await simpleSelect(page, containerIdx, 1, '2025');
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const results = [];
    function cleanText(t) { if (!t) return ''; return t.replace(/\r/g,'').replace(/\n/g,' ').replace(/\s+/g,' ').trim(); }
    const cards = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
    for (const card of cards) {
      const text = card.innerText || '';
      if (!text.includes('专业分数线')) continue;
      const lines = text.split('\n').map(l => cleanText(l)).filter(l => l);
      extractFromLines(lines, results);
    }
    function isMajorName(line) {
      if (line.length < 2 || line.length > 60) return false;
      if (/^\d+$/.test(line)) return false;
      if (/^\d/.test(line)) return false;
      if (/^[\(（]/.test(line)) return false;
      if (/^选科要求/.test(line)) return false;
      if (line.includes('？') || line.includes('?')) return false;
      if (line.includes('：') && line.length > 20) return false;
      if (line.includes('vs') || line.includes('VS')) return false;
      if (line.includes('怎么样') || line.includes('如何') || line.includes('好吗')) return false;
      if (line.includes('体验') || line.includes('指南') || line.includes('解析') || line.includes('排名') || line.includes('就业前景')) return false;
      if (line.includes('宿舍') || line.includes('食堂') || line.includes('校区') || line.includes('新生') || line.includes('毕业')) return false;
      if (line.includes('考研') || line.includes('读研') || line.includes('研究生')) return false;
      if (line.includes('学习') || line.includes('高效') || line.includes('动力') || line.includes('灵感') || line.includes('节奏') || line.includes('进度')) return false;
      if (line.includes('治愈') || line.includes('实验室') || line.includes('同学') || line.includes('酱') || line.includes('森林')) return false;
      if (line.includes('生存') || line.includes('现状') || line.includes('照片') || line.includes('章程')) return false;
      if (line.includes('升学率') || line.includes('出国率') || line.includes('就业率') || line.includes('薪酬') || line.includes('就业方向') || line.includes('就业单位')) return false;
      if (line.includes('王牌') || line.includes('最牛') || line.includes('哪些')) return false;
      if (line.length > 40 && (line.includes('，') || line.includes(','))) return false;
      if (/^[a-zA-Z]+$/.test(line)) return false;
      return true;
    }
    function extractFromLines(lines, results) {
      let currentRecord = null;
      let numFieldIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length < 2) continue;
        if (line.includes('专业分数线') || line.includes('最低分') || line.includes('最低位次') ||
            line.includes('批次线差') || line.includes('请选择') ||
            line === '选科要求' || line === '专业' || line === '院校' ||
            line === '招生类型' || line === '分数' || line === '位次' || line === '人数') {
          continue;
        }
        if (/^(北京|上海|天津|海南|重庆|广东|湖南|湖北|江苏|浙江|山东|河北|辽宁|福建|四川|河南|安徽|江西|广西|云南|贵州|甘肃|青海|宁夏|新疆|内蒙古|黑龙江|吉林|辽宁|西藏|2025|2024|2023|2022|2021|2020|本科批|本科批A段|专科批|综合|物理类|历史类|物理|历史|请选择|综|理|文)$/.test(line)) {
          continue;
        }
        if (line.includes('暂无') || line.includes('可尝试切换')) continue;
        if (line.includes('数据来源于') || line.includes('掌上志愿')) continue;
        const isMajorLine = isMajorName(line);
        if (isMajorLine) {
          if (currentRecord && currentRecord.major_name) {
            if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
              results.push(JSON.parse(JSON.stringify(currentRecord)));
            }
          }
          currentRecord = { major_name: line, min_score: undefined, min_rank: undefined, person_count: undefined, major_group: '', subject_requirement: '', major_description: '', batch: '本科批' };
          numFieldIndex = 0;
          continue;
        }
        if (!currentRecord) continue;
        if (line.includes('包含专业') || (line.includes('包含') && line.includes('专业'))) {
          currentRecord.major_description = line;
          continue;
        }
        if (/^[\(（]/.test(line)) {
          currentRecord.major_description = line;
          continue;
        }
        if (line.includes('选科要求：') || line.includes('选科要求:')) {
          const match = line.match(/选科要求[：:]\s*(.+)/);
          if (match) currentRecord.subject_requirement = match[1].trim();
          else currentRecord.subject_requirement = line;
          continue;
        }
        if (line.includes('选科要求') && line.includes('本科批')) {
          const match = line.match(/选科要求[：:]\s*(.+)/);
          if (match) currentRecord.subject_requirement = match[1].trim();
          continue;
        }
        if ((line.includes('必选') || line.includes('选考') || line.includes('科目要求')) && !currentRecord.subject_requirement) {
          if (line.length < 60) currentRecord.subject_requirement = line;
          continue;
        }
        if (line.includes('专业组')) {
          const groupMatch = line.match(/专业组\s*[（(]?\s*([0-9０-９]+)\s*[）)]?/);
          if (groupMatch) currentRecord.major_group = '专业组（' + groupMatch[1] + '）';
          else if (line.length < 30) currentRecord.major_group = line;
          continue;
        }
        if (line.includes('本科批A段')) { currentRecord.batch = '本科批A段'; continue; }
        const scoreMatch = line.match(/(\d{2,3})\s*分/);
        if (scoreMatch && currentRecord.min_score === undefined) {
          const score = parseInt(scoreMatch[1]);
          if (score > 100 && score < 800) { currentRecord.min_score = score; continue; }
        }
        const rankMatch = line.match(/(\d{3,8})\s*位次/);
        if (rankMatch) { currentRecord.min_rank = parseInt(rankMatch[1]); continue; }
        const countMatch = line.match(/(\d+)\s*人/);
        if (countMatch && currentRecord.person_count === undefined) { currentRecord.person_count = parseInt(countMatch[1]); continue; }
        if (/^\d+$/.test(line)) {
          const num = parseInt(line);
          if (currentRecord.min_score === undefined) {
            if (num >= 100 && num < 800) { currentRecord.min_score = num; continue; }
          }
          if (currentRecord.min_rank === undefined) {
            if (num >= 300 && num < 1000000) { currentRecord.min_rank = num; continue; }
          }
          if (currentRecord.person_count === undefined) {
            if (num > 0 && num <= 500) { currentRecord.person_count = num; continue; }
          }
        }
      }
      if (currentRecord && currentRecord.major_name) {
        if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
          results.push(JSON.parse(JSON.stringify(currentRecord)));
        }
      }
    }
    return results;
  });

  console.log('\n=== 修复后提取结果 ===');
  console.log('共 ' + result.length + ' 条记录');
  for (const r of result) {
    console.log('\n专业: ' + r.major_name);
    console.log('  分数: ' + r.min_score + ' | 位次: ' + r.min_rank + ' | 人数: ' + r.person_count);
    console.log('  专业说明: ' + (r.major_description || '(空)'));
    console.log('  选科要求: ' + (r.subject_requirement || '(空)'));
    console.log('  专业组: ' + (r.major_group || '(空)'));
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
