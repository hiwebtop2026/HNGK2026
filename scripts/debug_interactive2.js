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

async function scrollToElement(page, selector) {
  try {
    await page.evaluate(function(sel) {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, selector);
    await page.waitForTimeout(1000);
    return true;
  } catch (e) {
    return false;
  }
}

async function clickElement(page, locator) {
  try {
    await locator.click({ timeout: 5000 });
    return true;
  } catch (e) {
    try {
      await locator.evaluate(function(el) { el.click(); });
      await page.waitForTimeout(500);
      return true;
    } catch (e2) {
      return false;
    }
  }
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

  console.log('\n=== 步骤1: 列出所有"专业分数线"Tab ===');
  const tabs = page.locator('.qk-tabs-tab');
  const tabCount = await tabs.count();
  
  const majorTabs = [];
  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const text = await tab.textContent();
    if (text && text.includes('专业分数线')) {
      const className = await tab.getAttribute('class');
      majorTabs.push({ index: i, text: text, className: className });
      console.log('  [' + majorTabs.length - 1 + '] 索引=' + i + ', 文本=' + text);
    }
  }
  
  const tabChoice = await askQuestion('\n请输入要点击的"专业分数线"Tab编号 (0,1,...): ');
  const tabIdx = parseInt(tabChoice);
  
  if (tabIdx >= 0 && tabIdx < majorTabs.length) {
    const realIndex = majorTabs[tabIdx].index;
    console.log('正在点击第 ' + realIndex + ' 个Tab (' + majorTabs[tabIdx].text + ')...');
    await clickElement(page, tabs.nth(realIndex));
    await page.waitForTimeout(2000);
    console.log('已点击');
  }

  console.log('\n=== 步骤2: 滚动到专业分数线区域 ===');
  await page.evaluate(function() {
    const cards = document.querySelectorAll('.fenshuxian-card');
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.innerText && card.innerText.includes('专业分数线')) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  });
  await page.waitForTimeout(2000);

  console.log('\n=== 步骤3: 列出专业分数线区域的选择器 ===');
  const selectGroups = await page.evaluate(function() {
    const result = [];
    const groups = document.querySelectorAll('.select-tabs-overflow');
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const text = group.innerText || '';
      
      const buttons = group.querySelectorAll('.select-tabs-tab');
      const btnInfo = [];
      for (let j = 0; j < buttons.length; j++) {
        const btn = buttons[j];
        const btnText = btn.innerText || '';
        const className = btn.className || '';
        
        let type = '未知';
        if (className.includes('chengshi')) type = '地区';
        else if (className.includes('nianfen')) type = '年份';
        else if (className.includes('pici')) type = '批次';
        else if (className.includes('kemu')) type = '科目';
        
        btnInfo.push({ text: btnText.trim(), type: type, className: className });
      }
      
      if (buttons.length > 0) {
        result.push({
          groupIndex: i,
          preview: text.substring(0, 50),
          buttons: btnInfo,
        });
      }
    }
    
    return result;
  });

  console.log('找到 ' + selectGroups.length + ' 组选择器:');
  selectGroups.forEach(function(g, gi) {
    console.log('\n  第 ' + gi + ' 组 (预览: ' + g.preview + ')');
    g.buttons.forEach(function(b, bi) {
      console.log('    [' + bi + '] ' + b.type + ': ' + b.text);
    });
  });

  const groupChoice = await askQuestion('\n请输入要操作的选择器组编号: ');
  const groupIdx = parseInt(groupChoice);
  
  if (groupIdx >= 0 && groupIdx < selectGroups.length) {
    console.log('\n=== 步骤4: 操作第 ' + groupIdx + ' 组选择器 ===');
    
    const group = selectGroups[groupIdx];
    const groupSelector = '.select-tabs-overflow';
    
    const selectButtons = page.locator(groupSelector).nth(groupIdx).locator('.select-tabs-tab');
    const btnCount = await selectButtons.count();
    
    while (true) {
      console.log('\n--- 第 ' + groupIdx + ' 组选择器 ---');
      for (let i = 0; i < btnCount; i++) {
        const btn = selectButtons.nth(i);
        const text = await btn.textContent();
        console.log('  [' + i + '] ' + group.buttons[i].type + ': ' + text.trim());
      }
      
      const action = await askQuestion('\n输入按钮编号点击选项 / s=截图 / q=返回: ');
      
      if (action === 'q') {
        break;
      } else if (action === 's') {
        await page.screenshot({ path: 'debug_selectors.png' });
        console.log('截图已保存');
      } else {
        const btnIdx = parseInt(action);
        if (btnIdx >= 0 && btnIdx < btnCount) {
          console.log('正在点击第 ' + btnIdx + ' 个按钮...');
          
          await selectButtons.nth(btnIdx).evaluate(function(el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          await page.waitForTimeout(500);
          
          await clickElement(page, selectButtons.nth(btnIdx));
          await page.waitForTimeout(1500);
          
          console.log('\n弹出的选项:');
          const options = page.locator('.qk-picker-option, .qk-select-option, [class*="option-item"], [class*="pick-item"]');
          const optionCount = await options.count();
          
          const visibleOptions = [];
          for (let j = 0; j < optionCount; j++) {
            const opt = options.nth(j);
            const isVisible = await opt.isVisible().catch(() => false);
            if (isVisible) {
              const optText = await opt.textContent();
              if (optText && optText.trim()) {
                visibleOptions.push({ index: j, text: optText.trim() });
              }
            }
          }
          
          console.log('可见选项数量: ' + visibleOptions.length);
          visibleOptions.forEach(function(o) {
            console.log('  [' + o.index + '] ' + o.text);
          });
          
          if (visibleOptions.length > 0) {
            const optChoice = await askQuestion('\n输入选项编号选择 (直接回车取消): ');
            if (optChoice) {
              const optIdx = parseInt(optChoice);
              const found = visibleOptions.find(function(o) { return o.index === optIdx; });
              if (found) {
                console.log('正在选择: ' + found.text);
                await clickElement(page, options.nth(optIdx));
                await page.waitForTimeout(2000);
                
                const newText = await selectButtons.nth(btnIdx).textContent();
                console.log('选择后按钮文本: ' + newText.trim());
              }
            }
          }
          
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    }
  }

  console.log('\n调试结束，浏览器保持打开状态');
  console.log('请告诉我应该用第几组选择器，以及每个选择器的操作方式');
  console.log('按 Ctrl+C 退出');
  
  await new Promise(function() {});
}

main().catch(console.error);