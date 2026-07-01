/**
 * Playwright 极简测试脚本
 */

import { chromium } from 'playwright';

async function main() {
  console.log('测试 Playwright 极简模式...');
  
  try {
    console.log('1. 检查 chromium 类型...');
    console.log(`   chromium 类型: ${typeof chromium}`);
    console.log(`   chromium.launchPersistentContext 类型: ${typeof chromium.launchPersistentContext}`);
    
    console.log('\n2. 测试 launchPersistentContext (只用必需参数)...');
    
    const result = await chromium.launchPersistentContext(
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      {
        userDataDir: 'C:\\Users\\lhp\\AppData\\Local\\Microsoft\\Edge\\User Data',
        headless: false
      }
    );
    
    console.log('✅ 浏览器启动成功!');
    
    const page = result.context.pages()[0] || await result.context.newPage();
    await page.goto('https://www.baidu.com');
    console.log('✅ 页面加载成功!');
    
    await page.close();
    await result.context.close();
    
    console.log('\n测试完成!');
  } catch (e: any) {
    console.log(`\n❌ 错误: ${e.message}`);
    
    // 检查堆栈
    if (e.stack) {
      console.log('\n堆栈信息:');
      const lines = e.stack.split('\n').slice(0, 5);
      lines.forEach((l: string) => console.log('  ' + l));
    }
  }
}

main().catch(console.error);
