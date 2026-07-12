import { chromium } from 'playwright';

async function clickByEvaluate(page, locator) {
  try {
    await locator.evaluate(function(el) { el.click(); });
    await page.waitForTimeout(800);
    return true;
  } catch (e) {
    return false;
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

  console.log('\n' + '='.repeat(70));
  console.log('步骤1: 收集所有下拉按钮信息');
  console.log('='.repeat(70));

  const allDropdowns = await page.evaluate(function() {
    const result = [];
    const buttons = document.querySelectorAll('button');
    
    let idx = 0;
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const className = btn.className || '';
      const text = btn.innerText || btn.textContent || '';
      
      if (className.includes('select-tabs-tab') || 
          className.includes('picker') || 
          className.includes('dropdown')) {
        
        let type = '未知';
        if (className.includes('chengshi')) type = '地区';
        else if (className.includes('nianfen')) type = '年份';
        else if (className.includes('pici')) type = '批次';
        else if (className.includes('kemu')) type = '科目';
        
        const parent = btn.closest('.select-tabs-overflow, .select-tabs');
        let groupPreview = '';
        if (parent) {
          groupPreview = parent.innerText.substring(0, 40).replace(/\n/g, ' ');
        }
        
        result.push({
          index: idx,
          buttonIndex: i,
          text: text.trim(),
          type: type,
          className: className,
          groupPreview: groupPreview,
        });
        idx++;
      }
    }
    
    return result;
  });

  console.log('共找到 ' + allDropdowns.length + ' 个下拉按钮:');
  allDropdowns.forEach(function(d) {
    console.log('  [' + d.index + '] ' + d.type + ': "' + d.text + '"');
    console.log('       组预览: ' + d.groupPreview);
  });

  console.log('\n' + '='.repeat(70));
  console.log('步骤2: 依次点击每个下拉按钮，展开并记录选项');
  console.log('='.repeat(70));

  const buttons = page.locator('button');
  const dropdownData = [];

  for (let di = 0; di < allDropdowns.length; di++) {
    const info = allDropdowns[di];
    const btn = buttons.nth(info.buttonIndex);
    
    console.log('\n--- [' + di + '] ' + info.type + ': ' + info.text + ' ---');
    
    try {
      await btn.evaluate(function(el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      await page.waitForTimeout(300);
      
      await clickByEvaluate(page, btn);
      await page.waitForTimeout(1500);
      
      const options = await page.evaluate(function() {
        const result = [];
        
        const pickerOptions = document.querySelectorAll('.qk-picker-option, .qk-select-option, [class*="option-item"], [class*="pick-item"], [class*="select-item"], [class*="picker-item"]');
        
        for (let i = 0; i < pickerOptions.length; i++) {
          const el = pickerOptions[i];
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          if (style.display !== 'none' && style.visibility !== 'hidden' && 
              rect.width > 5 && rect.height > 5 &&
              rect.top >= -10 && rect.top < window.innerHeight + 10) {
            const text = (el.innerText || el.textContent || '').trim();
            if (text && text.length < 30) {
              const hasValue = el.getAttribute('data-value') || el.getAttribute('value');
              result.push({
                optionIndex: i,
                text: text,
                value: hasValue || '',
              });
            }
          }
        }
        
        return result.slice(0, 20);
      });
      
      if (options.length > 0) {
        console.log('  选项 (' + options.length + ' 个):');
        options.forEach(function(opt, oi) {
          console.log('    [' + oi + '] ' + opt.text + (opt.value ? ' (' + opt.value + ')' : ''));
        });
      } else {
        console.log('  (未找到可见选项)');
      }
      
      dropdownData.push({
        index: di,
        type: info.type,
        currentText: info.text,
        options: options,
      });
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
    } catch (e) {
      console.log('  操作失败: ' + e.message);
      dropdownData.push({
        index: di,
        type: info.type,
        currentText: info.text,
        options: [],
        error: e.message,
      });
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('所有下拉框信息汇总');
  console.log('='.repeat(70));
  
  dropdownData.forEach(function(d) {
    console.log('\n[' + d.index + '] ' + d.type + ' (当前: ' + d.currentText + ')');
    if (d.options.length > 0) {
      console.log('    选项数: ' + d.options.length);
      d.options.forEach(function(o, i) {
        console.log('      [' + i + '] ' + o.text);
      });
    } else if (d.error) {
      console.log('    错误: ' + d.error);
    } else {
      console.log('    无选项');
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('调试完成！请告诉我应该分别点击哪几个下拉框');
  console.log('以及每个下拉框中选择第几个选项');
  console.log('='.repeat(70));
  
  await page.screenshot({ path: 'debug_all_dropdowns.png', fullPage: true });
  console.log('\n全屏截图已保存为 debug_all_dropdowns.png');
  
  await new Promise(function() {});
}

main().catch(console.error);