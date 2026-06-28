import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', 'data');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('CDP连接Edge浏览器 - 数据提取测试');
  console.log('='.repeat(60));

  ensureDir(OUTPUT_DIR);

  try {
    console.log('\n正在连接到Edge浏览器 (端口 9222...');
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ 连接成功！');

    const contexts = browser.contexts();
    console.log(`检测到 ${contexts.length} 个浏览器上下文`);

    let page = null;
    for (const context of contexts) {
      const pages = context.pages();
      console.log(`  上下文有 ${pages.length} 个页面`);
      for (const p of pages) {
        const url = p.url();
        const title = await p.title();
        console.log(`    - ${title}: ${url.substring(0, 80)}...`);
        if (url.includes('quark.cn') && url.includes('gaokao')) {
          page = p;
          console.log(`  ✅ 找到夸克高考页面!`);
          break;
        }
      }
      if (page) break;
    }

    if (!page) {
      console.log('\n⚠️  未找到夸克高考页面');
      console.log('请在Edge浏览器中打开夸克高考页面后重试');
      
      if (contexts.length > 0 && contexts[0].pages().length > 0) {
        page = contexts[0].pages()[0];
        console.log(`\n使用当前页面进行测试...`);
      } else {
        console.log('没有可用页面，退出');
        await browser.close();
        return;
      }
    }

    console.log('\n当前页面URL:', page.url());
    console.log('当前页面标题:', await page.title());

    console.log('\n📸 正在截图...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'cdp_test.png'), fullPage: true });
    console.log('✅ 截图已保存到 data/cdp_test.png');

    console.log('\n🔍 正在提取页面数据...');

    const result = await page.evaluate(() => {
      const results = [];
      
      const url = window.location.href;
      const schoolMatch = url.match(/university_name=([^&]+)/);
      const schoolName = schoolMatch ? decodeURIComponent(schoolMatch[1]) : '未知院校';
      
      const yearMatch = url.match(/year[":]\s*["']?(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2025;

      const tables = document.querySelectorAll('table');
      
      for (let t = 0; t < tables.length; t++) {
        const table = tables[t];
        const rows = table.querySelectorAll('tr');
        if (rows.length < 2) continue;

        const headers = [];
        rows[0].querySelectorAll('th, td').forEach(cell => {
          headers.push((cell.textContent || '').trim());
        });

        for (let i = 1; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length < 2) continue;

          const record = {
            school_name: schoolName,
            year: year,
            province: '海南',
            batch: '本科批',
            source: '夸克高考'
          };

          cells.forEach((cell, idx) => {
            if (idx >= headers.length) return;
            const header = headers[idx];
            const value = (cell.textContent || '').trim();

            if (header.includes('专业') && !header.includes('组')) {
              record.major_name = value;
            } else if (header.includes('专业组')) {
              record.major_group = value;
            } else if (header.includes('最低分') || (header.includes('分') && !header.includes('位次') && !header.includes('差'))) {
              const num = parseInt(value);
              if (!isNaN(num)) record.min_score = num;
            } else if (header.includes('位次') || header.includes('排名')) {
              const num = parseInt(value);
              if (!isNaN(num)) record.min_rank = num;
            } else if (header.includes('人数') || header.includes('计划')) {
              const num = parseInt(value);
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
        const allItems = document.querySelectorAll('[class*="item"], [class*="list"], li');
        for (const item of allItems) {
          const text = item.textContent || '';
          if (text.length < 5 || text.length > 500) continue;
          
          const scoreMatch = text.match(/(\d{2,3})\s*分/);
          const rankMatch = text.match(/(\d{3,6})\s*位次/);
          const majorMatch = text.match(/([^\d\n]{2,}(?:专业|学|工程|技术|管理|经济)[^\d\n]*)/);
          
          if (scoreMatch && majorMatch) {
            results.push({
              school_name: schoolName,
              major_name: majorMatch[1].trim(),
              min_score: parseInt(scoreMatch[1]),
              min_rank: rankMatch ? parseInt(rankMatch[1]) : null,
              year: year,
              province: '海南',
              batch: '本科批',
              source: '夸克高考'
            });
          }
        }
      }

      const uniqueResults = [];
      const seen = new Set();
      for (const r of results) {
        const key = r.major_name + '_' + (r.min_score || '') + '_' + (r.min_rank || '');
        if (!seen.has(key)) {
          seen.add(key);
          uniqueResults.push(r);
        }
      }

      return {
        schoolName,
        year,
        tableCount: tables.length,
        dataCount: uniqueResults.length,
        data: uniqueResults
      };
    });

    console.log(`\n📊 提取结果:`);
    console.log(`  院校: ${result.schoolName}`);
    console.log(`  年份: ${result.year}`);
    console.log(`  表格数: ${result.tableCount}`);
    console.log(`  数据条数: ${result.dataCount}`);

    if (result.data.length > 0) {
      console.log('\n📋 数据预览:');
      console.table(result.data.slice(0, 5));
      
      const outputFile = path.join(OUTPUT_DIR, `${result.schoolName}_${result.year}_专业分数线.json`);
      fs.writeFileSync(outputFile, JSON.stringify(result.data, null, 2), 'utf-8');
      console.log(`\n💾 数据已保存到: ${outputFile}`);
    } else {
      console.log('\n⚠️  未提取到数据');
      console.log('请确保页面已滚动到"专业分数线"部分，并点击了"查看全部"');
    }

    console.log('\n✅ 测试完成！');
    console.log('浏览器保持打开中...');
    console.log('按 Ctrl+C 退出脚本');

    await new Promise(() => {});

  } catch (e) {
    console.error('\n❌ 出错:', e.message);
    console.error(e.stack);
  }
}

main().catch(console.error);