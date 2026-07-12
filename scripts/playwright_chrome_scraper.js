import dotenv from 'dotenv';
dotenv.config();

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YEARS = [2025, 2024, 2023];
const BATCH = '本科批';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveRecords(records, province, schoolName, year) {
  const outputDir = path.join(__dirname, '..', 'data', province === '海南' ? 'hainan_scores' : 'tianjin_scores');
  ensureDir(outputDir);
  
  const fileName = schoolName + '_' + year + '_专业分数线.json';
  const filePath = path.join(outputDir, fileName);
  
  const filtered = records.filter(function(r) {
    return r.major_name && (r.min_score !== undefined || r.min_rank !== undefined);
  });
  
  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  return filePath;
}

async function setupBrowser() {
  console.log('正在启动Chrome浏览器...');

  const browserPath = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--start-maximized',
      '--disable-search-engine-choice-screen',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.101 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: null,
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  await context.addInitScript(function() {
    Object.defineProperty(navigator, 'webdriver', { get: function() { return undefined; } });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  await page.route('**/*.png', function(route) { route.abort(); });
  await page.route('**/*.jpg', function(route) { route.abort(); });
  await page.route('**/*.gif', function(route) { route.abort(); });
  await page.route('**/*.svg', function(route) { route.abort(); });
  await page.route('**/*.woff', function(route) { route.abort(); });

  return { browser, context, page };
}

async function goToSchoolPage(page, schoolName) {
  const url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent(schoolName) + '&q=' + encodeURIComponent(schoolName) +
    '&uc_biz_str=qk_enable_gesture:true%7COPT:W_ENTER_ANI@1%7COPT:TOOLBAR_STYLE@0%7COPT:W_PAGE_REFRESH@0%7COPT:BACK_BTN_STYLE@0%7COPT:IMMERSIVE@1%7COPT%3AW_PAGE_REFRESH%400&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp';

  const maxRetries = 3;
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      return true;
    } catch (e) {
      console.log('  ❌ 访问失败 (重试 ' + (retry + 1) + '/' + maxRetries + '):', schoolName);
      if (retry < maxRetries - 1) {
        await page.waitForTimeout(5000);
      }
    }
  }
  
  return false;
}

async function clickMajorScoreTab(page) {
  try {
    await page.evaluate(function() {
      const tabs = document.querySelectorAll('.qk-tabs-tab');
      // 点击最后一个"专业分数线"Tab（索引23）
      if (tabs[23]) {
        tabs[23].scrollIntoView({ behavior: 'smooth', block: 'center' });
        tabs[23].click();
      } else if (tabs[8]) {
        // 备用：点击第一个"专业分数线"Tab（索引8）
        tabs[8].scrollIntoView({ behavior: 'smooth', block: 'center' });
        tabs[8].click();
      }
    });
    await page.waitForTimeout(3000);
    console.log('  ✅ 切换到专业分数线Tab');
    return true;
  } catch (e) {
    console.log('  ⚠ 切换Tab失败:', e.message);
    return false;
  }
}

// 找到专业分数线区域的下拉容器索引
async function findMajorScoreContainer(page) {
  const containers = await page.evaluate(function() {
    const result = [];
    const groups = document.querySelectorAll('.select-tabs-overflow');
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const rect = group.getBoundingClientRect();
      const style = window.getComputedStyle(group);
      const text = group.innerText || '';
      
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && 
                      rect.width > 0 && rect.height > 0 &&
                      rect.top >= 0 && rect.top < window.innerHeight;
      
      // 专业分数线区域的特征：包含"请选择"且父元素包含"card-padding-zhuanye"
      const parentClass = group.parentElement ? group.parentElement.className || '' : '';
      const isMajorScore = parentClass.includes('card-padding-zhuanye') || 
                           parentClass.includes('zhuanye') ||
                           (text.includes('请选择') && visible);
      
      if (isMajorScore) {
        result.push({
          index: i,
          visible: visible,
          top: Math.round(rect.top),
          text: text.substring(0, 50).replace(/\n/g, ' '),
          parentClass: parentClass.substring(0, 80),
        });
      }
    }
    
    return result;
  });
  
  // 优先选择可见的、父元素包含"zhuanye"的容器
  const target = containers.find(function(c) { return c.visible && c.parentClass.includes('zhuanye'); }) ||
                 containers.find(function(c) { return c.visible; });
  
  if (target) {
    console.log('  📋 找到专业分数线区域容器: 索引=' + target.index);
    return target.index;
  }
  
  // 备用：返回第4个容器（之前调试确认的索引）
  console.log('  📋 使用默认容器索引: 4');
  return 4;
}

