import dotenv from 'dotenv';
dotenv.config();

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YEARS = [2023, 2024, 2025];
const BATCH = '本科批';
const CHROME_PATH = 'C:\\Users\\lhp\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';

// 多省份配置：同一院校页面加载一次，依次切换地区采集各省份数据
// 顺序即采集顺序：先海南，再天津
const PROVINCES = [
  { name: '海南', schoolsFile: 'hainan_schools.json', outputDir: 'hainan_scores' },
  { name: '天津', schoolsFile: 'tianjin_schools.json', outputDir: 'tianjin_scores' },
];

function getOutputDir(provinceName) {
  const prov = PROVINCES.find(p => p.name === provinceName);
  return prov ? prov.outputDir : (provinceName === '海南' ? 'hainan_scores' : 'tianjin_scores');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function cleanText(text) {
  if (!text) return '';
  return text.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

async function setupBrowser() {
  console.log('正在启动Chrome浏览器...');
  
  const launchOptions = {
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--disable-infobars',
      '--disable-search-engine-choice-screen',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  };
  
  const browser = await chromium.launch(launchOptions);
  
  const context = await browser.newContext({
    viewport: null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.101 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    extraHTTPHeaders: {
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });
  
  const page = await context.newPage();
  
  await page.route('**/*.png', route => route.abort());
  await page.route('**/*.jpg', route => route.abort());
  await page.route('**/*.gif', route => route.abort());
  await page.route('**/*.svg', route => route.abort());
  await page.route('**/*.woff', route => route.abort());
  
  return { browser, context, page };
}

async function goToSchoolPage(page, schoolName, province) {
  // 使用与正常显示数据一致的URL（不预设province/batch/genre参数）
  // 预设params会导致页面渲染出多组重叠的下拉选择器（部分在屏幕外），引发点击失败
  const url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=' +
    encodeURIComponent(schoolName) + '&q=' + encodeURIComponent(schoolName) +
    '&device=pc&by=tuijian&by2=general_entity_college&type=zhuanye&uc_param_str=ntnwvepffrbiprsvchutosstxskp';

  const maxRetries = 3;
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // 等待页面关键元素加载完成（院校名称或分数线Tab出现）
      try {
        await page.waitForSelector('.qk-tabs-tab, [role="tab"]', { timeout: 15000 });
      } catch (e) {}

      // 额外等待确保动态内容渲染完成
      await page.waitForTimeout(3000);

      // 滚动到页面中部，确保分数线区域可见
      await page.evaluate(() => {
        window.scrollTo(0, 600);
      });
      await page.waitForTimeout(1000);

      console.log('  ✓ 页面加载完成');
      return true;
    } catch (e) {
      console.log('  ❌ 访问页面失败 (重试 ' + (retry + 1) + '/' + maxRetries + '):', schoolName, e.message.substring(0, 80));
      if (retry < maxRetries - 1) {
        await page.waitForTimeout(5000);
      }
    }
  }

  return false;
}

// 检测专业分数线数据区域是否已激活加载
// 正确的Tab点击后会激活 qk-tabs-pane-zhuanye 面板，并显示带省份/年份/批次下拉的分数线卡片
async function isMajorScoreAreaActive(page) {
  return await page.evaluate(() => {
    // 信号1: 专业分数线Tab面板已激活（最可靠）
    const activeZhuanyePane = document.querySelector(
      '.qk-tabs-pane-zhuanye.qk-tabs-pane-active, ' +
      '.qk-tabs-pane-active.card-padding-zhuanye, ' +
      '[class*="pane-zhuanye"][class*="pane-active"]'
    );
    if (activeZhuanyePane) return true;

    // 信号2: 专业分数线卡片存在
    const majorCard = document.querySelector(
      '.fenshuxian-card.card-padding-zhuanye, ' +
      '.fenshuxian-card-pc.card-padding-zhuanye'
    );
    if (majorCard) return true;

    // 信号3: 存在含 chengshi/nianfen/pici 按钮的下拉选择器组（省份/年份/批次）
    const groups = document.querySelectorAll('.select-tabs-overflow');
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const style = window.getComputedStyle(g);
      const rect = g.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' ||
          rect.width <= 0 || rect.height <= 0) continue;
      const btns = g.querySelectorAll('button.select-tabs-tab');
      let hasChengshi = false, hasNianfen = false, hasPici = false;
      for (let j = 0; j < btns.length; j++) {
        const cls = (btns[j].className || '').toString();
        if (cls.includes('chengshi')) hasChengshi = true;
        else if (cls.includes('nianfen')) hasNianfen = true;
        else if (cls.includes('pici')) hasPici = true;
      }
      // 至少含年份+批次（部分省份无地区下拉）
      if (hasNianfen && hasPici) return true;
    }
    return false;
  });
}

