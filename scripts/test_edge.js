import { chromium } from 'playwright';

async function main() {
  console.log('1. 开始测试Playwright Edge浏览器启动...');
  
  try {
    console.log('2. 尝试启动Edge浏览器...');
    
    const browser = await chromium.launch({
      channel: 'msedge',
      headless: false,
      args: ['--start-maximized', '--disable-infobars']
    });
    
    console.log('3. Edge浏览器启动成功！');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('4. 创建页面成功！');
    
    await page.goto('https://www.baidu.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('5. 页面加载成功！');
    
    const title = await page.title();
    console.log('6. 页面标题:', title);
    
    await page.waitForTimeout(3000);
    
    await browser.close();
    console.log('7. 测试完成！');
    
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
    console.error(e.stack);
  }
}

main();