// 点击下拉按钮并选择选项
async function selectDropdown(page, containerIdx, buttonIdx, targetText, buttonType) {
  try {
    const container = page.locator('.select-tabs-overflow').nth(containerIdx);
    const btn = container.locator('button.select-tabs-tab').nth(buttonIdx);
    
    const currentText = await btn.textContent();
    if (currentText && currentText.includes(targetText)) {
      console.log('    ✅ ' + buttonType + '已是: ' + targetText);
      return true;
    }
    
    // 滚动到按钮位置
    await btn.evaluate(function(el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(500);
    
    // 点击按钮（使用force绕过可见性检查）
    await btn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // 查找并点击目标选项
    // 选项可能是页面上可见的、包含目标文本的可点击元素
    const clicked = await page.evaluate(function(target) {
      // 查找所有可见的元素，找到包含目标文本的
      const allEls = document.querySelectorAll('div, span, li, button, a');
      
      for (let i = 0; i < allEls.length; i++) {
        const el = allEls[i];
        const text = (el.innerText || el.textContent || '').trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // 必须完全匹配目标文本，且可见
        if (text === target.targetText || text === target.targetText + '\n') {
          if (style.display !== 'none' && style.visibility !== 'hidden' && 
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight) {
            
            // 排除select-tabs-tab按钮本身
            const className = (el.className || '').toString();
            if (className.includes('select-tabs-tab')) continue;
            
            // 排除tabs-tab
            if (className.includes('qk-tabs-tab')) continue;
            
            // 点击这个元素
            el.click();
            return { found: true, text: text, className: className.substring(0, 80) };
          }
        }
      }
      
      return { found: false };
    }, { targetText: targetText });
    
    if (clicked.found) {
      console.log('    ✅ ' + buttonType + '选择成功: ' + targetText);
      await page.waitForTimeout(2000);
      return true;
    } else {
      // 备用：使用文本定位器查找
      const optionLocator = page.locator('text="' + targetText + '"').first();
      if (await optionLocator.count() > 0) {
        await optionLocator.click({ force: true, timeout: 3000 });
        console.log('    ✅ ' + buttonType + '选择成功(备用): ' + targetText);
        await page.waitForTimeout(2000);
        return true;
      }
      
      console.log('    ⚠ ' + buttonType + '未找到选项: ' + targetText);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      return false;
    }
    
  } catch (e) {
    console.log('    ⚠ ' + buttonType + '选择失败:', e.message.substring(0, 80));
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e2) {}
    return false;
  }
}

async function selectProvince(page, containerIdx, province) {
  console.log('    选择省份:', province);
  return await selectDropdown(page, containerIdx, 0, province, '省份');
}

async function selectYear(page, containerIdx, year) {
  console.log('    选择年份:', year);
  return await selectDropdown(page, containerIdx, 1, year.toString(), '年份');
}

async function selectBatch(page, containerIdx, batch) {
  console.log('    选择批次:', batch);
  return await selectDropdown(page, containerIdx, 2, batch, '批次');
}

async function clickViewAll(page) {
  try {
    const viewAllBtn = page.locator('text=查看全部').first();
    if (await viewAllBtn.count() > 0) {
      await viewAllBtn.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(2000);
      return true;
    }
  } catch (e) {}
  return false;
}

async function expandAllItems(page) {
  try {
    await page.evaluate(function() {
      const expanders = document.querySelectorAll('[class*="expand"], [class*="arrow"], [class*="toggle"], [class*="collapse"]');
      expanders.forEach(function(el) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          el.click();
        }
      });
    });
    await page.waitForTimeout(1500);
  } catch (e) {}
}