async function switchToMajorTab(page) {
  try {
    // 页面上可能存在多个"专业分数线"Tab（如索引8和23）：
    //   - 索引较小者通常是其它Tab内的子元素/链接，点击不会激活专业分数线数据区域
    //   - 索引较大者才是真正的顶层"专业分数线"Tab
    // 因此先收集所有候选，从最后一个向前逐个尝试，并用数据区域是否激活来验证
    const candidates = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.qk-tabs-tab, [role="tab"], [class*="tab-item"]');
      const result = [];
      for (let i = 0; i < tabs.length; i++) {
        const text = (tabs[i].innerText || tabs[i].textContent || '').trim();
        if (text === '专业分数线' || text.includes('专业分数线')) {
          result.push({ index: i, text: text.substring(0, 20) });
        }
      }
      return result;
    });

    if (candidates.length === 0) {
      // 无候选时，可能已在专业分数线页，直接验证
      if (await isMajorScoreAreaActive(page)) {
        console.log('    ✓ 无候选Tab，但专业分数线区域已激活');
        return true;
      }
      console.log('    ⚠ 未找到专业分数线Tab，可能已在专业分数线页');
      return false;
    }

    if (candidates.length > 1) {
      console.log('    ℹ 检测到 ' + candidates.length + ' 个"专业分数线"Tab: ' +
        candidates.map(c => '#' + c.index + '(' + c.text + ')').join(', '));
    }

    // 先检查当前是否已激活（避免重复点击）
    if (await isMajorScoreAreaActive(page)) {
      console.log('    ✓ 专业分数线区域已激活，无需切换');
      return true;
    }

    // 从最后一个候选向前尝试（索引较大者更可能是正确的顶层Tab）
    for (let k = candidates.length - 1; k >= 0; k--) {
      const tabIndex = candidates[k].index;
      const tabLocator = page.locator('.qk-tabs-tab, [role="tab"], [class*="tab-item"]').nth(tabIndex);

      // 滚动Tab到可见区域
      try {
        await tabLocator.evaluate(el => {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
      } catch (e) {}
      await page.waitForTimeout(500);

      // 使用Playwright的force:true点击触发完整事件链
      try {
        await tabLocator.click({ force: true, timeout: 5000 });
      } catch (clickErr) {
        console.log('    ⚠ Tab#' + tabIndex + '点击失败，备用方式: ' + clickErr.message.substring(0, 50));
        await tabLocator.evaluate(el => {
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }).catch(() => {});
      }

      // 等待专业分数线卡片区域加载完成
      try {
        await page.waitForSelector(
          '.fenshuxian-card.card-padding-zhuanye, [class*="card-padding-zhuanye"], ' +
          '.qk-tabs-pane-zhuanye.qk-tabs-pane-active',
          { timeout: 10000 }
        );
      } catch (e) {}

      // 额外等待数据渲染
      await page.waitForTimeout(2000);

      // 验证专业分数线区域是否真正激活
      const activated = await isMajorScoreAreaActive(page);
      if (activated) {
        // 滚动到专业分数线区域
        await page.evaluate(() => {
          const sections = document.querySelectorAll('.fenshuxian-card.card-padding-zhuanye, [class*="card-padding-zhuanye"]');
          if (sections.length > 0) {
            sections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            const containers = document.querySelectorAll('.select-tabs-overflow');
            for (let i = 0; i < containers.length; i++) {
              const rect = containers[i].getBoundingClientRect();
              if (rect.top > 100 && rect.top < 800) {
                containers[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
              }
            }
          }
        });
        await page.waitForTimeout(1000);

        console.log('    ✓ 已切换到专业分数线Tab (索引:' + tabIndex + ')，区域已激活');
        return true;
      } else {
        console.log('    ⚠ Tab#' + tabIndex + '点击后区域未激活，尝试下一个候选');
      }
    }

    // 所有候选均未激活，最后兜底：用第一个候选并继续
    console.log('    ⚠ 所有候选Tab均未激活区域，使用第一个候选继续');
    const fallbackIdx = candidates[0].index;
    const fallbackLocator = page.locator('.qk-tabs-tab, [role="tab"], [class*="tab-item"]').nth(fallbackIdx);
    try {
      await fallbackLocator.evaluate(el => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await page.waitForTimeout(500);
      await fallbackLocator.click({ force: true, timeout: 5000 });
    } catch (e) {}
    await page.waitForTimeout(2000);
    return false;
  } catch (e) {
    console.log('    ⚠ 切换Tab失败:', e.message.substring(0, 80));
    return false;
  }
}

async function findMajorScoreContainer(page) {
  return await page.evaluate(() => {
    const containers = document.querySelectorAll('.select-tabs-overflow');
    // 第一轮：收集所有"在专业分数线面板内"且"真正在视口内可见"的候选
    const candidates = [];

    for (let i = 0; i < containers.length; i++) {
      const container = containers[i];
      const rect = container.getBoundingClientRect();
      const style = window.getComputedStyle(container);
      const text = container.innerText || '';

      // 硬性条件1：必须真正可见（display/visibility/尺寸）
      const visible = style.display !== 'none' && style.visibility !== 'hidden' &&
                      rect.width > 0 && rect.height > 0;
      if (!visible) continue;

      // 收集祖先class判断是否在专业分数线面板内
      let parent = container.parentElement;
      let parentClass = '';
      while (parent) {
        parentClass = (parent.className || '') + ' ' + parentClass;
        parent = parent.parentElement;
      }
      const inZhuanye = parentClass.includes('zhuanye') || parentClass.includes('card-padding-zhuanye');

      // 硬性条件2：必须在专业分数线面板内
      if (!inZhuanye) continue;

      // 硬性条件3：必须在浏览器视口横向范围内（left在屏幕内，不是负数或远超视口宽度）
      // 诊断发现屏幕外的容器组 left=-1762 或 left=5918，都在视口外
      if (rect.left < -50 || rect.left > window.innerWidth - 50) continue;

      // 硬性条件4：必须有 nianfen(年份) 和 pici(批次) 按钮（专业分数线选择器特征）
      const btns = container.querySelectorAll('button.select-tabs-tab');
      let hasNianfen = false, hasPici = false, hasChengshi = false;
      let chengshiIdx = -1, nianfenIdx = -1, piciIdx = -1;
      for (let j = 0; j < btns.length; j++) {
        const cls = (btns[j].className || '').toString();
        if (cls.includes('chengshi')) {
          hasChengshi = true;
          chengshiIdx = j;
        } else if (cls.includes('nianfen')) {
          hasNianfen = true;
          nianfenIdx = j;
        } else if (cls.includes('pici')) {
          hasPici = true;
          piciIdx = j;
        }
      }
      if (!hasNianfen || !hasPici) continue;

      // 打分（用于在多个合格候选中选最优）
      let score = 0;
      if (text.includes('请选择')) score += 10;
      if (hasChengshi) score += 5;          // 含地区下拉（海南等新高考省份有）
      if (rect.top >= 50 && rect.top < window.innerHeight - 100) score += 20; // 完全在视口纵向内
      score += Math.min(10, Math.round(rect.width / 100)); // 宽度越大越好

      candidates.push({ idx: i, score: score, top: Math.round(rect.top), left: Math.round(rect.left), btnCount: btns.length, chengshiIdx, nianfenIdx, piciIdx });
    }

    // 选得分最高的；若都未达标，回退到第4组（诊断确认的可见组索引）
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      return {
        containerIdx: best.idx,
        chengshiIdx: best.chengshiIdx,
        nianfenIdx: best.nianfenIdx,
        piciIdx: best.piciIdx
      };
    }
    return {
      containerIdx: 4,
      chengshiIdx: 0,
      nianfenIdx: 1,
      piciIdx: 2
    };
  });
}

async function selectDropdown(page, containerIdx, buttonIdx, targetText, buttonType) {
  try {
    const container = page.locator('.select-tabs-overflow').nth(containerIdx);
    const btn = container.locator('button.select-tabs-tab').nth(buttonIdx);

    // 检查当前值是否已是目标值
    let currentText = '';
    try {
      currentText = await btn.textContent({ timeout: 3000 }) || '';
    } catch (e) {}
    if (currentText && currentText.includes(targetText)) {
      console.log('    ✓ ' + buttonType + '已是: ' + targetText);
      return true;
    }

    // 先滚动整个容器所在区域到页面可见位置
    await container.evaluate(el => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }).catch(() => {});
    await page.waitForTimeout(500);

    // 再滚动按钮到可见区域
    await btn.evaluate(el => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }).catch(() => {});
    await page.waitForTimeout(500);

    // 关键：用Playwright的locator.click({ force: true })触发完整React事件链
    // force:true跳过可见性/可操作性检查，但仍然触发真实DOM事件
    try {
      await btn.click({ force: true, timeout: 5000 });
    } catch (clickErr) {
      // 如果Playwright点击失败，降级为dispatchEvent方式
      console.log('    ⚠ Playwright点击失败，尝试备用方式: ' + clickErr.message.substring(0, 50));
      await btn.evaluate(el => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }).catch(() => {});
    }

    // 等待下拉选项弹出
    await page.waitForTimeout(1500);

    // 在下拉选项中查找并点击目标文本
    const clicked = await page.evaluate((target) => {
      // 优先查找下拉面板内的选项（class含 select-modal-grid-item）。
      // 诊断发现：页面使用 select-modal-grid-item 作为选项类名，而非 select-modal-grid-pc-item
      const modal = document.querySelector('[class*="select-modal-grid"]');
      if (modal) {
        const optionEls = modal.querySelectorAll('[class*="select-modal-grid-item"]');
        for (let i = 0; i < optionEls.length; i++) {
          const el = optionEls[i];
          const text = (el.innerText || el.textContent || '').trim();
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          if (text === target.targetText || text === target.targetText + '\n') {
            if (style.display !== 'none' && style.visibility !== 'hidden' &&
                rect.width > 0 && rect.height > 0 &&
                rect.top >= 0 && rect.top < window.innerHeight) {
              el.click();
              return { found: true, text: text, src: 'grid-item' };
            }
          }
        }
      }

      // 备用：查找 class 含 select-modal-grid-pc-item 的选项（PC端可能使用）
      const pcGridEls = document.querySelectorAll('[class*="select-modal-grid-pc-item"]');
      for (let i = 0; i < pcGridEls.length; i++) {
        const el = pcGridEls[i];
        const text = (el.innerText || el.textContent || '').trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (text === target.targetText || text === target.targetText + '\n') {
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight) {
            el.click();
            return { found: true, text: text, src: 'pc-grid-item' };
          }
        }
      }

      // 备用：查找 class 含 select-modal-li 的选项
      const liEls = document.querySelectorAll('[class*="select-modal-li"]');
      for (let i = 0; i < liEls.length; i++) {
        const el = liEls[i];
        const text = (el.innerText || el.textContent || '').trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (text === target.targetText || text === target.targetText + '\n') {
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight) {
            el.click();
            return { found: true, text: text, src: 'modal-li' };
          }
        }
      }

      // 回退：遍历所有元素查找（排除按钮、Tab、屏幕外容器）
      const allEls = document.querySelectorAll('div, span, li, button, a');
      for (let i = 0; i < allEls.length; i++) {
        const el = allEls[i];
        const text = (el.innerText || el.textContent || '').trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        if (text === target.targetText || text === target.targetText + '\n') {
          if (style.display !== 'none' && style.visibility !== 'hidden' &&
              rect.width > 0 && rect.height > 0 &&
              rect.top >= 0 && rect.top < window.innerHeight) {

            const className = (el.className || '').toString();
            if (className.includes('select-tabs-tab')) continue;
            if (className.includes('qk-tabs-tab')) continue;
            if (rect.left < -10 || rect.left > window.innerWidth - 10) continue;

            el.click();
            return { found: true, text: text, src: 'fallback' };
          }
        }
      }

      return { found: false };
    }, { targetText: targetText });

    if (clicked.found) {
      console.log('    ✓ ' + buttonType + '选择成功: ' + targetText + (clicked.src ? ' (' + clicked.src + ')' : ''));
      await page.waitForTimeout(2500);
      return true;
    } else {
      // 备用：使用Playwright文本定位器点击
      const optionLocator = page.locator('text="' + targetText + '"').first();
      if (await optionLocator.count() > 0) {
        await optionLocator.click({ force: true, timeout: 3000 });
        console.log('    ✓ ' + buttonType + '选择成功(备用): ' + targetText);
        await page.waitForTimeout(2500);
        return true;
      }

      console.log('    ⚠ ' + buttonType + '未找到选项: ' + targetText);
      try { await page.keyboard.press('Escape'); } catch(e) {}
      await page.waitForTimeout(500);
      return false;
    }

  } catch (e) {
    console.log('    ⚠ ' + buttonType + '选择失败:', e.message.substring(0, 80));
    try { await page.keyboard.press('Escape'); } catch(e2) {}
    return false;
  }
}

