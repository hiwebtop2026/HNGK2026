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

  // 点击最后一个专业分数线Tab（索引23）
  await page.evaluate(function() {
    const tabs = document.querySelectorAll('.qk-tabs-tab');
    if (tabs[23]) {
      tabs[23].scrollIntoView({ behavior: 'smooth', block: 'center' });
      tabs[23].click();
    }
  });
  await page.waitForTimeout(3000);
  console.log('已点击第23个Tab (专业分数线)');

  console.log('\n' + '='.repeat(70));
  console.log('步骤2: 查找专业分数线区域的下拉按钮');
  console.log('='.repeat(70));

  // 找到专业分数线区域的下拉按钮组（应该是第16-19个，top=507左右）
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
      
      // 只收集"专业分数线"区域的按钮（科目为"请选择"的那组）
      if (visible && (type === '科目' && text.includes('请选择'))) {
        // 找到这一组的所有按钮
        const parent = btn.closest('.select-tabs-overflow');
        if (parent) {
          const groupButtons = parent.querySelectorAll('button.select-tabs-tab');
          for (let j = 0; j < groupButtons.length; j++) {
            const gBtn = groupButtons[j];
            const gClassName = gBtn.className || '';
            const gText = gBtn.innerText || gBtn.textContent || '';
            const gRect = gBtn.getBoundingClientRect();
            
            let gType = '未知';
            if (gClassName.includes('chengshi')) gType = '地区';
            else if (gClassName.includes('nianfen')) gType = '年份';
            else if (gClassName.includes('pici')) gType = '批次';
            else if (gClassName.includes('kemu')) gType = '科目';
            
            result.push({
              index: j,
              text: gText.trim(),
              type: gType,
              top: Math.round(gRect.top),
              buttonElement: null, // 不能传递DOM元素
            });
          }
          break;
        }
      }
    }
    
    return result;
  });

  console.log('专业分数线区域的下拉按钮:');
  dropdowns.forEach(function(d) {
    console.log('  [' + d.index + '] ' + d.type + ': "' + d.text + '" (top=' + d.top + ')');
  });

  console.log('\n' + '='.repeat(70));
  console.log('步骤3: 交互式调试 - 请告诉我点击哪个按钮');
  console.log('='.repeat(70));

  // 现在使用Playwright的原生click方法（而非evaluate中的click）
  // 先重新定位到专业分数线区域
  await page.evaluate(function() {
    const buttons = document.querySelectorAll('button.select-tabs-tab');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const text = btn.innerText || '';
      const className = btn.className || '';
      if (className.includes('kemu') && text.includes('请选择')) {
        const parent = btn.closest('.select-tabs-overflow');
        if (parent) {
          parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }
  });
  await page.waitForTimeout(1000);

  // 获取专业分数线区域的下拉按钮组在DOM中的位置
  const targetGroupInfo = await page.evaluate(function() {
    const buttons = document.querySelectorAll('button.select-tabs-tab');
    
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const text = btn.innerText || '';
      const className = btn.className || '';
      
      if (className.includes('kemu') && text.includes('请选择')) {
        const parent = btn.closest('.select-tabs-overflow');
        if (parent) {
          const groupButtons = parent.querySelectorAll('button.select-tabs-tab');
          const indices = [];
          for (let j = 0; j < groupButtons.length; j++) {
            // 找到每个按钮在所有buttons中的索引
            for (let k = 0; k < buttons.length; k++) {
              if (buttons[k] === groupButtons[j]) {
                indices.push(k);
                break;
              }
            }
          }
          return { found: true, indices: indices, parentText: parent.innerText.substring(0, 50) };
        }
      }
    }
    return { found: false };
  });

  console.log('目标按钮组信息:', JSON.stringify(targetGroupInfo));

  if (targetGroupInfo.found) {
    const indices = targetGroupInfo.indices;
    console.log('专业分数线区域的按钮全局索引:', indices);
    
    // 依次点击每个按钮并等待弹出
    for (let i = 0; i < indices.length; i++) {
      const globalIdx = indices[i];
      console.log('\n--- 点击第 ' + i + ' 个按钮 (全局索引=' + globalIdx + ') ---');
      
      const btn = page.locator('button.select-tabs-tab').nth(globalIdx);
      
      // 使用Playwright的click方法（带force选项）
      try {
        await btn.click({ force: true, timeout: 5000 });
        console.log('  已点击');
      } catch (e) {
        console.log('  click失败: ' + e.message.substring(0, 100));
        // 尝试使用evaluate点击
        await page.evaluate(function(idx) {
          const buttons = document.querySelectorAll('button.select-tabs-tab');
          if (buttons[idx]) {
            buttons[idx].click();
          }
        }, globalIdx);
        console.log('  使用evaluate点击');
      }
      
      await page.waitForTimeout(2000);
      
      // 截图
      const screenshotPath = 'debug_btn_' + i + '.png';
      await page.screenshot({ path: screenshotPath });
      console.log('  截图已保存: ' + screenshotPath);
      
      // 查找弹出的下拉选项 - 使用更精确的选择器
      const options = await page.evaluate(function() {
        const result = [];
        
        // 查找所有可见的弹出层
        const popups = document.querySelectorAll('[class*="picker"], [class*="popup"], [class*="dropdown"], [class*="overlay"]');
        
        for (let p = 0; p < popups.length; p++) {
          const popup = popups[p];
          const style = window.getComputedStyle(popup);
          const rect = popup.getBoundingClientRect();
          
          if (style.display !== 'none' && style.visibility !== 'hidden' && 
              rect.width > 50 && rect.height > 50) {
            // 在弹出层中查找选项
            const optEls = popup.querySelectorAll('div, span, li, button');
            for (let i = 0; i < optEls.length; i++) {
              const el = optEls[i];
              const elStyle = window.getComputedStyle(el);
              const elRect = el.getBoundingClientRect();
              
              if (elStyle.display !== 'none' && elStyle.visibility !== 'hidden' && 
                  elRect.width > 30 && elRect.height > 10 && elRect.height < 60) {
                const text = (el.innerText || el.textContent || '').trim();
                if (text && text.length > 0 && text.length < 30 && 
                    !text.includes('专业') && !text.includes('分数线')) {
                  result.push({ text: text, className: el.className });
                }
              }
            }
          }
        }
        
        // 去重
        const seen = {};
        const unique = [];
        for (let i = 0; i < result.length; i++) {
          if (!seen[result[i].text]) {
            seen[result[i].text] = true;
            unique.push(result[i]);
          }
        }
        
        return unique.slice(0, 20);
      });
      
      if (options.length > 0) {
        console.log('  弹出的选项 (' + options.length + ' 个):');
        options.forEach(function(opt, oi) {
          console.log('    [' + oi + '] ' + opt.text);
        });
      } else {
        console.log('  (未找到弹出选项)');
      }
      
      // 按Escape关闭
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('调试完成！');
  console.log('请查看截图和输出，告诉我应该点击哪几个下拉按钮');
  console.log('='.repeat(70));
  
  console.log('\n浏览器保持打开状态，按 Ctrl+C 退出');
  await new Promise(function() {});
}

main().catch(console.error);