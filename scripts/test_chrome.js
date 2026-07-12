import { chromium } from 'playwright';

async function main() {
  console.log('1. 开始测试Playwright Chrome浏览器启动...');
  
  try {
    console.log('2. 尝试启动Chrome浏览器...');
    
    const userDataDir = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\User Data Playwright';
    const browserPath = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
    
    console.log('   - 用户数据目录:', userDataDir);
    console.log('   - 浏览器路径:', browserPath);
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: browserPath,
      headless: false,
      viewport: null,
      args: ['--start-maximized', '--disable-infobars'],
    });
    
    console.log('3. Chrome浏览器启动成功！');
    
    const page = context.pages()[0] || await context.newPage();
    
    console.log('4. 创建页面成功！');
    
    await page.goto('https://www.baidu.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('5. 页面加载成功！');
    
    const title = await page.title();
    console.log('6. 页面标题:', title);
    
    await page.waitForTimeout(3000);
    
    await context.close();
    console.log('7. 测试完成！');
    
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
    console.error(e.stack);
  }
}

main();
