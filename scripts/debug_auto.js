import { chromium } from 'playwright';

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

  console.log('\n=== 步骤1: 点击第8个Tab (专业分数线) ===');
  const tabs = page.locator('.qk-tabs-tab');
  const tabCount = await tabs.count();
  console.log('Tab总数: ' + tabCount);
  
  if (tabCount > 8) {
    const tab8 = tabs.nth(8);
    const text = await tab8.textContent();
    console.log('第8个Tab文本: ' + text);
    
    await tab8.evaluate(function(el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(500);
    
    await clickElement(page, tab8);
    await page.waitForTimeout(2000);
    console.log('已点击第8个Tab');
  }

  console.log('\n=== 步骤2: 滚动并列出所有选择器组 ===');
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
        
        btnInfo.push({ text: btnText.trim(), type: type });
      }
      
      if (buttons.length > 0) {
        result.push({
          groupIndex: i,
          preview: text.substring(0, 60).replace(/\n/g, ' '),
          buttonCount: buttons.length,
          buttons: btnInfo,
        });
      }
    }
    
    return result;
  });

  console.log('找到 ' + selectGroups.length + ' 组选择器:');
  selectGroups.forEach(function(g, gi) {
    console.log('\n  【第 ' + gi + ' 组】 预览: ' + g.preview);
    g.buttons.forEach(function(b, bi) {
      console.log('    [' + bi + '] ' + b.type + ': ' + b.text);
    });
  });

  console.log('\n=== 步骤3: 逐个点击每组的每个选择器，查看选项 ===');
  
  for (let gi = 0; gi < selectGroups.length; gi++) {
    console.log('\n' + '='.repeat(60));
    console.log('【第 ' + gi + ' 组】 ' + selectGroups[gi].preview);
    console.log('='.repeat(60));
    
    const group = page.locator('.select-tabs-overflow').nth(gi);
    const buttons = group.locator('.select-tabs-tab');
    const btnCount = await buttons.count();
    
    for (let bi = 0; bi < btnCount; bi++) {
      const btn = buttons.nth(bi);
      const btnText = await btn.textContent();
      const btnType = selectGroups[gi].buttons[bi].type;
      
      console.log('\n  --- 点击 [' + bi + '] ' + btnType + ': ' + btnText.trim() + ' ---');
      
      try {
        await btn.evaluate(function(el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await page.waitForTimeout(300);
        
        await clickElement(page, btn);
        await page.waitForTimeout(1500);
        
        const options = await page.evaluate(function() {
          const result = [];
          const optEls = document.querySelectorAll('.qk-picker-option, .qk-select-option, [class*="option-item"], [class*="pick-item"], [class*="select-item"]');
          
          for (let i = 0; i < optEls.length; i++) {
            const el = optEls[i];
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            if (style.display !== 'none' && style.visibility !== 'hidden' && 
                rect.width > 0 && rect.height > 0 &&
                rect.top >= 0 && rect.top < window.innerHeight) {
              const text = el.innerText || el.textContent || '';
              if (text && text.trim() && text.trim().length < 30) {
                result.push(text.trim());
              }
            }
          }
          
          return result.slice(0, 15);
        });
        
        if (options.length > 0) {
          console.log('    选项 (' + options.length + ' 个):');
          options.forEach(function(opt, oi) {
            console.log('      [' + oi + '] ' + opt);
          });
        } else {
          console.log('    (未找到可见选项)');
        }
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
      } catch (e) {
        console.log('    点击失败: ' + e.message);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('调试完成！');
  console.log('请告诉我应该使用第几组选择器，以及每个选择器对应什么操作');
  console.log('浏览器将保持打开状态');
  console.log('='.repeat(60));
  
  await page.screenshot({ path: 'debug_final.png', fullPage: true });
  console.log('\n全屏截图已保存为 debug_final.png');
  
  await new Promise(function() {});
}

main().catch(console.error);