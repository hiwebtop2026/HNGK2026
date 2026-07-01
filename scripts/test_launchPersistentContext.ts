/**
 * Playwright launchPersistentContext 测试 - 完整版
 */

import { chromium } from 'playwright';

async function main() {
  console.log('测试 launchPersistentContext...\n');
  
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const debugProfileDir = 'C:\\Users\\lhp\\AppData\\Local\\Microsoft\\Edge\\DebugProfile';
  
  try {
    console.log('1. 启动浏览器...');
    const browserContext = await chromium.launchPersistentContext(debugProfileDir, {
      executablePath: edgePath,
      headless: false
    });
    
    console.log(`   键: ${Object.keys(browserContext).filter(k => k.startsWith('_')).join(', ')}`);
    
    // 获取 pages
    const pages = browserContext._pages;
    console.log(`   _pages 数量: ${pages?.length || 0}`);
    
    // 获取 page
    let page: any;
    if (pages && pages.length > 0) {
      page = pages[0];
    } else {
      // 创建新页面
      page = await browserContext.newPage();
    }
    
    console.log('\n2. 测试页面操作...');
    await page.goto('https://www.baidu.com');
    console.log(`   页面URL: ${page.url()}`);
    
    console.log('\n3. 关闭...');
    await page.close();
    await browserContext.close();
    
    console.log('\n✅ 测试成功!');
  } catch (e: any) {
    console.log(`\n❌ 失败: ${e.message}`);
  }
}

main().catch(console.error);
