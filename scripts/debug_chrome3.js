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

  // 点击专业分数线Tab
  console.log('点击专业分数线Tab...');
  await page.evaluate(function() {
    const tabs = document.querySelectorAll('.qk-tabs-tab');
    if (tabs[23]) {
      tabs[23].scrollIntoView({ behavior: 'smooth', block: 'center' });
      tabs[23].click();
    }
  });
  await page.waitForTimeout(3000);

  // 查找所有专业分数线区域的select-tabs容器
  console.log('\n=== 查找专业分数线区域的select-tabs-overflow容器 ===');
  
  const containers = await page.evaluate(function() {
    const result = [];
    const groups = document.querySelectorAll('.select-tabs-overflow');
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const rect = group.getBoundingClientRect();
      const style = window.getComputedStyle(group);
      const text = group.innerText.substring(0, 80).replace(/\n/g, ' ');
      
      // 检查可见性
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && 
                      rect.width > 0 && rect.height > 0 &&
                      rect.top >= 0 && rect.top < window.innerHeight;
      
      result.push({
        index: i,
        text: text,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: visible,
        display: style.display,
        visibility: style.visibility,
        parentClass: group.parentElement ? group.parentElement.className : '',
      });
    }
    
    return result;
  });

  console.log('共找到 ' + containers.length + ' 个select-tabs-overflow容器:');
  containers.forEach(function(c) {
    console.log('  [' + c.index + '] visible=' + c.visible + ' top=' + c.top + ' text="' + c.text + '"');
    console.log('       display=' + c.display + ' visibility=' + c.visibility + ' parent=' + c.parentClass);
  });

  // 找到专业分数线区域的容器（包含"请选择"的可见容器）
  let targetContainerIdx = -1;
  for (let i = 0; i < containers.length; i++) {
    if (containers[i].visible && containers[i].text.includes('请选择')) {
      targetContainerIdx = i;
      break;
    }
  }

  console.log('\n目标容器索引: ' + targetContainerIdx);

  if (targetContainerIdx >= 0) {
    // 使用Playwright的locator来定位目标容器中的按钮
    const container = page.locator('.select-tabs-overflow').nth(targetContainerIdx);
    const buttons = container.locator('button.select-tabs-tab');
    const btnCount = await buttons.count();
    
    console.log('目标容器中的按钮数量: ' + btnCount);
    
    for (let i = 0; i < btnCount; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const className = await btn.getAttribute('class');
      
      let type = '未知';
      if (className.includes('chengshi')) type = '地区';
      else if (className.includes('nianfen')) type = '年份';
      else if (className.includes('pici')) type = '批次';
      else if (className.includes('kemu')) type = '科目';
      
      console.log('\n  [' + i + '] ' + type + ': ' + text.trim());
      
      // 点击按钮
      console.log('    正在点击...');
      try {
        await btn.click({ force: true, timeout: 5000 });
        console.log('    点击成功');
      } catch (e) {
        console.log('    click失败: ' + e.message.substring(0, 80));
        // 使用dispatchEvent
        await btn.evaluate(function(el) {
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
          });
          el.dispatchEvent(event);
        });
        console.log('    使用dispatchEvent');
      }
      
      await page.waitForTimeout(2000);
      
      // 查找弹出层 - 查找所有position为absolute/fixed且z-index较高的元素
      const popups = await page.evaluate(function() {
        const result = [];
        const allEls = document.querySelectorAll('*');
        
        for (let i = 0; i < allEls.length; i++) {
          const el = allEls[i];
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          if ((style.position === 'absolute' || style.position === 'fixed') &&
              style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 100 && rect.height > 100 &&
              rect.top >= 0 && rect.top < window.innerHeight) {
            
            const zIndex = parseInt(style.zIndex) || 0;
            if (zIndex > 100 || style.position === 'fixed') {
              const text = (el.innerText || '').substring(0, 200).replace(/\n/g, ' | ');
              const className = el.className || '';
              
              // 排除一些常见的UI元素
              if (!className.includes('tabs') && !className.includes('header') && 
                  !className.includes('footer') && !className.includes('navigation')) {
                result.push({
                  text: text,
                  className: className,
                  zIndex: zIndex,
                  top: Math.round(rect.top),
                  left: Math.round(rect.left),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                });
              }
            }
          }
        }
        
        return result;
      });
      
      if (popups.length > 0) {
        console.log('    弹出层 (' + popups.length + ' 个):');
        popups.forEach(function(p, pi) {
          console.log('      [' + pi + '] z=' + p.zIndex + ' top=' + p.top + ' class=' + p.className.substring(0, 50));
          console.log('           text: ' + p.text.substring(0, 100));
        });
      } else {
        console.log('    (未找到弹出层)');
      }
      
      // 按Escape关闭
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('调试完成！');
  console.log('请查看输出，告诉我应该如何操作');
  console.log('='.repeat(70));
  
  console.log('\n浏览器保持打开状态，按 Ctrl+C 退出');
  await new Promise(function() {});
}

main().catch(console.error);