import dotenv from 'dotenv';
dotenv.config();

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YEARS = [2025, 2024, 2023];
const BATCH = '本科批';
const GENRE = '综合';
const DEBUG_PORT = 9222;

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

function startEdgeWithDebug() {
  console.log('正在启动Edge浏览器调试模式...');
  
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(__dirname, '..', 'edge_profile');
  ensureDir(userDataDir);
  
  const args = [
    '--remote-debugging-port=' + DEBUG_PORT,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    '--disable-infobars',
    '--disable-blink-features=AutomationControlled'
  ];
  
  try {
    const child = spawn(edgePath, args, {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    console.log('✓ Edge浏览器已启动，调试端口:', DEBUG_PORT, '用户数据目录:', userDataDir);
    return true;
  } catch (e) {
    console.log('❌ 启动Edge浏览器失败:', e.message);
    return false;
  }
}

async function connectToEdge() {
  console.log('正在连接到Edge浏览器...');
  
  const urls = ['http://127.0.0.1:' + DEBUG_PORT, 'http://localhost:' + DEBUG_PORT];
  
  for (const url of urls) {
    try {
      const browser = await chromium.connectOverCDP(url);
      const context = browser.contexts()[0] || await browser.newContext();
      const page = context.pages()[0] || await context.newPage();
      
      console.log('✓ 成功连接到Edge浏览器:', url);
      return { browser, context, page };
    } catch (e) {
      console.log('  ⚠ 连接失败:', url, '-', e.message);
    }
  }
  
  console.log('❌ 无法连接到Edge浏览器');
  return null;
}

async function goToSchoolPage(page, schoolName, year, province) {
  const url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent(schoolName) + '&q=' + encodeURIComponent(schoolName) +
    '&uc_biz_str=qk_enable_gesture:true%7COPT:W_ENTER_ANI@1%7COPT:TOOLBAR_STYLE@0%7COPT:W_PAGE_REFRESH@0%7COPT:BACK_BTN_STYLE@0%7COPT:IMMERSIVE@1%7COPT%3AW_PAGE_REFRESH%400&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp';

  const maxRetries = 3;
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(3000);
      
      const pageContent = await page.content();
      if (pageContent.length > 5000) {
        return true;
      }
      
      console.log('  ⚠ 页面内容过短，重试中... (' + (retry + 1) + '/' + maxRetries + ')');
    } catch (e) {
      const errMsg = e.message || '';
      if (errMsg.includes('ERR_NAME_NOT_RESOLVED') || errMsg.includes('ENOTFOUND')) {
        console.log('  ❌ 网络连接失败: DNS解析错误');
        return false;
      }
      console.log('  ⚠ 访问失败，重试中... (' + (retry + 1) + '/' + maxRetries + ')');
      await page.waitForTimeout(2000);
    }
  }
  
  console.log('  ❌ 访问失败:', schoolName);
  return false;
}

async function expandAllItems(page) {
  try {
    await page.evaluate(function() {
      const expanders = document.querySelectorAll('[class*="expand"], [class*="arrow"], [class*="toggle"], [class*="collapse"], [class*="dropdown"]');
      expanders.forEach(function(el) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          el.click();
        }
      });
      
      const chevrons = document.querySelectorAll('[class*="chevron"], svg');
      chevrons.forEach(function(el) {
        const parent = el.closest('button, div, span');
        if (parent) {
          const style = window.getComputedStyle(parent);
          if (style.cursor === 'pointer' && style.display !== 'none') {
            parent.click();
          }
        }
      });
    });

    await page.waitForTimeout(1500);

    await page.evaluate(function() {
      const arrows = document.querySelectorAll('div, span');
      arrows.forEach(function(el) {
        const text = el.textContent || '';
        if ((text.includes('▼') || text.includes('▶') || text.includes('展开')) && window.getComputedStyle(el).cursor === 'pointer') {
          el.click();
        }
      });
    });

    await page.waitForTimeout(1000);
  } catch (e) {
    // ignore
  }
}