async function selectProvince(page, containerIdx, buttonIdx, province) {
  return await selectDropdown(page, containerIdx, buttonIdx, province, '省份');
}

async function selectYear(page, containerIdx, buttonIdx, year) {
  return await selectDropdown(page, containerIdx, buttonIdx, year.toString(), '年份');
}

async function selectBatch(page, containerIdx, buttonIdx, batch) {
  return await selectDropdown(page, containerIdx, buttonIdx, batch, '批次');
}

async function clickViewAll(page) {
  let totalClicked = 0;
  
  // 循环点击所有可见的"查看全部"按钮（页面上可能存在多个卡片各有一个）
  for (let round = 0; round < 5; round++) {
    try {
      const viewAllBtns = page.locator('text=查看全部');
      const count = await viewAllBtns.count();
      if (count === 0) break;
      
      let clickedThisRound = false;
      for (let i = 0; i < count; i++) {
        try {
          const btn = viewAllBtns.nth(i);
          const isVisible = await btn.evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' &&
                   rect.width > 0 && rect.height > 0 &&
                   rect.top >= 0 && rect.top < window.innerHeight;
          }).catch(() => false);
          
          if (isVisible) {
            await btn.click({ force: true, timeout: 3000 });
            await page.waitForTimeout(1500);
            totalClicked++;
            clickedThisRound = true;
            console.log('    ✓ 已点击查看全部 (#' + totalClicked + ')');
          }
        } catch (e) {}
      }
      
      if (!clickedThisRound) break;
    } catch (e) {
      break;
    }
  }
  
  // 备用：点击"全部"按钮
  if (totalClicked === 0) {
    try {
      const allBtn = page.locator('text=全部').first();
      if (await allBtn.count() > 0) {
        await allBtn.click({ force: true, timeout: 3000 });
        await page.waitForTimeout(2000);
        totalClicked++;
        console.log('    ✓ 已点击全部');
      }
    } catch (e) {}
  }
  
  if (totalClicked === 0) {
    console.log('    ⚠ 未找到查看全部按钮');
  } else {
    console.log('    ✓ 共点击查看全部 ' + totalClicked + ' 次');
  }
  return totalClicked > 0;
}

