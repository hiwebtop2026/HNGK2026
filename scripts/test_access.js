import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  console.log('启动Chrome浏览器测试...');
  
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
    console.log('✅ 页面加载成功！');
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    console.log('页面标题:', title);
    
    console.log('\n等待10秒，让页面完全加载...');
    await page.waitForTimeout(10000);
    
    console.log('\n=== 页面内容预览 (前2000字符) ===');
    const bodyText = await page.evaluate(() => document.body.innerText || '');
    console.log(bodyText.substring(0, 2000));
    
    console.log('\n\n=== 查找专业分数线相关区域 ===');
    const sectionInfo = await page.evaluate(() => {
      const results = [];
      
      const zhuanyeCards = document.querySelectorAll('[class*="zhuanye"], [class*="fenshuxian"]');
      zhuanyeCards.forEach((el, i) => {
        const cls = el.className || '';
        const text = (el.innerText || '').substring(0, 100);
        const style = window.getComputedStyle(el);
        results.push({
          index: i,
          class: cls.substring(0, 80),
          visible: style.display !== 'none' && style.visibility !== 'hidden',
          text: text.replace(/\n/g, ' | ').substring(0, 100)
        });
      });
      
      return results;
    });
    
    console.log('找到 ' + sectionInfo.length + ' 个相关区域:');
    sectionInfo.forEach(s => {
      console.log('  [' + s.index + '] ' + (s.visible ? '✅可见' : '❌隐藏') + ' ' + s.class);
      console.log('      内容: ' + s.text);
    });
    
    console.log('\n\n=== 查找下拉选择器 ===');
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
        while (parent && parentClass.length < 200) {
          parentClass += (parent.className || '') + ' ';
          parent = parent.parentElement;
        }
        
        results.push({
          containerIndex: ci,
          visible: visible,
          top: Math.round(rect.top),
          buttons: btnTexts,
          hasZhuanyeParent: parentClass.includes('zhuanye') || parentClass.includes('fenshuxian'),
        });
      });
      
      return results;
    });
    
    console.log('找到 ' + dropdownInfo.length + ' 个下拉容器:');
    dropdownInfo.forEach(d => {
      console.log('  容器[' + d.containerIndex + '] ' + (d.visible ? '✅可见' : '❌隐藏') + 
        ' top=' + d.top + 
        (d.hasZhuanyeParent ? ' 专业区' : ''));
      console.log('    按钮: [' + d.buttons.join(', ') + ']');
    });
    
    console.log('\n\n测试完成！浏览器将在30秒后关闭。');
    console.log('请观察页面是否正常显示了专业分数线数据。');
    
    await page.waitForTimeout(30000);
    
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
    console.error('错误详情:', e);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
