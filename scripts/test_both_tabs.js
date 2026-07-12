import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('测试两个专业分数线Tab...');
  
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
  
  try {
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    console.log('\n=== 测试: 点击第26号Tab (上面那个专业分数线) ===');
    
    await page.evaluate((idx) => {
      const tabs = document.querySelectorAll('.qk-tabs-tab, [role="tab"]');
      if (tabs[idx]) {
        tabs[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        tabs[idx].click();
      }
    }, 26);
    
    await page.waitForTimeout(5000);
    console.log('已点击Tab 26，等待5秒...');
    
    console.log('\n=== 检查所有fenshuxian-card内容 ===');
    
    const allCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('.fenshuxian-card');
      const results = [];
      
      cards.forEach((card, i) => {
        const text = card.innerText || '';
        const rect = card.getBoundingClientRect();
        const className = card.className || '';
        results.push({
          index: i,
          class: className.substring(0, 80),
          top: Math.round(rect.top),
          hasData: !text.includes('暂无相关数据'),
          textLength: text.length,
          preview: text.substring(0, 300).replace(/\n/g, ' | '),
        });
      });
      
      return results;
    });
    
    console.log('找到 ' + allCards.length + ' 个分数线卡片:');
    allCards.forEach(c => {
      console.log('  [' + c.index + '] top=' + c.top + 
        (c.hasData ? ' ✅有数据' : ' ❌无数据') + 
        ' len=' + c.textLength);
      console.log('     class: ' + c.class);
      console.log('     预览: ' + c.preview);
      console.log('');
    });
    
    console.log('\n=== 点击"查看全部"按钮（如果有的话）===');
    
    const viewAllResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, div, span');
      let clicked = 0;
      
      for (const btn of buttons) {
        const text = (btn.innerText || btn.textContent || '').trim();
        if (text === '查看全部' || text === '查看更多' || text === '展开全部') {
          const style = window.getComputedStyle(btn);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              btn.click();
              clicked++;
            }
          }
        }
      }
      
      return clicked;
    });
    
    console.log('点击了 ' + viewAllResult + ' 个查看全部按钮');
    await page.waitForTimeout(3000);
    
    console.log('\n=== 展开所有可展开元素 ===');
    
    const expandResult = await page.evaluate(() => {
      let count = 0;
      const selectors = [
        '[class*="expand"]', '[class*="arrow"]', '[class*="toggle"]', 
        '[class*="chevron"]', 'svg[class*="arrow"]', 'svg[class*="chevron"]'
      ];
      
      const allElements = document.querySelectorAll(selectors.join(','));
      
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        
        try {
          el.click();
          count++;
        } catch(e) {}
      }
      
      return count;
    });
    
    console.log('尝试展开了 ' + expandResult + ' 个元素');
    await page.waitForTimeout(3000);
    
    console.log('\n=== 再次检查有数据的卡片 ===');
    
    const cardsAfter = await page.evaluate(() => {
      const cards = document.querySelectorAll('.fenshuxian-card');
      const results = [];
      
      cards.forEach((card, i) => {
        const text = card.innerText || '';
        const rect = card.getBoundingClientRect();
        const hasData = !text.includes('暂无相关数据') && text.length > 200;
        const className = card.className || '';
        
        if (hasData || className.includes('zhuanye')) {
          results.push({
            index: i,
            class: className.substring(0, 80),
            top: Math.round(rect.top),
            hasData: hasData,
            textLength: text.length,
            fullText: text,
          });
        }
      });
      
      return results;
    });
    
    console.log('有数据/专业区卡片: ' + cardsAfter.length);
    cardsAfter.forEach(c => {
      console.log('  [' + c.index + '] top=' + c.top + 
        (c.hasData ? ' ✅有数据' : ' ❌无数据') + 
        ' len=' + c.textLength);
      console.log('     class: ' + c.class);
      console.log('     全文:');
      console.log(c.fullText);
      console.log('');
    });
    
    console.log('\n测试完成！浏览器将在60秒后关闭。');
    await page.waitForTimeout(60000);
    
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
