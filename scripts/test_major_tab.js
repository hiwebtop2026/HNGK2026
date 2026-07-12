import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('启动Chrome浏览器测试专业分数线Tab切换...');
  
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--no-sandbox',
      '--start-maximized',
      '--disable-search-engine-choice-screen',
    ],
  });
  
  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.101 Safari/537.36',
    locale: 'zh-CN',
  });
  
  const page = await context.newPage();
  
  const testUrl = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent('东南大学') + '&q=' + encodeURIComponent('东南大学') +
    '&device=pc&by=tuijian&by2=general_entity_college&params=' +
    encodeURIComponent(JSON.stringify({
      province: '海南',
      year: '2025',
      batch: '本科批',
      genre: '综合',
    })) + '&type=zhuanye&uc_param_str=ntnwvepffrbiprsvchutosstxskp';
  
  console.log('访问测试页面: 东南大学 - 海南 - 2025');
  
  try {
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    console.log('\n=== 步骤1: 查找并点击专业分数线Tab ===');
    
    const tabInfo = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.qk-tabs-tab, [role="tab"]');
      const results = [];
      
      tabs.forEach((tab, i) => {
        const text = (tab.innerText || tab.textContent || '').trim();
        const className = tab.className || '';
        const rect = tab.getBoundingClientRect();
        results.push({
          index: i,
          text: text,
          class: className.substring(0, 60),
          visible: rect.width > 0 && rect.height > 0,
          top: Math.round(rect.top),
        });
      });
      
      return results;
    });
    
    console.log('找到 ' + tabInfo.length + ' 个Tab:');
    tabInfo.forEach(t => {
      console.log('  [' + t.index + '] ' + (t.visible ? '✅' : '❌') + ' "' + t.text + '" top=' + t.top);
    });
    
    const majorTabIndex = tabInfo.findIndex(t => t.text.includes('专业分数线') && t.visible);
    console.log('\n专业分数线Tab索引:', majorTabIndex);
    
    if (majorTabIndex >= 0) {
      console.log('点击专业分数线Tab...');
      await page.evaluate((idx) => {
        const tabs = document.querySelectorAll('.qk-tabs-tab, [role="tab"]');
        if (tabs[idx]) {
          tabs[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
          tabs[idx].click();
        }
      }, majorTabIndex);
      
      await page.waitForTimeout(5000);
      console.log('✅ Tab切换完成，等待5秒...');
    }
    
    console.log('\n=== 步骤2: 切换后检查专业分数线区域内容 ===');
    
    const majorSectionContent = await page.evaluate(() => {
      const sections = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
      const results = [];
      
      sections.forEach((section, i) => {
        const text = section.innerText || '';
        const rect = section.getBoundingClientRect();
        results.push({
          index: i,
          top: Math.round(rect.top),
          textLength: text.length,
          preview: text.substring(0, 500).replace(/\n/g, ' | '),
        });
      });
      
      return results;
    });
    
    console.log('专业分数线区域数量:', majorSectionContent.length);
    majorSectionContent.forEach(s => {
      console.log('  [' + s.index + '] top=' + s.top + ' len=' + s.textLength);
      console.log('     预览: ' + s.preview);
      console.log('');
    });
    
    console.log('\n=== 步骤3: 检查下拉选择器 ===');
    
    const dropdownInfo = await page.evaluate(() => {
      const containers = document.querySelectorAll('.select-tabs-overflow');
      const results = [];
      
      containers.forEach((container, ci) => {
        const buttons = container.querySelectorAll('button.select-tabs-tab');
        const btnTexts = [];
        buttons.forEach((btn, bi) => {
          btnTexts.push((btn.innerText || btn.textContent || '').trim());
        });
        
        const rect = container.getBoundingClientRect();
        const style = window.getComputedStyle(container);
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0;
        
        let parentClass = '';
        let parent = container.parentElement;
        while (parent && parentClass.length < 300) {
          parentClass += (parent.className || '') + ' ';
          parent = parent.parentElement;
        }
        
        const isInZhuanye = parentClass.includes('card-padding-zhuanye') || parentClass.includes('fenshuxian-card');
        
        results.push({
          containerIndex: ci,
          visible: visible,
          top: Math.round(rect.top),
          buttons: btnTexts,
          isZhuanye: isInZhuanye,
        });
      });
      
      return results;
    });
    
    console.log('下拉容器列表:');
    dropdownInfo.forEach(d => {
      console.log('  [' + d.containerIndex + '] ' + (d.visible ? '✅可见' : '❌隐藏') + 
        ' top=' + d.top + 
        (d.isZhuanye ? ' 【专业区】' : ''));
      console.log('    按钮: [' + d.buttons.join(', ') + ']');
    });
    
    console.log('\n=== 步骤4: 尝试提取数据 ===');
    
    const extractedData = await page.evaluate(() => {
      const results = [];
      
      function cleanText(t) {
        if (!t) return '';
        return t.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      const majorSections = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye');
      
      for (let s = 0; s < majorSections.length; s++) {
        const section = majorSections[s];
        const text = section.innerText || '';
        
        if (text.length < 50) continue;
        
        const lines = text.split('\n').map(l => cleanText(l)).filter(l => l);
        
        let currentRecord = null;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.length < 2) continue;
          
          if (line.includes('专业分数线') || line.includes('最低分') || line.includes('最低位次') || 
              line.includes('人数') || line.includes('批次线差') || line.includes('请选择') ||
              line === '选科要求' || line === '专业' || line === '院校' || line.includes('暂无相关数据')) {
            continue;
          }
          
          if (/^(北京|上海|天津|海南|重庆|广东|湖南|湖北|江苏|浙江|山东|河北|辽宁|福建|2025|2024|2023|本科批|本科批A段|专科批|综合|物理类|历史类|物理|历史|请选择|综)$/.test(line)) {
            continue;
          }
          
          const isMajorLine = line.length > 2 && line.length < 100 && 
            !/^\d+$/.test(line) &&
            (line.includes('专业') || line.includes('学') || line.includes('工程') || 
             line.includes('技术') || line.includes('管理') || line.includes('经济') || 
             line.includes('法学') || line.includes('类') || line.includes('班') ||
             line.includes('试验') || line.includes('实验'));
          
          if (isMajorLine) {
            if (currentRecord && currentRecord.major_name) {
              if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined) {
                results.push(currentRecord);
              }
            }
            
            currentRecord = {
              major_name: line,
              min_score: undefined,
              min_rank: undefined,
              person_count: undefined,
              major_group: '',
              subject_requirement: '',
              major_description: '',
              batch: '本科批',
            };
            continue;
          }
          
          if (!currentRecord) continue;
          
          if (line.includes('包含专业') || (line.includes('包含') && line.includes('专业'))) {
            currentRecord.major_description = line;
            continue;
          }
          
          if (line.includes('选科要求：') || line.includes('选科要求:')) {
            const match = line.match(/选科要求[：:]\s*(.+)/);
            if (match) {
              currentRecord.subject_requirement = match[1].trim();
            } else {
              currentRecord.subject_requirement = line;
            }
            continue;
          }
          
          if ((line.includes('必选') || line.includes('选考')) && !currentRecord.subject_requirement) {
            if (line.length < 50) {
              currentRecord.subject_requirement = line;
            }
            continue;
          }
          
          if (line.includes('专业组')) {
            const groupMatch = line.match(/专业组\s*[（(]?\s*([^）)\s，。]+)\s*[）)]?/);
            if (groupMatch) {
              currentRecord.major_group = '专业组（' + groupMatch[1].trim() + '）';
            } else {
              currentRecord.major_group = line;
            }
            continue;
          }
          
          const scoreMatch = line.match(/(\d{2,3})\s*分/);
          if (scoreMatch && currentRecord.min_score === undefined) {
            const score = parseInt(scoreMatch[1]);
            if (score > 100 && score < 800) {
              currentRecord.min_score = score;
            }
          }
          
          const rankMatch = line.match(/(\d{3,8})\s*位次/);
          if (rankMatch) {
            currentRecord.min_rank = parseInt(rankMatch[1]);
          }
          
          const countMatch = line.match(/(\d+)\s*人/);
          if (countMatch && currentRecord.person_count === undefined) {
            currentRecord.person_count = parseInt(countMatch[1]);
          }
          
          if (/^\d{2,3}$/.test(line) && currentRecord.min_score === undefined) {
            const score = parseInt(line);
            if (score > 100 && score < 800) {
              currentRecord.min_score = score;
            }
          }
          
          if (/^\d{3,8}$/.test(line) && currentRecord.min_score !== undefined && currentRecord.min_rank === undefined) {
            const num = parseInt(line);
            if (num > 100 && num < 1000000) {
              currentRecord.min_rank = num;
            }
          }
        }
        
        if (currentRecord && currentRecord.major_name) {
          if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined) {
            results.push(currentRecord);
          }
        }
      }
      
      return results;
    });
    
    console.log('提取到 ' + extractedData.length + ' 条数据:');
    extractedData.forEach((d, i) => {
      console.log('  [' + i + '] ' + d.major_name);
      console.log('      分数: ' + (d.min_score || '-') + ' | 位次: ' + (d.min_rank || '-') + ' | 人数: ' + (d.person_count || '-'));
      console.log('      专业组: ' + d.major_group + ' | 选科: ' + d.subject_requirement);
      console.log('      专业说明: ' + (d.major_description || '(无)'));
    });
    
    console.log('\n测试完成！浏览器将在60秒后关闭。');
    await page.waitForTimeout(60000);
    
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
    console.error('错误详情:', e);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
