/**
 * Playwright 最小测试脚本
 */

import { chromium } from 'playwright';

async function main() {
  console.log('测试 Playwright 启动...');
  
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'C:\\Users\\lhp\\AppData\\Local\\Microsoft\\Edge\\User Data';
  
  console.log(`Edge路径: ${edgePath}`);
  console.log(`用户数据目录: ${userDataDir}`);
  console.log(`userDataDir 类型: ${typeof userDataDir}`);
  console.log(`userDataDir 是字符串: ${typeof userDataDir === 'string'}`);
  
  try {
    console.log('\n尝试 launchPersistentContext...');
    const { context, page } = await chromium.launchPersistentContext({
      executablePath: edgePath,
      userDataDir: userDataDir,
      headless: false
    });
    
    console.log('✅ 浏览器启动成功!');
    
    await page.goto('https://www.baidu.com');
    console.log('✅ 页面加载成功!');
    
    await page.close();
    await context.close();
    
    console.log('\n测试完成!');
  } catch (e) {
    console.log(`❌ 错误: ${e.message}`);
    console.log(`错误类型: ${e.constructor.name}`);
    
    // 检查是否是路径问题
    if (e.message.includes('path')) {
      console.log('\n路径相关错误，请检查:');
      console.log('1. Edge浏览器路径是否正确');
      console.log('2. 用户数据目录是否存在');
    }
  }
}

main().catch(console.error);
