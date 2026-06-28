(function() {
  'use strict';

  const CONFIG = {
    years: [2025, 2024, 2023],
    province: '海南',
    batch: '本科批',
    genre: '综合',
    delay: 2000,
  };

  const SCHOOLS = [
    "三亚学院", "三峡大学", "华东理工大学", "清华大学", "北京大学", "上海交通大学",
    "复旦大学", "浙江大学", "南京大学", "武汉大学", "中山大学", "华南理工大学"
  ];

  let allData = [];
  let currentIndex = 0;
  let isRunning = false;
  let currentTab = null;
  let successCount = 0;
  let failCount = 0;
  let completedSchools = new Set();
  let globalDataKeys = new Set();

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function buildSchoolUrl(schoolName, year) {
    const params = JSON.stringify({
      province: CONFIG.province,
      year: String(year),
      batch: CONFIG.batch,
      genre: CONFIG.genre
    });

    const url = new URL('https://vt.quark.cn/blm/gaokao-college-794/tab');
    url.searchParams.set('app', 'fen_shu_xian');
    url.searchParams.set('university_name', schoolName);
    url.searchParams.set('q', schoolName);
    url.searchParams.set('params', params);
    url.searchParams.set('uc_biz_str', 'qk_enable_gesture%3Atrue%7COPT%3AW_ENTER_ANI%401%7COPT%3ATOOLBAR_STYLE%400%7COPT%3AW_PAGE_REFRESH%400%7COPT%3ABACK_BTN_STYLE%400%7COPT%3AIMMERSIVE%401%7COPT%3AW_PAGE_REFRESH%400');
    url.searchParams.set('device', 'mobile');
    url.searchParams.set('bar', 'pure');
    url.searchParams.set('by', 'tuijian');
    url.searchParams.set('by2', 'general_entity_college');
    url.searchParams.set('from', 'kkframenew_gaokaopd_chadaxue');
    url.searchParams.set('uc_param_str', 'ntnwvepffrbiprsvchutosstxskp');

    return url.toString();
  }

  function getSchoolName() {
    const url = window.location.href;
    const match = url.match(/university_name=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
    
    const titleEl = document.querySelector('.qk-title-text');
    if (titleEl) return titleEl.innerText.trim();
    
    return '未知院校';
  }

  function getCurrentYear() {
    const url = window.location.href;
    const match = url.match(/year[":]\s*["']?(\d{4})/);
    if (match) return parseInt(match[1]);
    return 2025;
  }

  function extractMajorScoresFromDOM(schoolName, year) {
    console.log(`  🔍 开始从DOM提取专业分数线数据...`);
    const results = [];

    const listItems = document.querySelectorAll('[class*="content-List-li"]');
    console.log(`  📋 找到 ${listItems.length} 个列表项`);

    listItems.forEach((item, idx) => {
      try {
        const majorEl = item.querySelector('[class*="content-List-major"]');
        const scoreEl = item.querySelector('[class*="content-List-low_score"]');
        const rankEl = item.querySelector('[class*="content-List-low_rank"]');
        const countEl = item.querySelector('[class*="content-List-luqurenshu"]');
        const diffEl = item.querySelector('[class*="content-List-low_score_diff"]');
        const subTitleEl = item.querySelector('[class*="content-List-subTitle"]');

        const majorName = majorEl ? majorEl.innerText.trim() : '';
        const scoreText = scoreEl ? scoreEl.innerText.trim() : '';
        const rankText = rankEl ? rankEl.innerText.trim() : '';
        const countText = countEl ? countEl.innerText.trim() : '';
        const diffText = diffEl ? diffEl.innerText.trim() : '';
        const subTitleText = subTitleEl ? subTitleEl.innerText.trim() : '';

        const scoreMatch = scoreText.match(/(\d{2,3})/);
        const rankMatch = rankText.match(/(\d{3,7})/);
        const countMatch = countText.match(/(\d+)/);
        const diffMatch = diffText.match(/(\d+)/);

        if (!majorName || majorName.length < 2) return;
        if (!scoreMatch && !rankMatch) return;

        const skipMajors = ['普通招生', '招生类型', '最低分', '最低位次', '人数', '批次线差', '专业'];
        if (skipMajors.some(s => majorName.includes(s))) return;

        const minScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
        const minRank = rankMatch ? parseInt(rankMatch[1]) : null;
        const personCount = countMatch ? parseInt(countMatch[1]) : null;
        const batchLineDiff = diffMatch ? parseInt(diffMatch[1]) : null;

        if (minScore !== null && (minScore < 100 || minScore > 900)) return;
        if (minRank !== null && (minRank < 10 || minRank > 100000)) return;

        let subjectReq = '';
        let majorGroup = '';
        
        if (subTitleText) {
          const groupMatch = subTitleText.match(/专业组([^\-]+)/);
          if (groupMatch) majorGroup = '专业组' + groupMatch[1].trim();
          
          if (subTitleText.includes('必选') || subTitleText.includes('选科') || subTitleText.includes('科目')) {
            subjectReq = subTitleText;
          }
        }

        let batch = CONFIG.batch;
        const allText = item.innerText;
        if (allText.includes('本科批')) batch = '本科批';
        else if (allText.includes('专科批')) batch = '专科批';
        else if (allText.includes('提前批')) batch = '提前批';

        const record = {
          school_name: schoolName,
          major_name: majorName,
          major_group: majorGroup || undefined,
          min_score: minScore,
          min_rank: minRank,
          person_count: personCount,
          batch_line_diff: batchLineDiff,
          batch: batch,
          subject_requirement: subjectReq || undefined,
          province: CONFIG.province,
          year: year,
          source: '夸克高考'
        };

        results.push(record);
      } catch (e) {
        console.warn(`  ⚠ 第 ${idx + 1} 项解析失败:`, e.message);
      }
    });

    if (results.length === 0) {
      console.log(`  ⚠ DOM提取失败，尝试文本提取...`);
      return extractFromText(schoolName, year);
    }

    const uniqueResults = deduplicate(results);
    console.log(`  ✅ 提取到 ${uniqueResults.length} 条专业数据`);
    return uniqueResults;
  }

  function extractFromText(schoolName, year) {
    const text = document.body.innerText;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const results = [];

    const nonMajorNames = new Set([
      '普通类', '物理类', '历史类', '综合类', '艺术类', '体育类',
      '国家专项', '地方专项', '高校专项', '中外合作', '民族班',
      '预科班', '定向', '专项计划', '提前批', '本科批', '专科批',
      '专业组', '院校专业组', '海南', '普通招生', '招生类型',
      '最低分', '最低位次', '人数', '批次线差', '平均分', '最高分',
      '院校分数线', '专业分数线', '省控线', '查看全部', '录取线差',
      '招生资讯', '开设专业', '招生计划', '毕业去向', '大家都在看'
    ]);

    const majorCategoryKeywords = ['类', '班', '专业', '试验', '工程', '技术', 
                                   '管理', '经济', '文学', '理学', '法学',
                                   '医学', '教育', '艺术', '历史', '哲学',
                                   '农学', '军事', '学', '系'];

    for (let i = 0; i < lines.length - 4; i++) {
      const line = lines[i];
      
      if (line.length < 2 || line.length > 30) continue;
      if (/^\d+$/.test(line)) continue;
      if (nonMajorNames.has(line)) continue;
      if (/^专业组\s*\(\d+\)/.test(line)) continue;
      if (/^\d+批次?$/.test(line)) continue;

      const scoreMatch = lines[i + 1]?.match(/^(\d{2,3})$/);
      if (!scoreMatch) continue;
      
      const rankMatch = lines[i + 2]?.match(/^(\d{3,7})$/);
      if (!rankMatch) continue;
      
      const minScore = parseInt(scoreMatch[1]);
      const minRank = parseInt(rankMatch[1]);
      
      if (minScore < 100 || minScore > 900) continue;
      if (minRank < 10 || minRank > 100000) continue;

      let personCount = null;
      let batchLineDiff = null;
      let batch = '';
      let subjectReq = '';
      let majorDesc = '';
      
      if (lines[i + 3] && /^\d+$/.test(lines[i + 3])) {
        personCount = parseInt(lines[i + 3]);
      }
      
      if (lines[i + 4] && /^\d+$/.test(lines[i + 4])) {
        batchLineDiff = parseInt(lines[i + 4]);
      }
      
      for (let j = i + 3; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].includes('本科') || lines[j].includes('专科')) {
          if (!batch) batch = lines[j];
        }
        if (lines[j].includes('选科') || lines[j].includes('科目') || 
            (lines[j].includes('要求') && lines[j].length < 30)) {
          subjectReq = lines[j].replace(/^(选科要求|科目要求|选课要求|选科)[：:]\s*/, '');
        }
        if ((lines[j].startsWith('(') || lines[j].includes('包含专业') || 
             lines[j].includes('专业:')) && lines[j].length > 5) {
          if (!majorDesc) majorDesc = lines[j];
        }
      }
      
      const majorName = line;
      const looksLikeMajor = majorCategoryKeywords.some(kw => majorName.includes(kw)) ||
                            majorDesc || subjectReq ||
                            (personCount !== null && personCount > 0);

      if (majorName && majorName.length > 1 && majorName.length < 35 && 
          /[\u4e00-\u9fa5]/.test(majorName) && looksLikeMajor) {
        const record = {
          school_name: schoolName,
          major_name: majorName,
          major_description: majorDesc || undefined,
          min_score: minScore,
          min_rank: minRank,
          person_count: personCount,
          batch_line_diff: batchLineDiff,
          batch: batch || CONFIG.batch,
          subject_requirement: subjectReq || undefined,
          province: CONFIG.province,
          year: year,
          source: '夸克高考'
        };
        results.push(record);
      }
    }

    const uniqueResults = deduplicate(results);
    console.log(`  ✅ 文本提取到 ${uniqueResults.length} 条专业数据`);
    return uniqueResults;
  }

  function deduplicate(results) {
    const uniqueResults = [];
    const seen = new Map();
    for (const r of results) {
      const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || '') + '|' + (r.major_group || '');
      if (!seen.has(key)) {
        seen.set(key, r);
        uniqueResults.push(r);
      } else {
        const existing = seen.get(key);
        if (!existing.major_description && r.major_description) {
          existing.major_description = r.major_description;
        }
        if (!existing.subject_requirement && r.subject_requirement) {
          existing.subject_requirement = r.subject_requirement;
        }
        if (existing.person_count === null && r.person_count !== null) {
          existing.person_count = r.person_count;
        }
        if (existing.min_score === null && r.min_score !== null) {
          existing.min_score = r.min_score;
        }
        if (existing.min_rank === null && r.min_rank !== null) {
          existing.min_rank = r.min_rank;
        }
      }
    }
    return uniqueResults;
  }

  function hasMajorScoreData() {
    const text = document.body.innerText;
    if (text.includes('暂无数据') || text.includes('没有相关数据') || 
        text.includes('暂无专业分数线') || text.includes('暂无录取分数线')) {
      return false;
    }
    const listItems = document.querySelectorAll('[class*="content-List-li"]');
    if (listItems.length >= 3) return true;
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let scoreCount = 0;
    let rankCount = 0;
    for (const line of lines) {
      if (/^\d{2,3}$/.test(line) && parseInt(line) >= 100 && parseInt(line) <= 900) {
        scoreCount++;
      }
      if (/^\d{3,7}$/.test(line) && parseInt(line) >= 100) {
        rankCount++;
      }
    }
    return scoreCount >= 2 && rankCount >= 2;
  }

  async function switchToMajorTab() {
    console.log(`  🎯 尝试切换到"专业分数线"标签...`);
    
    const tabs = document.querySelectorAll('[class*="qk-tabs-tab"]');
    for (const tab of tabs) {
      if (tab.innerText.includes('专业分数线') || tab.innerText.includes('专业')) {
        tab.click();
        await sleep(1500);
        console.log(`  ✅ 已切换到专业分数线标签`);
        return true;
      }
    }
    
    const zhuanyeTab = document.querySelector('[class*="zhuanye"]');
    if (zhuanyeTab) {
      zhuanyeTab.click();
      await sleep(1500);
      console.log(`  ✅ 已通过class切换到专业分数线标签`);
      return true;
    }
    
    console.log(`  ⚠ 未找到专业分数线标签，尝试在当前页面提取`);
    return false;
  }

  async function scrapeCurrentPage() {
    const schoolName = getSchoolName();
    const year = getCurrentYear();
    
    console.log(`\n%c📚 提取: ${schoolName} (${year}年)`, 'color:#3b82f6;font-weight:bold');
    
    await switchToMajorTab();
    
    if (!hasMajorScoreData()) {
      console.log(`  ⏭ 暂无专业分数线数据`);
      return [];
    }
    
    const records = extractMajorScoresFromDOM(schoolName, year);
    
    if (records.length > 0 && records.length <= 10) {
      console.table(records);
    } else if (records.length > 10) {
      console.table(records.slice(0, 10));
      console.log(`  ... 共 ${records.length} 条`);
    }
    
    return records;
  }

  function openNewTab(url) {
    return new Promise((resolve, reject) => {
      try {
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          resolve(newWindow);
        } else {
          reject(new Error('无法打开新窗口（可能被弹窗拦截）'));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  async function scrapeSchoolInNewTab(schoolName) {
    console.log(`\n%c📚 处理院校: ${schoolName}`, 'color:#3b82f6;font-weight:bold');
    const schoolData = [];

    for (const year of CONFIG.years) {
      console.log(`  📅 ${year}年`);
      
      const url = buildSchoolUrl(schoolName, year);
      
      try {
        if (!currentTab || currentTab.closed) {
          currentTab = await openNewTab(url);
          console.log(`    🪟 已打开新标签页`);
        } else {
          currentTab.location.href = url;
        }
        
        await sleep(3000);
        
        try {
          const tabDoc = currentTab.document;
          const text = tabDoc.body.innerText;
          
          if (text.includes('暂无数据') || text.includes('没有相关数据')) {
            console.log(`    ⏭ ${year}年无数据，跳过`);
            continue;
          }
          
          const listItems = tabDoc.querySelectorAll('[class*="content-List-li"]');
          if (listItems.length < 2) {
            console.log(`    ⏭ ${year}年数据不足，跳过`);
            continue;
          }
          
          const results = [];
          listItems.forEach((item) => {
            const majorEl = item.querySelector('[class*="content-List-major"]');
            const scoreEl = item.querySelector('[class*="content-List-low_score"]');
            const rankEl = item.querySelector('[class*="content-List-low_rank"]');
            const countEl = item.querySelector('[class*="content-List-luqurenshu"]');
            const diffEl = item.querySelector('[class*="content-List-low_score_diff"]');

            const majorName = majorEl ? majorEl.innerText.trim() : '';
            const scoreText = scoreEl ? scoreEl.innerText.trim() : '';
            const rankText = rankEl ? rankEl.innerText.trim() : '';
            const countText = countEl ? countEl.innerText.trim() : '';
            const diffText = diffEl ? diffEl.innerText.trim() : '';

            const scoreMatch = scoreText.match(/(\d{2,3})/);
            const rankMatch = rankText.match(/(\d{3,7})/);
            const countMatch = countText.match(/(\d+)/);
            const diffMatch = diffText.match(/(\d+)/);

            if (!majorName || majorName.length < 2) return;
            if (!scoreMatch && !rankMatch) return;

            const skipMajors = ['普通招生', '招生类型', '最低分', '最低位次', '人数', '批次线差', '专业'];
            if (skipMajors.some(s => majorName.includes(s))) return;

            const minScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
            const minRank = rankMatch ? parseInt(rankMatch[1]) : null;
            const personCount = countMatch ? parseInt(countMatch[1]) : null;
            const batchLineDiff = diffMatch ? parseInt(diffMatch[1]) : null;

            if (minScore !== null && (minScore < 100 || minScore > 900)) return;
            if (minRank !== null && (minRank < 10 || minRank > 100000)) return;

            results.push({
              school_name: schoolName,
              major_name: majorName,
              min_score: minScore,
              min_rank: minRank,
              person_count: personCount,
              batch_line_diff: batchLineDiff,
              batch: CONFIG.batch,
              province: CONFIG.province,
              year: year,
              source: '夸克高考'
            });
          });
          
          if (results.length > 0) {
            schoolData.push(...deduplicate(results));
            console.log(`    ✅ 提取到 ${results.length} 条数据`);
          }
        } catch (e) {
          console.log(`    ⚠ 跨域无法访问新标签页内容: ${e.message}`);
          console.log(`    💡 提示: 请使用"当前页面提取"模式`);
          break;
        }
        
        await sleep(CONFIG.delay);
      } catch (e) {
        console.log(`    ❌ ${year}年失败: ${e.message}`);
      }
    }

    return schoolData;
  }

  function saveProgress() {
    try {
      localStorage.setItem('quark_scraper_final_progress', JSON.stringify({
        currentIndex,
        completedSchools: Array.from(completedSchools),
        allData,
        successCount,
        failCount,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('⚠️ 保存进度失败', e.message);
    }
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('quark_scraper_final_progress');
      if (saved) {
        const data = JSON.parse(saved);
        completedSchools = new Set(data.completedSchools || []);
        currentIndex = data.currentIndex || 0;
        allData = data.allData || [];
        successCount = data.successCount || 0;
        failCount = data.failCount || 0;
        globalDataKeys = new Set();
        allData.forEach(r => {
          globalDataKeys.add(r.school_name + '|' + r.major_name + '|' + r.year);
        });
        return data;
      }
    } catch (e) {}
    return null;
  }

  function deduplicateAll() {
    const seen = new Map();
    const unique = [];
    for (const r of allData) {
      const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_group || '') + '|' + (r.major_description || '');
      if (!seen.has(key)) {
        seen.set(key, r);
        unique.push(r);
      }
    }
    const removed = allData.length - unique.length;
    allData = unique;
    console.log(`✅ 去重完成，移除 ${removed} 条重复数据，剩余 ${allData.length} 条`);
    return removed;
  }

  function downloadData() {
    if (allData.length === 0) {
      console.log('❌ 没有数据可下载');
      return;
    }
    
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `夸克高考专业分数线_${CONFIG.province}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log('%c💾 数据已下载！共 ' + allData.length + ' 条', 'color:#22c55e;font-weight:bold');
  }

  function downloadCurrent() {
    const data = extractMajorScoresFromDOM(getSchoolName(), getCurrentYear());
    if (data.length === 0) {
      console.log('❌ 当前页面没有提取到数据');
      return;
    }
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${getSchoolName()}_${getCurrentYear()}_专业分数线.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log(`%c💾 已下载 ${data.length} 条数据`, 'color:#22c55e;font-weight:bold');
  }

  function showStats() {
    const schools = new Set(allData.map(d => d.school_name));
    const years = new Set(allData.map(d => d.year));
    const majors = new Set(allData.map(d => d.major_name));
    
    console.log('\n%c📊 数据统计', 'color:#f59e0b;font-size:16px;font-weight:bold');
    console.log(`  总数据量: ${allData.length} 条`);
    console.log(`  院校数: ${schools.size} 所`);
    console.log(`  专业数: ${majors.size} 个`);
    console.log(`  年份: ${Array.from(years).sort().join(', ')}`);
    
    const byYear = {};
    allData.forEach(d => {
      byYear[d.year] = (byYear[d.year] || 0) + 1;
    });
    console.log('  按年份统计:');
    Object.entries(byYear).sort().forEach(([year, count]) => {
      console.log(`    ${year}年: ${count} 条`);
    });
  }

  function addCurrentToAll() {
    const data = extractMajorScoresFromDOM(getSchoolName(), getCurrentYear());
    if (data.length === 0) {
      console.log('❌ 当前页面没有提取到数据');
      return;
    }
    
    let newCount = 0;
    for (const record of data) {
      const key = record.school_name + '|' + record.major_name + '|' + record.year;
      if (!globalDataKeys.has(key)) {
        globalDataKeys.add(key);
        allData.push(record);
        newCount++;
      }
    }
    
    completedSchools.add(record.school_name);
    saveProgress();
    console.log(`✅ 已添加 ${newCount} 条新数据，总数据: ${allData.length} 条`);
  }

  function clearProgress() {
    localStorage.removeItem('quark_scraper_final_progress');
    currentIndex = 0;
    completedSchools = new Set();
    allData = [];
    globalDataKeys = new Set();
    successCount = 0;
    failCount = 0;
    console.log('🗑 进度已清除');
  }

  console.log('\n' + '='.repeat(60));
  console.log('%c🎓 夸克高考专业分数线抓取工具 (最终版)', 'color:#3b82f6;font-size:20px;font-weight:bold');
  console.log('='.repeat(60));
  console.log(`  📍 省份: ${CONFIG.province} | 批次: ${CONFIG.batch}`);
  console.log(`  📅 年份: ${CONFIG.years.join(', ')}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('%c📖 使用方法:', 'color:#f59e0b;font-weight:bold');
  console.log('');
  console.log('  1️⃣  提取当前页面:');
  console.log('     QuarkScraper.extract()');
  console.log('');
  console.log('  2️⃣  下载当前页面数据:');
  console.log('     QuarkScraper.downloadCurrent()');
  console.log('');
  console.log('  3️⃣  添加当前页面到总数据:');
  console.log('     QuarkScraper.addCurrent()');
  console.log('');
  console.log('  4️⃣  下载全部数据:');
  console.log('     QuarkScraper.download()');
  console.log('');
  console.log('  5️⃣  查看统计:');
  console.log('     QuarkScraper.stats()');
  console.log('');
  console.log('  6️⃣  清除进度:');
  console.log('     QuarkScraper.clear()');
  console.log('');
  console.log('='.repeat(60));
  console.log('%c💡 手动操作模式：逐院校切换页面，运行 extract() + addCurrent()', 'color:#22c55e;font-weight:bold');
  console.log('='.repeat(60) + '\n');

  window.QuarkScraper = {
    config: CONFIG,
    schools: SCHOOLS,
    allData: () => allData,
    isRunning: () => isRunning,
    currentIndex: () => currentIndex,

    extract: scrapeCurrentPage,
    downloadCurrent: downloadCurrent,
    addCurrent: addCurrentToAll,
    download: downloadData,
    stats: showStats,
    clear: clearProgress,
    dedup: deduplicateAll
  };
})();