// 滚动专业分数线卡片区域，触发懒加载所有专业数据
async function scrollScoreCardToLoadAll(page) {
  try {
    await page.evaluate(() => {
      const cards = document.querySelectorAll(
        '.fenshuxian-card.card-padding-zhuanye, .fenshuxian-card-pc.card-padding-zhuanye'
      );
      if (cards.length > 0) {
        cards[0].scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
    await page.waitForTimeout(800);
    
    // 在卡片内部滚动加载剩余数据
    await page.evaluate(() => {
      const cards = document.querySelectorAll(
        '.fenshuxian-card.card-padding-zhuanye, .fenshuxian-card-pc.card-padding-zhuanye'
      );
      if (cards.length > 0) {
        const card = cards[0];
        // 尝试在卡片内滚动
        card.scrollTop = card.scrollHeight;
        // 也滚动整个页面
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    await page.waitForTimeout(800);
    
    // 滚回顶部
    await page.evaluate(() => {
      const cards = document.querySelectorAll(
        '.fenshuxian-card.card-padding-zhuanye, .fenshuxian-card-pc.card-padding-zhuanye'
      );
      if (cards.length > 0) {
        cards[0].scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
    await page.waitForTimeout(500);
  } catch (e) {}
}

async function expandAllItems(page) {
  console.log('    → 展开所有可展开元素...');
  
  let expandedCount = 0;
  
  try {
    expandedCount += await page.evaluate(() => {
      let count = 0;
      const selectors = [
        '[class*="expand"]', '[class*="arrow"]', '[class*="toggle"]', 
        '[class*="collapse"]', '[class*="dropdown"]', '[class*="chevron"]',
        '[class*="icon-arrow"]', '[class*="icon-down"]', '[class*="icon-right"]',
        '[class*="expand-icon"]', '[class*="down-arrow"]'
      ];
      
      const allElements = document.querySelectorAll(selectors.join(','));
      
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.top < 0 || rect.top > window.innerHeight) continue;
        
        try {
          el.click();
          count++;
        } catch(e) {}
      }
      
      return count;
    });
    
    await page.waitForTimeout(1500);
    
    expandedCount += await page.evaluate(() => {
      let count = 0;
      const svgs = document.querySelectorAll('svg[class*="arrow"], svg[class*="icon"], svg[class*="chevron"]');
      
      for (const svg of svgs) {
        let parent = svg.parentElement;
        while (parent && parent !== document.body) {
          const style = window.getComputedStyle(parent);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            const rect = parent.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && 
                rect.top >= 0 && rect.top <= window.innerHeight) {
              try {
                parent.click();
                count++;
              } catch(e) {}
            }
            break;
          }
          parent = parent.parentElement;
        }
      }
      
      return count;
    });
    
  } catch (e) {
    console.log('    ⚠ 展开元素时出错:', e.message.substring(0, 60));
  }
  
  console.log('    ✓ 已尝试展开 ' + expandedCount + ' 个元素');
  await page.waitForTimeout(1000);
  return expandedCount;
}

async function extractData(page, schoolName, year, province) {
  console.log('    → 提取数据...');

  try {
    const data = await page.evaluate(function(args) {
      const results = [];

      function cleanText(t) {
        if (!t) return '';
        return t.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      }

      // 只从专业分数线卡片区域提取，绝不从整个页面body提取
      // 关键：必须要求 card-padding-zhuanye 类。页面专业分数线Tab面板内还存在另一个
      // .fenshuxian-card（无 card-padding-zhuanye，显示"北京2025中外合作办学"固定数据，
      // 不受地区/年份筛选控制），若用 .qk-tabs-pane-zhuanye .fenshuxian-card 会误匹配它，
      // 导致每个年份/省份的数据都混入"数字媒体技术585、应用物理学584"等残留数据。
      const majorSections = document.querySelectorAll(
        '.fenshuxian-card.card-padding-zhuanye, ' +
        '.fenshuxian-card-pc.card-padding-zhuanye, ' +
        '.qk-tabs-pane-zhuanye.qk-tabs-pane-active .fenshuxian-card.card-padding-zhuanye'
      );

      if (majorSections.length === 0) {
        return { results: [], reason: '未找到专业分数线卡片区域' };
      }

      for (let s = 0; s < majorSections.length; s++) {
        const section = majorSections[s];
        const text = section.innerText || '';

        // 检测"暂无相关数据"，跳过无数据区域
        if (text.includes('暂无相关数据') || text.includes('暂无相关')) {
          continue;
        }

        // 二次过滤：只提取含"专业分数线"标题的卡片，排除其它固定数据卡片
        if (!text.includes('专业分数线')) continue;

        if (text.length < 50) continue;

        const lines = text.split('\n').map(l => cleanText(l)).filter(l => l);
        extractFromLines(lines, results, args);
      }

      function extractFromLines(lines, results, args) {
        let currentRecord = null;
        // 数字字段填充顺序: score -> rank -> count（每个数字只填一个字段）
        let numFieldIndex = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.length < 1) continue;

          // 跳过标题/表头行
          if (line.includes('专业分数线') || line.includes('最低分') || line.includes('最低位次') ||
              line.includes('批次线差') || line.includes('请选择') ||
              line === '选科要求' || line === '专业' || line === '院校' ||
              line === '招生类型' || line === '分数' || line === '位次' || line === '人数') {
            continue;
          }

          // 跳过省份/批次/科目等选择器文本
          // 注意：不再跳过年份数字（如2023），因为位次也可能是四位数（如1436）
          if (/^(北京|上海|天津|海南|重庆|广东|湖南|湖北|江苏|浙江|山东|河北|辽宁|福建|四川|河南|安徽|江西|广西|云南|贵州|甘肃|青海|宁夏|新疆|内蒙古|黑龙江|吉林|辽宁|西藏|本科批|本科批A段|专科批|综合|物理类|历史类|物理|历史|请选择|综|理|文)$/.test(line)) {
            continue;
          }

          // 跳过"暂无相关数据"等提示
          if (line.includes('暂无') || line.includes('可尝试切换')) {
            continue;
          }

          // 跳过数据来源声明
          if (line.includes('数据来源于') || line.includes('掌上志愿')) {
            continue;
          }

          const isMajorLine = isMajorName(line);

          if (isMajorLine) {
            // 保存上一条记录
            if (currentRecord && currentRecord.major_name) {
              if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
                results.push(finalizeRecord(currentRecord, args));
              }
            }

            currentRecord = {
              major_name: line,
              min_score: undefined,
              min_rank: undefined,
              person_count: undefined,
              major_group: '',
              subject_requirement: '',
              major_description: '',
              batch: args.batch,
            };
            const bracketMatch = line.match(/([\(（].*[\)）])/);
            if (bracketMatch) {
              currentRecord.major_description = bracketMatch[1];
              currentRecord.major_name = line.replace(bracketMatch[1], '').trim();
            }
            numFieldIndex = 0;
            continue;
          }

          if (!currentRecord) continue;

          // 匹配"包含专业：xxx"
          if (line.includes('包含专业') || (line.includes('包含') && line.includes('专业'))) {
            currentRecord.major_description = line;
            continue;
          }

          // 匹配以括号开头的行，作为专业说明（如"(领军人才培养计划)(九年医)"）
          if (/^[\(（]/.test(line)) {
            currentRecord.major_description = line;
            continue;
          }

          // 匹配"选科要求：xxx"或"xxx必选xxx"
          if (line.includes('选科要求：') || line.includes('选科要求:')) {
            const match = line.match(/选科要求[：:]\s*(.+)/);
            if (match) {
              currentRecord.subject_requirement = match[1].trim();
            } else {
              currentRecord.subject_requirement = line;
            }
            continue;
          }

          // 匹配"本科批 / 选科要求：xxx"这种组合行
          if (line.includes('选科要求') && line.includes('本科批')) {
            const match = line.match(/选科要求[：:]\s*(.+)/);
            if (match) {
              currentRecord.subject_requirement = match[1].trim();
            }
            continue;
          }

          if ((line.includes('必选') || line.includes('选考') || line.includes('科目要求')) && !currentRecord.subject_requirement) {
            if (line.length < 60) {
              currentRecord.subject_requirement = line;
            }
            continue;
          }

          // 匹配专业组 - "专业组02" 或 "专业组（02）" 或 "专业组：02"
          // 2023年数据格式："专业组（02） - 物/化/生(3选1)"，需要同时提取专业组和选科要求
          if (line.includes('专业组')) {
            const groupMatch = line.match(/专业组\s*[（(]?\s*([0-9０-９]+)\s*[）)]?/);
            if (groupMatch) {
              currentRecord.major_group = '专业组（' + groupMatch[1] + '）';
            } else if (line.length < 30) {
              currentRecord.major_group = line;
            }
            
            // 从专业组信息中提取选科要求（格式：专业组（02） - 物/化/生(3选1)）
            const reqMatch = line.match(/-+\s*(.+)/);
            if (reqMatch && !currentRecord.subject_requirement) {
              const reqText = reqMatch[1].trim();
              if (reqText.length < 50) {
                currentRecord.subject_requirement = reqText;
              }
            }
            continue;
          }

          if (line.includes('本科批A段')) {
            currentRecord.batch = '本科批A段';
            continue;
          }

          // 带单位的数字：xx分、xx位次、xx人
          const scoreMatch = line.match(/(\d{2,3})\s*分/);
          if (scoreMatch && currentRecord.min_score === undefined) {
            const score = parseInt(scoreMatch[1]);
            if (score > 100 && score < 800) {
              currentRecord.min_score = score;
              continue;
            }
          }

          const rankMatch = line.match(/(\d{3,8})\s*位次/);
          if (rankMatch) {
            currentRecord.min_rank = parseInt(rankMatch[1]);
            continue;
          }

          const countMatch = line.match(/(\d+)\s*人/);
          if (countMatch && currentRecord.person_count === undefined) {
            currentRecord.person_count = parseInt(countMatch[1]);
            continue;
          }

          // 纯数字行：智能判断字段类型
          if (/^\d+$/.test(line)) {
            const num = parseInt(line);

            // 如果分数和位次都已经设置，那么剩下的数字只能是人数或批次线差
            if (currentRecord.min_score !== undefined && currentRecord.min_rank !== undefined) {
              if (currentRecord.person_count === undefined && num > 0 && num <= 100) {
                if ((currentRecord.min_score !== undefined && num === currentRecord.min_score) ||
                    (currentRecord.min_rank !== undefined && num === currentRecord.min_rank)) {
                  continue;
                }
                currentRecord.person_count = num;
                continue;
              }
              continue;
            }

            // 第一个数字：优先作为分数（400-799）- 海南高考分数范围，避免与位次混淆
            if (currentRecord.min_score === undefined && num >= 400 && num < 800) {
              currentRecord.min_score = num;
              continue;
            }

            // 第二个数字：作为位次（50-1000000）
            // 如果分数已设置，下一个数字无论大小都作为位次
            // 如果分数未设置但数字>=300，也作为位次
            if (currentRecord.min_rank === undefined) {
              if (currentRecord.min_score !== undefined) {
                // 分数已设置，下一个数字就是位次
                currentRecord.min_rank = num;
                continue;
              }
              // 分数未设置时，只有较大的数字才作为位次
              if (num >= 300 && num < 1000000) {
                currentRecord.min_rank = num;
                continue;
              }
            }
          }
        }

        // 保存最后一条记录
        if (currentRecord && currentRecord.major_name) {
          if (currentRecord.min_score !== undefined || currentRecord.min_rank !== undefined || currentRecord.person_count !== undefined) {
            results.push(finalizeRecord(currentRecord, args));
          }
        }
      }

      function isMajorName(line) {
        if (line.length < 2 || line.length > 60) return false;
        if (/^\d+$/.test(line)) return false;
        if (/^\d/.test(line)) return false;
        // 排除"--"（表示无数据）
        if (line === '--') return false;
        // 排除以括号开头的（专业说明，追加到专业名后面）
        if (/^[\(（]/.test(line)) return false;
        // 排除以"选科要求"开头的（选科要求说明）
        if (/^选科要求/.test(line)) return false;

        // 排除包含问号的（文章标题）
        if (line.includes('？') || line.includes('?')) return false;
        // 排除包含冒号后跟长文本的（文章标题）
        if (line.includes('：') && line.length > 20) return false;
        // 排除包含vs、VS的
        if (line.includes('vs') || line.includes('VS')) return false;
        // 排除包含"怎么样"、"如何"、"好吗"的（文章标题）
        if (line.includes('怎么样') || line.includes('如何') || line.includes('好吗')) return false;
        // 排除包含"体验"、"指南"、"解析"、"排名"、"就业前景"的（文章标题）
        if (line.includes('体验') || line.includes('指南') || line.includes('解析') || 
            line.includes('排名') || line.includes('就业前景')) return false;
        // 排除包含"宿舍"、"食堂"、"校区"、"新生"、"毕业"的（文章标题）
        if (line.includes('宿舍') || line.includes('食堂') || line.includes('校区') || 
            line.includes('新生') || line.includes('毕业')) return false;
        // 排除包含"考研"、"读研"、"研究生"的
        if (line.includes('考研') || line.includes('读研') || line.includes('研究生')) return false;
        // 排除包含"学习"、"高效"、"动力"、"灵感"、"节奏"、"进度"的（用户名/栏目名）
        if (line.includes('学习') || line.includes('高效') || line.includes('动力') || 
            line.includes('灵感') || line.includes('节奏') || line.includes('进度')) return false;
        // 排除包含"治愈"、"实验室"、"同学"、"酱"、"森林"的（用户名）
        if (line.includes('治愈') || line.includes('实验室') || line.includes('同学') || 
            line.includes('酱') || line.includes('森林')) return false;
        // 排除包含"生存"、"现状"、"照片"、"章程"的
        if (line.includes('生存') || line.includes('现状') || line.includes('照片') || 
            line.includes('章程')) return false;
        // 排除包含"升学率"、"出国率"、"就业率"、"薪酬"的
        if (line.includes('升学率') || line.includes('出国率') || line.includes('就业率') || 
            line.includes('薪酬') || line.includes('就业方向') || line.includes('就业单位')) return false;
        // 排除包含"王牌"、"最牛"、"哪些"的
        if (line.includes('王牌') || line.includes('最牛') || line.includes('哪些')) return false;
        // 排除很长的句子（超过40个字符且包含逗号）
        if (line.length > 40 && (line.includes('，') || line.includes(','))) return false;

        // 正面匹配：必须是真正的专业名称
        // 标准专业名称模式：以专业类别词结尾或包含
        const majorKeywords = ['类专业', '试验班', '实验班', '类', '工程', '技术', '科学',
                               '管理', '经济', '金融', '法学', '文学', '理学', '工学',
                               '医学', '农学', '军事', '艺术', '教育', '历史', '哲学',
                               '计算机', '电子', '电气', '机械', '土木', '建筑', '化工',
                               '材料', '能源', '环境', '生物', '食品', '纺织', '安全',
                               '测绘', '地质', '矿业', '交通运输', '航天', '航空',
                               '武器', '核工程', '林业', '水产', '草学', '中医',
                               '药学', '中药学', '法医学', '护理学', '临床医学',
                               '口腔医学', '公共事业', '图书情报', '物流', '工业工程',
                               '电子商务', '旅游管理', '酒店管理', '会展',
                               '针灸推拿', '英语', '中药制药'];

        for (let k = 0; k < majorKeywords.length; k++) {
          if (line.includes(majorKeywords[k])) return true;
        }

        return false;
      }

      function finalizeRecord(record, args) {
        return {
          year: args.year,
          school_name: args.schoolName,
          major_name: record.major_name || '',
          major_group: record.major_group || '',
          min_score: record.min_score === undefined ? null : record.min_score,
          min_rank: record.min_rank === undefined ? null : record.min_rank,
          person_count: record.person_count === undefined ? null : record.person_count,
          batch: record.batch || args.batch,
          major_description: record.major_description || '',
          subject_requirement: record.subject_requirement || '',
          province: args.province,
        };
      }

      // 去重
      const finalResults = [];
      const seen = {};

      for (let r = 0; r < results.length; r++) {
        const record = results[r];
        const key = record.major_name + '_' + (record.min_score || '') + '_' + (record.min_rank || '') + '_' + record.major_group;

        if (!seen[key]) {
          seen[key] = true;
          finalResults.push(record);
        }
      }

      return { results: finalResults, reason: '' };
    }, { schoolName, year, province, batch: BATCH });

    const records = data.results || [];

    if (data.reason) {
      console.log('    ⚠ ' + data.reason);
    }

    console.log('    ✓ 提取到 ' + records.length + ' 条数据');

    if (records.length > 0) {
      const sample = records[0];
      console.log('    📋 示例:', sample.major_name,
        '- 分数:', sample.min_score || '--',
        '- 位次:', sample.min_rank || '--',
        '- 人数:', sample.person_count || '--',
        '- 专业说明:', sample.major_description ? '有' : '无');
    }

    return records;
  } catch (e) {
    console.log('    ❌ 提取数据失败:', e.message.substring(0, 100));
    return [];
  }
}

async function saveRecords(records, province, schoolName, year) {
  const outputDir = path.join(__dirname, '..', 'data', getOutputDir(province));
  ensureDir(outputDir);
  
  const fileName = schoolName + '_' + year + '_专业分数线.json';
  const filePath = path.join(outputDir, fileName);
  
  const validRecords = records.filter(r => r.major_name && (r.min_score !== undefined || r.min_rank !== undefined));
  
  try {
    const jsonStr = JSON.stringify(validRecords, null, 2);
    JSON.parse(jsonStr);
    fs.writeFileSync(filePath, jsonStr, 'utf-8');
    console.log('    ✓ 已保存:', fileName, '(' + validRecords.length + '条)');
  } catch (e) {
    console.log('    ❌ 保存失败:', e.message);
  }
  
  return filePath;
}

async function main() {
  const args = process.argv.slice(2);
  // 参数1: 起始索引（数字）；兼容旧用法 "省份名 索引"
  let startIndex = 0;
  if (args.length > 0) {
    const n = parseInt(args[0]);
    if (!isNaN(n)) startIndex = n;
    else if (args.length > 1) { const n2 = parseInt(args[1]); if (!isNaN(n2)) startIndex = n2; }
  }

  console.log('='.repeat(70));
  console.log('🚀 高考专业分数线多省份采集工具 - Chrome优化版');
  console.log('🎯 采集省份(顺序): ' + PROVINCES.map(p => p.name).join(' → '));
  console.log('📅 采集年份:', YEARS.join(', '));
  console.log('='.repeat(70));

  // 合并所有省份的院校列表（去重）：同一院校页面只加载一次，依次切换地区采集
  const schoolSet = new Set();
  for (const prov of PROVINCES) {
    const file = path.join(__dirname, '..', 'data', prov.schoolsFile);
    if (!fs.existsSync(file)) {
      console.log('⚠ 院校列表文件不存在，跳过:', file);
      continue;
    }
    let content = fs.readFileSync(file, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const list = JSON.parse(content);
    for (const s of list) schoolSet.add(s);
  }
  const schools = Array.from(schoolSet);
  const schoolsToProcess = schools.slice(startIndex);

  console.log('📊 合并院校总数:', schools.length, '(去重后)');
  console.log('📍 起始索引:', startIndex, '(待处理:', schoolsToProcess.length, '所)');
  console.log('='.repeat(70));

  let { browser, page } = await setupBrowser();

  // 分省份统计
  const stats = {};
  for (const prov of PROVINCES) {
    stats[prov.name] = { success: 0, fail: 0, records: 0 };
  }

  try {
    for (let i = 0; i < schoolsToProcess.length; i++) {
      const schoolName = schoolsToProcess[i];
      const globalIndex = startIndex + i;

      // 检测页面/浏览器是否已关闭，若关闭则重新初始化
      if (!page || page.isClosed()) {
        console.log('\n⚠ 页面已关闭，重新初始化浏览器...');
        try { await browser.close(); } catch(e) {}
        const newBrowser = await setupBrowser();
        browser = newBrowser.browser;
        page = newBrowser.page;
        await page.waitForTimeout(2000);
      }

      console.log('\n[' + (globalIndex + 1) + '/' + schools.length + '] 📚 处理:', schoolName);

      try {
        // 步骤1: 访问院校页面一次（页面默认显示最新年份2025）
        const pageSuccess = await goToSchoolPage(page, schoolName, PROVINCES[0].name);
        if (!pageSuccess) {
          console.log('  ❌ 页面加载失败，跳过该院校');
          for (const prov of PROVINCES) stats[prov.name].fail++;
          continue;
        }

        // 步骤2: 切换到专业分数线Tab，等待区域加载完成
        await switchToMajorTab(page);

        // 步骤3: 确保专业分数线区域完全加载后再查找容器
        await page.waitForTimeout(1000);
        const selectorInfo = await findMajorScoreContainer(page);
        console.log('  📋 专业分数线选择器信息:', selectorInfo);

        // 步骤4: 依次切换地区采集各省份的数据（先海南，再天津）
        for (const prov of PROVINCES) {
          console.log('\n  🌏 ===== 采集 [' + prov.name + '] 数据 =====');
          let provHasData = false;
          let provRecords = 0;

          // 先切换地区到目标省份（切换一次，后续年份切换保持地区不变）
          if (selectorInfo.chengshiIdx >= 0) {
            await selectProvince(page, selectorInfo.containerIdx, selectorInfo.chengshiIdx, prov.name);
          } else {
            console.log('    ⚠ 未找到省份选择器按钮');
          }

          // 按年份采集，选择失败则跳过（该年份无招生计划）
          for (const year of YEARS) {
            console.log('  📅 [' + prov.name + '] ' + year + '年');

            // 选年份，选择失败说明该年份无招生计划，直接跳过
            const yearSelected = await selectYear(page, selectorInfo.containerIdx, selectorInfo.nianfenIdx, year);
            if (!yearSelected) {
              console.log('    ⏭ [' + prov.name + '] ' + year + '年无招生计划，跳过');
              continue;
            }
            // 选批次
            if (selectorInfo.piciIdx >= 0) {
              await selectBatch(page, selectorInfo.containerIdx, selectorInfo.piciIdx, BATCH);
            }

            // 点击查看全部（如果有）
            await clickViewAll(page);
            // 滚动卡片区域触发懒加载
            await scrollScoreCardToLoadAll(page);
            // 展开所有可展开元素
            await expandAllItems(page);
            // 等待数据加载完成
            await page.waitForTimeout(2000);

            const records = await extractData(page, schoolName, year, prov.name);

            // 如果第一次提取的数据偏少，再尝试点击查看全部并重新提取
            if (records.length < 5) {
              console.log('    ℹ 提取到 ' + records.length + ' 条数据偏少，尝试重新加载...');
              await clickViewAll(page);
              await scrollScoreCardToLoadAll(page);
              await expandAllItems(page);
              await page.waitForTimeout(2000);
              const records2 = await extractData(page, schoolName, year, prov.name);
              if (records2.length > records.length) {
                records.length = 0;
                records.push(...records2);
                console.log('    ✓ 重新加载后获取到 ' + records2.length + ' 条数据');
              }
            }

            if (records.length > 0) {
              await saveRecords(records, prov.name, schoolName, year);
              provRecords += records.length;
              provHasData = true;
            } else {
              console.log('    ⚠ [' + prov.name + '] ' + year + '年未获取到数据');
            }

            // 年份切换间隔
            await page.waitForTimeout(1500);
          }

          if (provHasData) {
            stats[prov.name].success++;
            stats[prov.name].records += provRecords;
            console.log('  ✅ [' + prov.name + '] 成功:', provRecords, '条数据');
          } else {
            stats[prov.name].fail++;
            console.log('  ⏭ [' + prov.name + '] 无数据，跳过');
          }

          // 省份切换间隔
          await page.waitForTimeout(1000);
        }
      } catch (schoolErr) {
        console.log('  ❌ 该院校处理出错:', schoolErr.message.substring(0, 100));
        for (const prov of PROVINCES) stats[prov.name].fail++;
        // 检测页面是否已关闭
        if (page && !page.isClosed()) {
          try { await page.waitForTimeout(1000); } catch(e) {}
        }
      }

      if ((globalIndex + 1) % 10 === 0) {
        console.log('\n' + '='.repeat(50));
        console.log('📈 进度:', (globalIndex + 1) + '/' + schools.length);
        for (const prov of PROVINCES) {
          console.log('  [' + prov.name + '] 成功:', stats[prov.name].success,
            '| 失败:', stats[prov.name].fail,
            '| 累计:', stats[prov.name].records, '条');
        }
        console.log('='.repeat(50));
      }

      // 院校切换间隔（检查页面是否可用）
      if (page && !page.isClosed()) {
        try { await page.waitForTimeout(1500); } catch(e) {}
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 采集完成！');
    for (const prov of PROVINCES) {
      console.log('📊 [' + prov.name + '] 成功院校:', stats[prov.name].success,
        '| 失败:', stats[prov.name].fail,
        '| 数据量:', stats[prov.name].records, '条');
    }
    console.log('='.repeat(70));

  } catch (e) {
    console.error('\n❌ 采集过程出错:', e);
  } finally {
    console.log('\n关闭浏览器...');
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch(e) {}
    try {
      await browser.close();
    } catch(e) {}
  }
}

main().catch(console.error);