async function extractFromDOM(page, schoolName, year, province) {
  try {
    return await page.evaluate(function(args) {
      const results = [];
      
      // 优先从专业分数线区域提取
      const majorSections = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
      
      for (let s = 0; s < majorSections.length; s++) {
        const section = majorSections[s];
        const text = section.innerText || '';
        
        if (text.length < 50) continue;
        
        const lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
        
        let currentRecord = null;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.length < 2) continue;
          
          // 跳过标题行
          if (line.includes('专业分数线') || line.includes('最低分') || line.includes('最低位次') || 
              line.includes('人数') || line.includes('批次线差') || line.includes('请选择') ||
              line.includes('选科要求')) {
            // 但"选科要求：xxx"需要保留处理
            if (line.includes('选科要求：') && currentRecord) {
              const reqMatch = line.match(/选科要求：(.+)/);
              if (reqMatch && !currentRecord.subject_requirement) {
                currentRecord.subject_requirement = reqMatch[1].trim();
              }
            }
            continue;
          }
          
          // 跳过选择器按钮文本
          if (/^(北京|上海|天津|海南|2025|2024|2023|本科批|综合|请选择)$/.test(line)) continue;
          
          const isMajorLine = line.length > 2 && line.length < 100 && 
            !/^\d+$/.test(line) && 
            (line.includes('专业') || line.includes('学') || line.includes('工程') || 
             line.includes('技术') || line.includes('管理') || line.includes('经济') || 
             line.includes('法学') || line.includes('类'));
          
          if (isMajorLine) {
            if (currentRecord && currentRecord.major_name) {
              if (currentRecord.min_score || currentRecord.min_rank) {
                results.push(currentRecord);
              }
            }
            
            currentRecord = {
              school_name: args.schoolName,
              province: args.province,
              year: args.year,
              batch: args.batch,
              source: '夸克高考(DOM)',
              major_name: line.trim(),
            };
            continue;
          }
          
          if (!currentRecord) continue;
          
          // 匹配分数（纯数字，2-4位）
          if (/^\d{2,4}$/.test(line) && !currentRecord.min_score) {
            const score = parseInt(line);
            if (score > 0 && score < 1000) {
              currentRecord.min_score = score;
            }
          }
          
          // 匹配位次
          const rankMatch = line.match(/(\d{3,8})\s*位次/);
          if (rankMatch) {
            currentRecord.min_rank = parseInt(rankMatch[1]);
          } else if (/^\d{3,8}$/.test(line) && currentRecord.min_score && !currentRecord.min_rank) {
            // 纯数字可能是位次
            const num = parseInt(line);
            if (num > 1000) {
              currentRecord.min_rank = num;
            }
          }
          
          // 匹配人数
          const countMatch = line.match(/(\d+)\s*人/);
          if (countMatch) {
            currentRecord.person_count = parseInt(countMatch[1]);
          } else if (/^\d{1,3}$/.test(line) && currentRecord.min_score && currentRecord.min_rank && !currentRecord.person_count) {
            currentRecord.person_count = parseInt(line);
          }
          
          // 专业组
          if (line.includes('专业组')) {
            const groupMatch = line.match(/专业组\s*([^\s，。]+)/);
            if (groupMatch) {
              currentRecord.major_group = '专业组' + groupMatch[1].trim();
            }
          }
          
          // 包含专业
          if (line.includes('包含专业')) {
            currentRecord.major_description = line.trim();
          }
          
          // 批次
          if (line.includes('本科批') && !currentRecord.batch) {
            currentRecord.batch = '本科批';
          }
        }
        
        if (currentRecord && currentRecord.major_name && (currentRecord.min_score || currentRecord.min_rank)) {
          results.push(currentRecord);
        }
      }
      
      // 去重
      const finalResults = [];
      const seen = {};
      
      for (let r = 0; r < results.length; r++) {
        const record = results[r];
        const key = record.major_name + '_' + (record.min_score || '') + '_' + (record.min_rank || '');
        
        if (!seen[key]) {
          seen[key] = true;
          finalResults.push(record);
        }
      }
      
      return finalResults;
    }, { schoolName: schoolName, year: year, province: province, batch: BATCH });
  } catch (e) {
    console.log('    ❌ DOM提取失败:', e.message);
    return [];
  }
}

