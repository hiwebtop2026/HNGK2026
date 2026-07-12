import { chromium } from 'playwright';
import readline from 'readline';

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise(function(resolve) {
    rl.question(query, function(answer) {
      rl.close();
      resolve(answer);
    });
  });
}

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

  console.log('\n=== 步骤1: 点击"专业分数线"Tab ===');
  const tabs = page.locator('.qk-tabs-tab');
  const tabCount = await tabs.count();
  console.log('找到 ' + tabCount + ' 个Tab:');
  
  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const text = await tab.textContent();
    const className = await tab.getAttribute('class');
    console.log('  [' + i + '] ' + text + ' (class: ' + className + ')');
  }
  
  const tabIndex = await askQuestion('请输入要点击的Tab编号: ');
  const tabIdx = parseInt(tabIndex);
  if (tabIdx >= 0 && tabIdx < tabCount) {
    await tabs.nth(tabIdx).click();
    await page.waitForTimeout(2000);
    console.log('已点击第 ' + tabIdx + ' 个Tab');
  } else {
    console.log('无效的Tab编号');
  }

  console.log('\n=== 步骤2: 列出所有下拉按钮 ===');
  
  const allButtons = page.locator('button');
  const buttonCount = await allButtons.count();
  console.log('找到 ' + buttonCount + ' 个button元素');
  
  let btnIdx = 0;
  for (let i = 0; i < buttonCount; i++) {
    const btn = allButtons.nth(i);
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    
    if (text && text.trim() && (className && (className.includes('select') || className.includes('picker') || className.includes('tab')))) {
      console.log('  [' + btnIdx + '] 文本: "' + text.trim() + '" class: ' + className);
      btnIdx++;
    }
  }

  console.log('\n所有下拉选择器 (select-tabs-tab):');
  const selectTabs = page.locator('.select-tabs-tab');
  const selectCount = await selectTabs.count();
  console.log('找到 ' + selectCount + ' 个选择器按钮:');
  
  for (let i = 0; i < selectCount; i++) {
    const btn = selectTabs.nth(i);
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    console.log('  [' + i + '] 文本: "' + text.trim() + '"');
    console.log('      class: ' + className);
  }

  while (true) {
    const action = await askQuestion('\n请输入操作 (点击选择器编号 / s=截图 / h=HTML / q=退出): ');
    
    if (action === 'q') {
      break;
    } else if (action === 's') {
      await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });
      console.log('截图已保存为 debug_screenshot.png');
    } else if (action === 'h') {
      const html = await page.content();
      const fs = await import('fs');
      fs.writeFileSync('debug_page.html', html);
      console.log('HTML已保存为 debug_page.html');
    } else {
      const idx = parseInt(action);
      if (idx >= 0 && idx < selectCount) {
        console.log('正在点击第 ' + idx + ' 个选择器...');
        await selectTabs.nth(idx).click();
        await page.waitForTimeout(1500);
        
        console.log('\n点击后的选项:');
        const options = page.locator('.qk-picker-option, .qk-select-option, [class*="option"]');
        const optionCount = await options.count();
        console.log('找到 ' + optionCount + ' 个选项:');
        
        for (let j = 0; j < Math.min(optionCount, 20); j++) {
          const opt = options.nth(j);
          const text = await opt.textContent();
          if (text && text.trim()) {
            console.log('  [' + j + '] ' + text.trim());
          }
        }
        
        const optIdxStr = await askQuestion('\n请输入要选择的选项编号 (直接回车取消): ');
        if (optIdxStr) {
          const optIdx = parseInt(optIdxStr);
          if (optIdx >= 0 && optIdx < optionCount) {
            await options.nth(optIdx).click();
            await page.waitForTimeout(2000);
            console.log('已选择第 ' + optIdx + ' 个选项');
            
            const newText = await selectTabs.nth(idx).textContent();
            console.log('当前选择器文本: ' + newText.trim());
          }
        }
      } else {
        console.log('无效的编号');
      }
    }
  }

  console.log('调试完成，浏览器将保持打开状态...');
  console.log('按 Ctrl+C 退出');
  
  await new Promise(function() {});
}

main().catch(console.error);