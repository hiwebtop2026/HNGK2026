/**
 * Playwright launch 测试脚本
 */

import { chromium } from 'playwright';

async function main() {
  console.log('测试 Playwright launch...');
  
  try {
    console.log('\n1. 测试 launch...');
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: false
    });
    
    console.log('✅ 浏览器启动成功!');
    
    const page = await browser.newPage();
    await page.goto('https://www.baidu.com');
    console.log('✅ 页面加载成功!');
    
    await page.close();
    await browser.close();
    
    console.log('\n测试完成!');
  } catch (e: any) {
    console.log(`\n❌ 错误: ${e.message}`);
  }
}

main().catch(console.error);
