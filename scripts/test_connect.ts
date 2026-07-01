/**
 * Playwright 连接测试 - 备选方案
 */

import { chromium } from 'playwright';

async function main() {
  console.log('测试备选连接方案...\n');
  
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  // 方案1: 使用 launchServer
  console.log('1. 尝试 launchServer...');
  try {
    const server = await chromium.launchServer({
      executablePath: edgePath,
      port: 9223,
      headless: false
    });
    console.log(`✅ launchServer 成功! ws://127.0.0.1:${server.wsEndpoint().split(':')[2]}`);
    await server.kill();
    console.log('   已关闭');
  } catch (e: any) {
    console.log(`❌ launchServer 失败: ${e.message}`);
  }
  
  // 方案2: 直接启动浏览器并附加
  console.log('\n2. 尝试直接启动并使用...');
  try {
    const browser = await chromium.launch({
      executablePath: edgePath,
      headless: false,
      args: ['--remote-debugging-port=9224']
    });
    console.log('✅ 浏览器启动成功!');
    
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.baidu.com');
    console.log(`   页面加载: ${page.url()}`);
    
    await browser.close();
    console.log('✅ 测试完成!');
  } catch (e: any) {
    console.log(`❌ 启动失败: ${e.message}`);
  }
}

main().catch(console.error);
