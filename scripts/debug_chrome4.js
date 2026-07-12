import { chromium } from 'playwright';

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

  // 滚动到目标容器（索引4）
  console.log('滚动到专业分数线区域...');
  await page.evaluate(function() {
    const groups = document.querySelectorAll('.select-tabs-overflow');
    if (groups[4]) {
      groups[4].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  await page.waitForTimeout(1000);

  // 点击地区按钮（目标容器索引4中的第0个按钮）
  console.log('\n=== 点击地区按钮 ===');
  
  const container = page.locator('.select-tabs-overflow').nth(4);
  const regionBtn = container.locator('button.select-tabs-tab').first();
  
  // 记录点击前的页面状态
  const beforeHtml = await page.evaluate(function() {
    return document.body.innerHTML.length;
  });
  console.log('点击前HTML长度: ' + beforeHtml);
  
  await regionBtn.click({ force: true });
  console.log('已点击地区按钮');
  
  // 等待更长时间
  await page.waitForTimeout(3000);
  
  // 记录点击后的页面状态
  const afterHtml = await page.evaluate(function() {
    return document.body.innerHTML.length;
  });
  console.log('点击后HTML长度: ' + afterHtml);
  console.log('HTML变化: ' + (afterHtml - beforeHtml) + ' 字节');
  
  // 打印所有新增的元素
  const newElements = await page.evaluate(function() {
    const result = [];
    
    // 查找所有包含省份名称的元素
    const provinces = ['海南', '天津', '北京', '上海', '广东', '江苏', '浙江', '山东', '河南', '河北', '四川', '湖北', '湖南', '福建', '安徽', '江西', '辽宁', '吉林', '黑龙江', '广西', '云南', '贵州', '陕西', '甘肃', '青海', '宁夏', '新疆', '内蒙古', '西藏', '重庆', '山西'];
    
    const allEls = document.querySelectorAll('*');
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      const text = (el.innerText || el.textContent || '').trim();
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      
      // 查找包含省份名称且可见的元素
      if (text.length > 0 && text.length < 10) {
        for (let p = 0; p < provinces.length; p++) {
          if (text === provinces[p]) {
            if (style.display !== 'none' && style.visibility !== 'hidden' && 
                rect.width > 0 && rect.height > 0) {
              result.push({
                text: text,
                tagName: el.tagName,
                className: (el.className || '').substring(0, 80),
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                parentClass: el.parentElement ? (el.parentElement.className || '').substring(0, 80) : '',
              });
            }
            break;
          }
        }
      }
    }
    
    return result;
  });
  
  console.log('\n包含省份名称的可见元素 (' + newElements.length + ' 个):');
  newElements.forEach(function(el, i) {
    console.log('  [' + i + '] ' + el.tagName + ' "' + el.text + '" top=' + el.top + ' left=' + el.left);
    console.log('       class: ' + el.className);
    console.log('       parent: ' + el.parentClass);
  });
  
  // 查找所有可见的、可能是下拉选项的元素
  const dropdownItems = await page.evaluate(function() {
    const result = [];
    const allEls = document.querySelectorAll('div, span, li, button, a');
    
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const text = (el.innerText || el.textContent || '').trim();
      
      // 查找可能是下拉选项的元素：高度小、有背景色、在按钮附近
      if (style.display !== 'none' && style.visibility !== 'hidden' && 
          rect.width > 50 && rect.width < 200 && rect.height > 20 && rect.height < 60 &&
          text.length > 0 && text.length < 15 &&
          rect.top > 400 && rect.top < 800) {
        
        const className = (el.className || '').toString();
        const parent = el.parentElement;
        const parentClass = parent ? (parent.className || '').toString() : '';
        
        // 排除已知的非选项元素
        if (!className.includes('tabs-tab') && !className.includes('title') && 
            !className.includes('header') && !text.includes('分数线') &&
            !text.includes('专业') && !text.includes('招生') &&
            !text.includes('查看') && !text.includes('学校') &&
            !text.includes('北京') && !text.includes('2025') && 
            !text.includes('本科批') && !text.includes('综合') &&
            !text.includes('请选择')) {
          
          result.push({
            text: text,
            tagName: el.tagName,
            className: className.substring(0, 80),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            backgroundColor: style.backgroundColor,
            parentClass: parentClass.substring(0, 80),
          });
        }
      }
    }
    
    return result.slice(0, 30);
  });
  
  console.log('\n可能是下拉选项的元素 (' + dropdownItems.length + ' 个):');
  dropdownItems.forEach(function(el, i) {
    console.log('  [' + i + '] ' + el.tagName + ' "' + el.text + '" top=' + el.top + ' left=' + el.left + ' bg=' + el.backgroundColor);
    console.log('       class: ' + el.className);
    console.log('       parent: ' + el.parentClass);
  });

  // 保存HTML以便分析
  const html = await page.content();
  const fs = await import('fs');
  fs.writeFileSync('debug_after_click.html', html);
  console.log('\n页面HTML已保存为 debug_after_click.html');
  
  await page.screenshot({ path: 'debug_after_click.png', fullPage: false });
  console.log('截图已保存为 debug_after_click.png');

  console.log('\n浏览器保持打开状态，按 Ctrl+C 退出');
  await new Promise(function() {});
}

main().catch(console.error);