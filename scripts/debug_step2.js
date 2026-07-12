import { chromium } from 'playwright';

async function main() {
  const browserPath = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
  
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.101 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: null,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  const schoolName = '安徽财经大学';
  const url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent(schoolName) + '&q=' + encodeURIComponent(schoolName) +
    '&uc_biz_str=qk_enable_gesture:true%7COPT:W_ENTER_ANI@1%7COPT:TOOLBAR_STYLE@0%7COPT:W_PAGE_REFRESH@0%7COPT:BACK_BTN_STYLE@0%7COPT:IMMERSIVE@1%7COPT%3AW_PAGE_REFRESH%400&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp';

  console.log('正在访问页面...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('\n=== 步骤1: 点击第23个Tab (专业分数线) ===');
  const tabs = page.locator('.qk-tabs-tab');
  const tabCount = await tabs.count();
  console.log('Tab总数: ' + tabCount);
  
  if (tabCount > 23) {
    const tab23 = tabs.nth(23);
    const text = await tab23.textContent();
    console.log('第23个Tab文本: ' + text);
    await tab23.click();
    await page.waitForTimeout(2000);
    console.log('已点击第23个Tab');
  }

  console.log('\n=== 步骤2: 列出所有选择器按钮 (.select-tabs-tab) ===');
  const selectTabs = page.locator('.select-tabs-tab');
  const selectCount = await selectTabs.count();
  console.log('找到 ' + selectCount + ' 个选择器按钮:');
  
  for (let i = 0; i < selectCount; i++) {
    const btn = selectTabs.nth(i);
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    
    let type = '';
    if (className.includes('chengshi')) type = '城市/地区';
    else if (className.includes('nianfen')) type = '年份';
    else if (className.includes('pici')) type = '批次';
    else if (className.includes('kemu')) type = '科目';
    
    console.log('  [' + i + '] 文本: "' + text.trim() + '"');
    console.log('      类型: ' + type);
    console.log('      class: ' + className);
  }

  console.log('\n=== 步骤3: 按顺序点击每个选择器，查看选项 ===');
  
  for (let i = 0; i < selectCount; i++) {
    const btn = selectTabs.nth(i);
    const text = await btn.textContent();
    console.log('\n--- 点击第 ' + i + ' 个选择器: ' + text.trim() + ' ---');
    
    try {
      await btn.click();
      await page.waitForTimeout(1500);
      
      const options = page.locator('.qk-picker-option, .qk-select-option, [class*="option"]');
      const optionCount = await options.count();
      console.log('  选项数量: ' + optionCount);
      
      for (let j = 0; j < Math.min(optionCount, 15); j++) {
        const opt = options.nth(j);
        const optText = await opt.textContent();
        if (optText && optText.trim()) {
          console.log('    [' + j + '] ' + optText.trim());
        }
      }
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
    } catch (e) {
      console.log('  点击失败: ' + e.message);
    }
  }

  console.log('\n=== 调试完成，浏览器将保持打开 ===');
  console.log('请查看输出，告诉我应该使用第几个选择器（地区、年份、批次）');
  console.log('以及每个选择器中应该选择第几个选项');
  
  await page.screenshot({ path: 'debug_after_tabs.png', fullPage: true });
  console.log('\n截图已保存为 debug_after_tabs.png');
  
  await new Promise(function() {});
}

main().catch(console.error);