async function processSchool(page, schoolName, province) {
  let totalRecords = 0;
  let hasData = false;

  console.log('  📍 访问院校页面...');
  const success = await goToSchoolPage(page, schoolName);
  if (!success) {
    console.log('  ❌ 页面加载失败');
    return { success: false, totalRecords: 0 };
  }

  await page.waitForTimeout(2000);

  await clickMajorScoreTab(page);
  await page.waitForTimeout(1000);

  const containerIdx = await findMajorScoreContainer(page);

  for (let y = 0; y < YEARS.length; y++) {
    const year = YEARS[y];
    console.log('  📅 ' + year + '年');

    await selectProvince(page, containerIdx, province);
    await selectYear(page, containerIdx, year);
    await selectBatch(page, containerIdx, BATCH);
    
    await clickViewAll(page);
    await expandAllItems(page);
    await page.waitForTimeout(2000);

    const records = await extractFromDOM(page, schoolName, year, province);

    if (records.length === 0) {
      console.log('    ⚠ 未获取到数据');
      continue;
    }

    const filePath = saveRecords(records, province, schoolName, year);
    console.log('    ✓ 保存 ' + records.length + ' 条到 ' + path.basename(filePath));

    totalRecords += records.length;
    hasData = true;

    await page.waitForTimeout(1000);
  }

  return { success: hasData, totalRecords: totalRecords };
}

async function main() {
  const args = process.argv.slice(2);
  const province = args[0] || '海南';
  const startIndex = parseInt(args[1]) || 0;

  console.log('='.repeat(70));
  console.log('🚀 ' + province + '高考专业分数线全量采集 - Chrome浏览器版');
  console.log('='.repeat(70));

  const schoolListFile = province === '海南'
    ? path.join(__dirname, '..', 'data', 'hainan_schools.json')
    : path.join(__dirname, '..', 'data', 'tianjin_schools.json');

  if (!fs.existsSync(schoolListFile)) {
    console.log('❌ 院校列表文件不存在:', schoolListFile);
    return;
  }

  let content = fs.readFileSync(schoolListFile, 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  const schools = JSON.parse(content);
  const schoolsToProcess = schools.slice(startIndex);

  console.log('📋 院校总数:', schools.length, '| 待处理:', schoolsToProcess.length);
  console.log('='.repeat(70));

  const { browser, page } = await setupBrowser();

  let successSchools = 0;
  let failSchools = 0;
  let totalRecords = 0;

  try {
    for (let i = 0; i < schoolsToProcess.length; i++) {
      const schoolName = schoolsToProcess[i];
      const globalIndex = startIndex + i;

      console.log('\n[' + (globalIndex + 1) + '/' + schools.length + '] 📚 ' + schoolName);

      const result = await processSchool(page, schoolName, province);

      if (result.success) {
        successSchools++;
        totalRecords += result.totalRecords;
        console.log('  ✅ 成功:', result.totalRecords, '条');
      } else {
        failSchools++;
        console.log('  ❌ 失败');
      }

      if ((globalIndex + 1) % 10 === 0) {
        console.log('\n📈 进度:', (globalIndex + 1) + '/' + schools.length, '| 成功:', successSchools, '| 失败:', failSchools, '| 总计:', totalRecords, '条');
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 采集完成！');
    console.log('📊 成功院校:', successSchools);
    console.log('❌ 失败院校:', failSchools);
    console.log('📋 总数据量:', totalRecords, '条');
    console.log('='.repeat(70));

  } catch (e) {
    console.error('\n❌ 采集过程出错:', e);
  } finally {
    console.log('\n等待10秒后关闭浏览器...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

main().catch(console.error);