async function extractFromDOM(page, schoolName, year, province) {
  try {
    return await page.evaluate(function(args) {
      const results = [];
      
      const tables = document.querySelectorAll('table');
      for (let t = 0; t < tables.length; t++) {
        const table = tables[t];
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;

        const headers = [];
        rows[0].querySelectorAll('th, td').forEach(function(cell) {
          headers.push((cell.textContent || '').trim());
        });

        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length < 2) continue;

          const record = {
            school_name: args.schoolName,
            province: args.province,
            year: args.year,
            batch: args.batch,
            source: '夸克高考(DOM)',
          };

          cells.forEach(function(cell, idx) {
            const header = headers[idx] || '';
            const value = (cell.textContent || '').trim();

            if (header.includes('专业') && !header.includes('组') && !header.includes('要求')) {
              record.major_name = value;
            } else if (header.includes('专业组') || header.includes('组名')) {
              record.major_group = value;
            } else if (header.includes('最低分')) {
              const num = parseInt(value.replace(/[^\d]/g, ''));
              if (!isNaN(num)) record.min_score = num;
            } else if (header.includes('位次') || header.includes('排名')) {
              const num = parseInt(value.replace(/[^\d]/g, ''));
              if (!isNaN(num)) record.min_rank = num;
            } else if (header.includes('最高分')) {
              const num = parseInt(value.replace(/[^\d]/g, ''));
              if (!isNaN(num)) record.max_score = num;
            } else if (header.includes('平均分')) {
              const num = parseInt(value.replace(/[^\d]/g, ''));
              if (!isNaN(num)) record.avg_score = num;
            } else if (header.includes('人数') || header.includes('计划')) {
              const num = parseInt(value.replace(/[^\d]/g, ''));
              if (!isNaN(num)) record.person_count = num;
            } else if (header.includes('科目') || header.includes('选科') || header.includes('要求')) {
              record.subject_requirement = value;
            }
          });

          if (record.major_name && (record.min_score || record.min_rank)) {
            results.push(record);
          }
        }
      }

      if (results.length === 0) {
        const items = document.querySelectorAll('[class*="content-List-li"], [class*="major-item"], [class*="score-item"], [class*="list-item"]');
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const text = item.innerText || '';
          if (text.length < 5 || text.length > 1000) continue;

          const lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
          if (lines.length < 2) continue;

          const record = {
            school_name: args.schoolName,
            province: args.province,
            year: args.year,
            batch: args.batch,
            source: '夸克高考(DOM)',
          };

          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];

            if (!record.major_name && line.length > 1 && line.length < 80 && !/^\d+$/.test(line)) {
              const majorMatch = line.match(/^([^\d（(][^\d]{2,}[专业|学|工程|技术|管理|经济|法学|文学|理学|工学|医学|农学|军事|艺术|教育|历史|哲学][^\d]*)\s*$/);
              if (majorMatch) {
                record.major_name = majorMatch[1].trim();
              } else if (!record.major_name) {
                record.major_name = line;
              }
            }

            const scoreMatch = line.match(/(\d{2,3})\s*分/);
            if (scoreMatch && !record.min_score) {
              record.min_score = parseInt(scoreMatch[1]);
            }

            const rankMatch = line.match(/(\d{3,7})\s*位次/);
            if (rankMatch && !record.min_rank) {
              record.min_rank = parseInt(rankMatch[1]);
            }

            const countMatch = line.match(/(\d+)\s*人/);
            if (countMatch && !record.person_count) {
              record.person_count = parseInt(countMatch[1]);
            }

            const groupMatch = line.match(/专业组([^，。\s]+)/);
            if (groupMatch && !record.major_group) {
              record.major_group = '专业组' + groupMatch[1].trim();
            }

            if ((line.includes('必选') || line.includes('选科') || line.includes('科目')) && !record.subject_requirement) {
              record.subject_requirement = line.trim();
            }

            const descMatch = line.match(/(包含专业[：:].+)$/);
            if (descMatch && !record.major_description) {
              record.major_description = descMatch[1].trim();
            }

            if (!record.major_description && line.includes('包含') && line.includes('专业')) {
              record.major_description = line.trim();
            }
          }

          if (record.major_name && (record.min_score || record.min_rank)) {
            const skipKeywords = ['普通招生', '招生类型', '最低分', '最低位次', '人数', '批次线差', '专业', '院校', '选科要求'];
            let shouldSkip = false;
            for (let k = 0; k < skipKeywords.length; k++) {
              if (record.major_name.includes(skipKeywords[k])) {
                shouldSkip = true;
                break;
              }
            }
            if (!shouldSkip) {
              results.push(record);
            }
          }
        }
      }

      return results;
    }, { schoolName: schoolName, year: year, province: province, batch: BATCH });
  } catch (e) {
    console.log('    ❌ DOM提取失败');
    return [];
  }
}

async function processSchool(page, schoolName, province) {
  let totalRecords = 0;
  let hasData = false;

  for (let y = 0; y < YEARS.length; y++) {
    const year = YEARS[y];
    console.log('  📅 ' + year + '年');

    const success = await goToSchoolPage(page, schoolName, year, province);
    if (!success) {
      console.log('    ❌ 页面加载失败');
      continue;
    }

    await expandAllItems(page);

    const records = await extractFromDOM(page, schoolName, year, province);

    if (records.length === 0) {
      console.log('    ⚠ 未获取到数据');
      continue;
    }

    const filePath = saveRecords(records, province, schoolName, year);
    console.log('    ✓ 保存 ' + records.length + ' 条到 ' + path.basename(filePath));

    totalRecords += records.length;
    hasData = true;

    await page.waitForTimeout(800);
  }

  return { success: hasData, totalRecords: totalRecords };
}

async function main() {
  const args = process.argv.slice(2);
  const province = args[0] || '海南';
  const startIndex = parseInt(args[1]) || 0;

  console.log('='.repeat(70));
  console.log('🚀 ' + province + '高考专业分数线全量采集 - Edge远程调试模式');
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

  startEdgeWithDebug();
  
  await new Promise(function(resolve) { setTimeout(resolve, 10000); });

  let connection = await connectToEdge();
  if (!connection) {
    console.log('⚠ 第一次连接失败，等待浏览器完全启动...');
    await new Promise(function(resolve) { setTimeout(resolve, 10000); });
    connection = await connectToEdge();
  }
  
  if (!connection) {
    console.log('❌ 无法连接到Edge浏览器');
    console.log('请手动启动Edge浏览器并开启调试模式，然后重新运行脚本');
    console.log('启动命令: msedge --remote-debugging-port=9222');
    return;
  }

  const { browser, page } = connection;

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
    console.log('\n等待10秒后关闭连接...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

main().catch(console.error);
