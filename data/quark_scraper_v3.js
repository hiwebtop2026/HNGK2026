(function() {
  'use strict';

  const CONFIG = {
    years: [2025, 2024, 2023],
    province: '海南',
    batch: '本科批',
    genre: '综合',
    delay: 3000,
    timeout: 15000,
    maxRetry: 3
  };

  const SCHOOLS = [
    "三亚学院", "三峡大学", "华东理工大学", "清华大学", "北京大学", "上海交通大学",
    "复旦大学", "浙江大学", "南京大学", "武汉大学", "中山大学", "华南理工大学"
  ];

  let allData = [];
  let currentIndex = 0;
  let isRunning = false;
  let iframe = null;
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

  function initIframe() {
    if (iframe) {
      iframe.remove();
    }
    iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;display:none;';
    document.body.appendChild(iframe);
    return iframe;
  }

  async function loadPage(url) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('页面加载超时'));
      }, CONFIG.timeout);

      iframe.onload = function() {
        clearTimeout(timer);
        resolve(true);
      };

      iframe.onerror = function() {
        clearTimeout(timer);
        reject(new Error('页面加载失败'));
      };

      iframe.src = url;
    });
  }

  function extractMajorScoresFromIframe(schoolName, year) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const text = doc.body.innerText;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const results = [];

      const nonMajorNames = new Set([
        '普通类', '物理类', '历史类', '综合类', '艺术类', '体育类',
        '国家专项', '地方专项', '高校专项', '中外合作', '民族班',
        '预科班', '定向', '专项计划', '提前批', '本科批', '专科批',
        '专业组', '院校专业组', '海南', '普通招生', '招生类型',
        '最低分', '最低位次', '人数', '批次线差', '平均分', '最高分',
        '院校分数线', '专业分数线', '省控线', '查看全部', '录取线差'
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

      const uniqueResults = [];
      const seen = new Map();
      for (const r of results) {
        const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || '');
        if (!seen.has(key)) {
          seen.set(key, r);
          uniqueResults.push(r);
        }
      }

      return uniqueResults;
    } catch (e) {
      console.error(`❌ 提取数据失败:`, e.message);
      return [];
    }
  }

  function hasMajorScoreData() {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const text = doc.body.innerText;
      if (text.includes('暂无数据') || text.includes('没有相关数据') || 
          text.includes('暂无专业分数线') || text.includes('暂无录取分数线')) {
        return false;
      }
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
    } catch (e) {
      return false;
    }
  }

  async function scrapeSchool(schoolName) {
    console.log(`\n%c📚 处理院校: ${schoolName}`, 'color:#3b82f6;font-weight:bold');
    const schoolData = [];

    for (const year of CONFIG.years) {
      console.log(`  📅 ${year}年`);
      
      const url = buildSchoolUrl(schoolName, year);
      console.log(`    🔗 URL: ${url.slice(0, 80)}...`);
      
      let success = false;
      for (let retry = 0; retry < CONFIG.maxRetry; retry++) {
        try {
          await loadPage(url);
          await sleep(2000);
          
          if (!hasMajorScoreData()) {
            console.log(`    ⏭ ${year}年无数据，跳过`);
            success = true;
            break;
          }
          
          const records = extractMajorScoresFromIframe(schoolName, year);
          
          if (records.length > 0) {
            schoolData.push(...records);
            console.log(`    ✅ 提取到 ${records.length} 条数据`);
            records.slice(0, 3).forEach(r => {
              console.log(`      • ${r.major_name}: ${r.min_score}分 / ${r.min_rank}位次`);
            });
          } else {
            console.log(`    ⏭ ${year}年无专业数据，跳过`);
          }
          success = true;
          break;
        } catch (e) {
          console.log(`    ⚠ 加载失败 (${retry + 1}/${CONFIG.maxRetry}): ${e.message}`);
          if (retry < CONFIG.maxRetry - 1) {
            await sleep(3000);
          }
        }
      }
      
      if (!success) {
        console.log(`    ❌ ${year}年加载失败，跳过`);
      }
      
      await sleep(CONFIG.delay);
    }

    return schoolData;
  }

  function saveProgress() {
    try {
      localStorage.setItem('quark_scraper_v3_progress', JSON.stringify({
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
      const saved = localStorage.getItem('quark_scraper_v3_progress');
      if (saved) {
        const data = JSON.parse(saved);
        completedSchools = new Set(data.completedSchools || []);
        currentIndex = data.currentIndex || 0;
        allData = data.allData || [];
        successCount = data.successCount || 0;
        failCount = data.failCount || 0;
        globalDataKeys = new Set();
        allData.forEach(r => {
          globalDataKeys.add(r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || ''));
        });
        return data;
      }
    } catch (e) {}
    return null;
  }

  function deduplicateData() {
    const seen = new Map();
    const unique = [];
    for (const r of allData) {
      const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || '');
      if (!seen.has(key)) {
        seen.set(key, r);
        unique.push(r);
      }
    }
    const removed = allData.length - unique.length;
    allData = unique;
    globalDataKeys = new Set(unique.map(r => r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_description || '')));
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

  function showStats() {
    const schools = new Set(allData.map(d => d.school_name));
    const years = new Set(allData.map(d => d.year));
    const majors = new Set(allData.map(d => d.major_name));
    
    console.log('\n%c📊 数据统计', 'color:#f59e0b;font-size:16px;font-weight:bold');
    console.log(`  总数据量: ${allData.length} 条`);
    console.log(`  院校数: ${schools.size} 所`);
    console.log(`  专业数: ${majors.size} 个`);
    console.log(`  年份: ${Array.from(years).sort().join(', ')}`);
  }

  async function startScraping(startIndex = 0) {
    if (isRunning) {
      console.log('⚠️ 已经在运行中...');
      return;
    }

    if (SCHOOLS.length === 0) {
      console.log('❌ 没有院校列表！');
      return;
    }

    isRunning = true;
    initIframe();
    
    if (startIndex > 0) {
      currentIndex = startIndex;
    }

    console.log('\n' + '='.repeat(60));
    console.log('%c🚀 开始批量抓取专业分数线数据', 'color:#22c55e;font-size:18px;font-weight:bold');
    console.log('='.repeat(60));
    console.log(`  📊 共 ${SCHOOLS.length} 所院校, ${CONFIG.years.length} 个年份`);
    console.log(`  📍 从第 ${currentIndex + 1} 所开始: ${SCHOOLS[currentIndex]}`);
    console.log('='.repeat(60));

    for (let i = currentIndex; i < SCHOOLS.length && isRunning; i++) {
      currentIndex = i;
      const school = SCHOOLS[i];

      if (completedSchools.has(school)) {
        console.log(`\n⏭ 跳过已完成: ${school}`);
        continue;
      }

      try {
        const data = await scrapeSchool(school);
        
        if (data.length > 0) {
          let newCount = 0;
          for (const record of data) {
            const key = record.school_name + '|' + record.major_name + '|' + record.year + '|' + (record.major_description || '');
            if (!globalDataKeys.has(key)) {
              globalDataKeys.add(key);
              allData.push(record);
              newCount++;
            }
          }
          successCount++;
          completedSchools.add(school);
          if (newCount < data.length) {
            console.log(`  📊 新增 ${newCount} 条 (去重前 ${data.length} 条)`);
          }
        } else {
          failCount++;
          console.log(`  ⚠ 未获取到数据`);
        }
      } catch (e) {
        failCount++;
        console.log(`  ❌ 抓取出错: ${e.message}`);
      }

      saveProgress();
      console.log(`\n%c📈 进度: ${i + 1}/${SCHOOLS.length} | 成功: ${successCount} | 失败: ${failCount} | 总数据: ${allData.length}条`, 'color:#3b82f6;font-weight:bold');

      if (i < SCHOOLS.length - 1) {
        await sleep(CONFIG.delay);
      }
    }

    isRunning = false;
    
    if (iframe) {
      iframe.remove();
      iframe = null;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('%c✅ 抓取完成！', 'color:#22c55e;font-size:18px;font-weight:bold');
    console.log('='.repeat(60));
    console.log(`  📊 共获取 ${allData.length} 条专业分数线数据`);
    console.log(`  ✅ 成功: ${successCount} 所 | ❌ 失败: ${failCount} 所`);
    console.log('='.repeat(60));
    
    showStats();
  }

  function stopScraping() {
    isRunning = false;
    console.log('⏹ 正在停止...');
    if (iframe) {
      iframe.remove();
      iframe = null;
    }
  }

  async function testCurrent() {
    console.log('%c🧪 测试当前页面数据提取...', 'color:#f59e0b;font-weight:bold');
    
    const url = location.href;
    const schoolMatch = url.match(/university_name=([^&]+)/);
    const schoolName = schoolMatch ? decodeURIComponent(schoolMatch[1]) : '当前院校';
    
    const yearMatch = url.match(/year[":]\s*["']?(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 2025;
    
    initIframe();
    try {
      await loadPage(url);
      await sleep(2000);
      const data = extractMajorScoresFromIframe(schoolName, year);
      
      console.log(`\n✅ 测试完成，提取到 ${data.length} 条数据`);
      
      if (data.length > 0) {
        console.table(data.slice(0, 10));
        window.__testData = data;
      }
      return data;
    } catch (e) {
      console.error('❌ 测试失败:', e.message);
      return [];
    } finally {
      if (iframe) {
        iframe.remove();
        iframe = null;
      }
    }
  }

  function getProgress() {
    const saved = loadProgress();
    if (saved) {
      console.log(`\n📍 上次进度: 第 ${saved.currentIndex + 1} 所`);
      console.log(`   已完成: ${saved.completedSchools?.length || 0} 所`);
      console.log(`   时间: ${new Date(saved.timestamp).toLocaleString()}`);
    } else {
      console.log('没有保存的进度');
    }
    return saved;
  }

  function clearProgress() {
    localStorage.removeItem('quark_scraper_v3_progress');
    currentIndex = 0;
    completedSchools = new Set();
    allData = [];
    globalDataKeys = new Set();
    successCount = 0;
    failCount = 0;
    console.log('🗑 进度已清除');
  }

  console.log('\n' + '='.repeat(60));
  console.log('%c🎓 夸克高考专业分数线抓取工具 V3', 'color:#3b82f6;font-size:20px;font-weight:bold');
  console.log('='.repeat(60));
  console.log(`  📚 内置院校: ${SCHOOLS.length} 所`);
  console.log(`  📅 抓取年份: ${CONFIG.years.join(', ')}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('%c📖 使用方法:', 'color:#f59e0b;font-weight:bold');
  console.log('');
  console.log('  1️⃣  测试当前页面:');
  console.log('     QuarkScraper.test()');
  console.log('');
  console.log('  2️⃣  开始批量抓取:');
  console.log('     QuarkScraper.start()');
  console.log('');
  console.log('  3️⃣  从指定位置继续:');
  console.log('     QuarkScraper.resume()');
  console.log('');
  console.log('  4️⃣  其他命令:');
  console.log('     QuarkScraper.stats()      - 查看统计');
  console.log('     QuarkScraper.download()   - 下载数据');
  console.log('     QuarkScraper.dedup()      - 手动去重');
  console.log('     QuarkScraper.stop()       - 停止抓取');
  console.log('     QuarkScraper.progress()   - 查看进度');
  console.log('     QuarkScraper.clear()      - 清除进度');
  console.log('');
  console.log('='.repeat(60));
  console.log('%c💡 建议先运行 QuarkScraper.test() 测试当前页面', 'color:#22c55e;font-weight:bold');
  console.log('='.repeat(60) + '\n');

  window.QuarkScraper = {
    config: CONFIG,
    schools: SCHOOLS,
    allData: () => allData,
    isRunning: () => isRunning,
    currentIndex: () => currentIndex,

    test: testCurrent,
    start: startScraping,
    resume: () => {
      const saved = loadProgress();
      const idx = saved ? saved.currentSchoolIndex || saved.currentIndex || 0 : 0;
      console.log(`🔄 从第 ${idx + 1} 所继续...`);
      startScraping(idx);
    },
    stop: stopScraping,
    download: downloadData,
    stats: showStats,
    progress: getProgress,
    clear: clearProgress,
    dedup: deduplicateData
  };
})();