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
  
  console.log('正在启动Chrome浏览器...');
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
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  console.log('\n' + '='.repeat(70));
  console.log('步骤1: 查找并点击"专业分数线"Tab');
  console.log('='.repeat(70));

  const tabInfo = await page.evaluate(function() {
    const tabs = document.querySelectorAll('.qk-tabs-tab');
    const result = [];
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const text = tab.innerText || tab.textContent || '';
      if (text.includes('专业分数线')) {
        result.push({ index: i, text: text.trim(), className: tab.className });
      }
    }
    return result;
  });
  
  console.log('找到 ' + tabInfo.length + ' 个"专业分数线"Tab:');
  tabInfo.forEach(function(t, i) {
    console.log('  [' + i + '] 索引=' + t.index + ', 文本=' + t.text);
  });

  // 点击最后一个专业分数线Tab
  if (tabInfo.length > 0) {
    const lastTab = tabInfo[tabInfo.length - 1];
    console.log('\n点击最后一个专业分数线Tab (索引=' + lastTab.index + ')');
    
    await page.evaluate(function(idx) {
      const tabs = document.querySelectorAll('.qk-tabs-tab');
      if (tabs[idx]) {
        tabs[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        tabs[idx].click();
      }
    }, lastTab.index);
    
    await page.waitForTimeout(3000);
    console.log('已点击');
  }

  console.log('\n' + '='.repeat(70));
  console.log('步骤2: 查找所有可见的下拉按钮');
  console.log('='.repeat(70));

  const dropdowns = await page.evaluate(function() {
    const buttons = document.querySelectorAll('button.select-tabs-tab');
    const result = [];
    
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const text = btn.innerText || btn.textContent || '';
      const className = btn.className || '';
      const rect = btn.getBoundingClientRect();
      
      let type = '未知';
      if (className.includes('chengshi')) type = '地区';
      else if (className.includes('nianfen')) type = '年份';
      else if (className.includes('pici')) type = '批次';
      else if (className.includes('kemu')) type = '科目';
      
      const visible = rect.top >= 0 && rect.top < window.innerHeight && rect.width > 0;
      
      result.push({
        index: i,
        text: text.trim(),
        type: type,
        visible: visible,
        top: Math.round(rect.top),
      });
    }
    
    return result;
  });

  console.log('共找到 ' + dropdowns.length + ' 个下拉按钮:');
  console.log('\n可见的下拉按钮:');
  dropdowns.filter(function(d) { return d.visible; }).forEach(function(d) {
    console.log('  [' + d.index + '] ' + d.type + ': "' + d.text + '" (top=' + d.top + ')');
  });

  console.log('\n' + '='.repeat(70));
  console.log('步骤3: 依次点击可见的下拉按钮，展开并记录选项');
  console.log('='.repeat(70));

  const visibleDropdowns = dropdowns.filter(function(d) { return d.visible; });
  
  for (let di = 0; di < visibleDropdowns.length; di++) {
    const info = visibleDropdowns[di];
    console.log('\n--- 点击 [' + info.index + '] ' + info.type + ': ' + info.text + ' ---');
    
    try {
      // 点击按钮
      await page.evaluate(function(idx) {
        const buttons = document.querySelectorAll('button.select-tabs-tab');
        const btn = buttons[idx];
        if (btn) {
          btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function() {
            btn.click();
          }, 300);
        }
      }, info.index);
      
      await page.waitForTimeout(2000);
      
      // 收集所有可见的弹出选项
      const options = await page.evaluate(function() {
        const result = [];
        
        // 查找所有可能的选项元素
        const selectors = [
          '.qk-picker-option',
          '.qk-select-option',
          '[class*="option-item"]',
          '[class*="pick-item"]',
          '[class*="picker-item"]',
          '[class*="select-item"]',
          '[class*="dropdown-item"]',
          '[class*="list-item"]',
          '[role="option"]',
          '[role="listbox"] [role="option"]',
        ];
        
        const seen = {};
        
        for (let s = 0; s < selectors.length; s++) {
          const els = document.querySelectorAll(selectors[s]);
          for (let i = 0; i < els.length; i++) {
            const el = els[i];
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            if (style.display !== 'none' && style.visibility !== 'hidden' && 
                rect.width > 5 && rect.height > 5 &&
                rect.top >= -10 && rect.top < window.innerHeight + 10) {
              const text = (el.innerText || el.textContent || '').trim();
              if (text && text.length < 50 && !seen[text]) {
                seen[text] = true;
                result.push({
                  text: text,
                  top: Math.round(rect.top),
                  className: el.className,
                });
              }
            }
          }
        }
        
        return result.slice(0, 25);
      });
      
      if (options.length > 0) {
        console.log('  选项 (' + options.length + ' 个):');
        options.forEach(function(opt, oi) {
          console.log('    [' + oi + '] ' + opt.text + ' (class: ' + opt.className + ')');
        });
      } else {
        // 备用：查找所有可见的新出现的元素
        const allVisible = await page.evaluate(function() {
          const result = [];
          const allEls = document.querySelectorAll('div, span, li, button, a');
          for (let i = 0; i < allEls.length; i++) {
            const el = allEls[i];
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const text = (el.innerText || el.textContent || '').trim();
            
            if (style.display !== 'none' && style.visibility !== 'hidden' && 
                rect.width > 30 && rect.height > 15 && rect.height < 50 &&
                rect.top >= window.innerHeight / 2 && rect.top < window.innerHeight &&
                text.length > 0 && text.length < 20 && 
                !text.includes('北京') && !text.includes('2025') && 
                !text.includes('本科批') && !text.includes('综合') &&
                !text.includes('请选择') && !text.includes('专业分数线') &&
                !text.includes('录取分数线') && !text.includes('招生') &&
                !text.includes('查看') && !text.includes('学校')) {
              result.push({ text: text, top: Math.round(rect.top), className: el.className });
            }
          }
          return result.slice(0, 20);
        });
        
        if (allVisible.length > 0) {
          console.log('  可见的候选元素 (' + allVisible.length + ' 个):');
          allVisible.forEach(function(el, i) {
            console.log('    [' + i + '] ' + el.text + ' (top=' + el.top + ', class: ' + el.className + ')');
          });
        } else {
          console.log('  (未找到可见选项)');
        }
      }
      
      // 按Escape关闭
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
      
    } catch (e) {
      console.log('  操作失败: ' + e.message);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('调试完成！');
  console.log('请查看上面的输出，告诉我应该点击哪几个下拉按钮');
  console.log('以及每个下拉按钮中选择哪个选项');
  console.log('='.repeat(70));
  
  await page.screenshot({ path: 'debug_chrome_final.png', fullPage: true });
  console.log('\n全屏截图已保存为 debug_chrome_final.png');
  
  console.log('\n浏览器保持打开状态，按 Ctrl+C 退出');
  await new Promise(function() {});
}

main().catch(console.error);