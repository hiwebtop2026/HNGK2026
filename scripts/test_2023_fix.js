import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

  const extractResult = await page.evaluate((args) => {
    const cards = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
    const results = [];
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const text = card.innerText || '';
      
      if (text.includes('专业分数线')) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let currentRecord = {};
        
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          
          if (line === '专业分数线') continue;
          if (line === '专业' || line === '最低分' || line === '最低位次' || line === '人数' || line === '批次线差') continue;
          
          if (/^[（(].*[）)]$/.test(line)) {
            if (currentRecord.major_name) {
              currentRecord.major_description = (currentRecord.major_description || '') + ' ' + line;
            }
            continue;
          }
          if (line.includes('本科批')) {
            currentRecord.batch = '本科批';
            continue;
          }
          if (line.includes('本科批A段')) {
            currentRecord.batch = '本科批A段';
            continue;
          }
          
          const scoreMatch = line.match(/(\d{2,3})\s*分/);
          if (scoreMatch && currentRecord.min_score === undefined) {
            const score = parseInt(scoreMatch[1]);
            if (score > 100 && score < 800) {
              currentRecord.min_score = score;
            }
            continue;
          }
          
          const rankMatch = line.match(/(\d{3,8})\s*位次/);
          if (rankMatch) {
            currentRecord.min_rank = parseInt(rankMatch[1]);
            continue;
          }
          
          const countMatch = line.match(/(\d+)\s*人/);
          if (countMatch && currentRecord.person_count === undefined) {
            currentRecord.person_count = parseInt(countMatch[1]);
            continue;
          }
          
          if (/^\d+$/.test(line)) {
            const num = parseInt(line);
            
            if (currentRecord.min_score !== undefined && currentRecord.min_rank !== undefined) {
              if (currentRecord.person_count === undefined && num > 0 && num <= 100) {
                if ((currentRecord.min_score !== undefined && num === currentRecord.min_score) ||
                    (currentRecord.min_rank !== undefined && num === currentRecord.min_rank)) {
                  continue;
                }
                currentRecord.person_count = num;
                continue;
              }
              continue;
            }
            
            if (currentRecord.min_score === undefined && num >= 400 && num < 800) {
              currentRecord.min_score = num;
              continue;
            }
            
            if (currentRecord.min_rank === undefined) {
              if (currentRecord.min_score !== undefined) {
                currentRecord.min_rank = num;
                continue;
              }
              if (num >= 300 && num < 1000000) {
                currentRecord.min_rank = num;
                continue;
              }
            }
          }
          
          if (line.includes('选科要求') && line.includes('本科批')) {
            const match = line.match(/选科要求[：:]\s*(.+)/);
            if (match) {
              currentRecord.subject_requirement = match[1].trim();
            }
            continue;
          }
          
          if ((line.includes('必选') || line.includes('选考') || line.includes('科目要求')) && !currentRecord.subject_requirement) {
            if (line.length < 60) {
              currentRecord.subject_requirement = line;
            }
            continue;
          }
          
          if (line.includes('专业组')) {
            const groupMatch = line.match(/专业组\s*[（(]?\s*([0-9０-９]+)\s*[）)]?/);
            if (groupMatch) {
              currentRecord.major_group = '专业组（' + groupMatch[1] + '）';
            } else if (line.length < 30) {
              currentRecord.major_group = line;
            }
            
            const reqMatch = line.match(/-+\s*(.+)/);
            if (reqMatch && !currentRecord.subject_requirement) {
              const reqText = reqMatch[1].trim();
              if (reqText.length < 50) {
                currentRecord.subject_requirement = reqText;
              }
            }
            continue;
          }
          
          if (isMajorName(line)) {
            if (currentRecord.major_name) {
              if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
                results.push({...currentRecord});
              }
            }
            currentRecord = {
              major_name: line.replace(/[\(（].*[\)）]/g, '').trim()
            };
            const descMatch = line.match(/[\(（]([^)]+)[\)）]/);
            if (descMatch && descMatch[1].length > 0) {
              currentRecord.major_description = descMatch[1].trim();
            }
            continue;
          }
        }
        
        if (currentRecord && currentRecord.major_name) {
          if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
            results.push({...currentRecord});
          }
        }
      }
    }
    
    function isMajorName(line) {
      if (line.length < 2 || line.length > 60) return false;
      if (/^\d+$/.test(line)) return false;
      if (/^\d/.test(line)) return false;
      if (line === '--') return false;
      if (/^[\(（]/.test(line)) return false;
      if (/^选科要求/.test(line)) return false;
      if (line.includes('？') || line.includes('?')) return false;
      if (line.includes('：') && line.length > 20) return false;
      if (line.includes('vs') || line.includes('VS')) return false;
      if (line.includes('怎么样') || line.includes('如何') || line.includes('好吗')) return false;
      if (line.includes('体验') || line.includes('指南') || line.includes('解析') || 
          line.includes('排名') || line.includes('就业前景')) return false;
      if (line.includes('宿舍') || line.includes('食堂') || line.includes('校区') || 
          line.includes('新生') || line.includes('毕业')) return false;
      if (line.includes('考研') || line.includes('读研') || line.includes('研究生')) return false;
      if (line.includes('学习') || line.includes('高效') || line.includes('动力') || 
          line.includes('灵感') || line.includes('节奏') || line.includes('进度')) return false;
      if (line.includes('治愈') || line.includes('实验室') || line.includes('同学') || 
          line.includes('酱') || line.includes('森林')) return false;
      if (line.includes('生存') || line.includes('现状') || line.includes('照片') || 
          line.includes('章程')) return false;
      if (line.includes('升学率') || line.includes('出国率') || line.includes('就业率') || 
          line.includes('薪酬') || line.includes('就业方向') || line.includes('就业单位')) return false;
      if (line.includes('王牌') || line.includes('最牛') || line.includes('哪些')) return false;
      if (line.length > 40 && (line.includes('，') || line.includes(','))) return false;
      
      const majorKeywords = ['类专业', '试验班', '实验班', '类', '工程', '技术', '科学',
                             '管理', '经济', '金融', '法学', '文学', '理学', '工学',
                             '医学', '农学', '军事', '艺术', '教育', '历史', '哲学',
                             '计算机', '电子', '电气', '机械', '土木', '建筑', '化工',
                             '材料', '能源', '环境', '生物', '食品', '纺织', '安全',
                             '测绘', '地质', '矿业', '交通运输', '航天', '航空',
                             '武器', '核工程', '林业', '水产', '草学', '中医',
                             '药学', '中药学', '法医学', '护理学', '临床医学',
                             '口腔医学', '公共事业', '图书情报', '物流', '工业工程',
                             '电子商务', '旅游管理', '酒店管理', '会展',
                             '针灸推拿', '英语', '中药制药'];
      
      for (let k = 0; k < majorKeywords.length; k++) {
        if (line.includes(majorKeywords[k])) return true;
      }
      
      return false;
    }
    
    return results;
  }, { year: 2023, schoolName: schoolName, province: '海南', batch: '本科批' });

  console.log('\n=== 提取结果（修复后） ===');
  console.log('共提取 ' + extractResult.length + ' 条专业数据');
  for (let i = 0; i < extractResult.length; i++) {
    const r = extractResult[i];
    console.log('\n[' + (i+1) + '] ' + r.major_name);
    console.log('   专业说明: ' + (r.major_description || '无'));
    console.log('   专业组: ' + (r.major_group || '无'));
    console.log('   选科要求: ' + (r.subject_requirement || '无'));
    console.log('   最低分: ' + (r.min_score !== undefined ? r.min_score : '无'));
    console.log('   最低位次: ' + (r.min_rank !== undefined ? r.min_rank : '无'));
    console.log('   人数: ' + (r.person_count !== undefined ? r.person_count : '无'));
    console.log('   批次: ' + (r.batch || '无'));
  }

  const outputDir = 'data/hainan_scores';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputFile = outputDir + '/' + schoolName + '_2023_专业分数线.json';
  fs.writeFileSync(outputFile, JSON.stringify(extractResult, null, 2), 'utf-8');
  console.log('\n✓ 数据已保存到: ' + outputFile);

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