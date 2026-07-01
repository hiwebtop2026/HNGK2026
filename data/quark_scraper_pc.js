(function() {
  'use strict';

  const SCRIPT_KEY = 'quark_scraper_pc_loaded';

  if (window[SCRIPT_KEY]) {
    console.log('%c⚠️ 脚本已加载，直接使用 QuarkScraperPC.extract()', 'color:#f59e0b;font-weight:bold');
    return;
  }

  window[SCRIPT_KEY] = true;
  console.clear();

  const CONFIG = {
    province: '海南',
    batch: '本科批',
    defaultYear: 2025
  };

  let allData = [];
  let globalDataKeys = new Set();
  let downloadedSchools = new Set();
  let lastExtractTime = 0;

  function getSchoolName() {
    const selectors = ['.qk-title-text', '.university-name', '.school-name', 'h1.qk-title-text'];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.innerText.trim();
        if (text && text.length >= 2 && text.length <= 30 && /[\u4e00-\u9fa5]/.test(text) &&
            (text.includes('大学') || text.includes('学院') || text.includes('学校'))) {
          return text.replace(/[（(].*?[）)]/g, '').trim();
        }
      }
    }
    const url = window.location.href;
    const paramMatch = url.match(/[?&]university_name=([^&]+)/);
    if (paramMatch) {
      const name = decodeURIComponent(paramMatch[1]);
      if (name && name.length > 1) return name;
    }
    return '未知院校';
  }

  function getCurrentYear() {
    const yearBtns = document.querySelectorAll('.select-tabs-tab-nianfen .qk-button-title');
    for (const btn of yearBtns) {
      const text = btn.innerText.trim();
      const match = text.match(/(\d{4})/);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 2020 && year <= 2030) return year;
      }
    }
    const url = window.location.href;
    const paramMatch = url.match(/[?&]params=([^&]+)/);
    if (paramMatch) {
      try {
        const params = JSON.parse(decodeURIComponent(paramMatch[1]));
        if (params.year) return parseInt(params.year);
      } catch (e) {}
    }
    return CONFIG.defaultYear;
  }

  function extractFromTable() {
    const results = [];
    const listItems = document.querySelectorAll('.content-List-li');

    let currentSubjectReq = '';

    listItems.forEach((item) => {
      try {
        const majorEl = item.querySelector('.content-List-major');
        const scoreEl = item.querySelector('.content-List-low_score');
        const rankEl = item.querySelector('.content-List-low_rank');
        const countEl = item.querySelector('.content-List-luqurenshu');
        const subTitleEl = item.querySelector('.content-List-subTitle');
        const descEl = item.querySelector('.qk-margin-top-s');

        if (subTitleEl) {
          const subTitleText = subTitleEl.innerText.trim();
          if (subTitleText.includes('专业组') || subTitleText.includes('选科') || subTitleText.includes('科目')) {
            currentSubjectReq = subTitleText;
          }
        }

        if (!majorEl) return;

        const majorName = (majorEl.innerText || majorEl.textContent || '').trim();
        if (!majorName || majorName.length < 2) return;

        const skipWords = ['普通招生', '招生类型', '最低分', '最低位次', '人数', '批次线差', '专业'];
        if (skipWords.some(w => majorName.includes(w))) return;

        const scoreText = (scoreEl ? scoreEl.innerText.trim() : '');
        const rankText = (rankEl ? rankEl.innerText.trim() : '');
        const countText = (countEl ? countEl.innerText.trim() : '');

        const scoreMatch = scoreText.match(/(\d{2,3})/);
        const rankMatch = rankText.match(/(\d{3,7})/);
        const countMatch = countText.match(/(\d+)/);

        if (!scoreMatch && !rankMatch) return;

        const minScore = scoreMatch ? parseInt(scoreMatch[1]) : null;
        const minRank = rankMatch ? parseInt(rankMatch[1]) : null;
        const personCount = countMatch ? parseInt(countMatch[1]) : null;

        if (minScore !== null && (minScore < 100 || minScore > 900)) return;
        if (minRank !== null && (minRank < 10 || minRank > 100000)) return;

        let majorDesc = '';
        if (descEl) {
          majorDesc = descEl.innerText.trim();
        }

        const record = {
          school_name: '',
          major_name: majorName,
          major_group: undefined,
          major_description: majorDesc || undefined,
          min_score: minScore,
          min_rank: minRank,
          person_count: personCount,
          batch: CONFIG.batch,
          subject_requirement: currentSubjectReq || undefined,
          province: CONFIG.province,
          year: 0,
          source: '夸克高考'
        };

        if (currentSubjectReq.includes('专业组')) {
          const groupMatch = currentSubjectReq.match(/专业组(\d+)/);
          if (groupMatch) {
            record.major_group = '专业组' + groupMatch[1];
          }
        }

        if (!record.subject_requirement && majorDesc.includes('选科')) {
          const reqMatch = majorDesc.match(/选科要求[:：]?\s*(.+)/);
          if (reqMatch) {
            record.subject_requirement = reqMatch[1].trim();
          }
        }

        results.push(record);
      } catch (e) {}
    });

    return results;
  }

  function extractCurrentPage() {
    const now = Date.now();
    if (now - lastExtractTime < 1000) {
      console.log('%c⚠️ 提取操作过于频繁，请稍后再试', 'color:#f59e0b;font-weight:bold');
      return window.__scraperData || [];
    }
    lastExtractTime = now;

    const schoolName = getSchoolName();
    const year = getCurrentYear();

    console.log('\n' + '='.repeat(60));
    console.log(`%c🎓 ${schoolName} ${year}年 专业分数线提取`, 'color:#3b82f6;font-size:16px;font-weight:bold');
    console.log('='.repeat(60));

    const results = extractFromTable();

    results.forEach(r => {
      r.school_name = schoolName;
      r.year = year;
    });

    const uniqueResults = deduplicate(results);

    console.log(`%c✅ 提取到 ${uniqueResults.length} 条数据`, 'color:#22c55e;font-weight:bold');
    console.log('='.repeat(60));

    if (uniqueResults.length > 0) {
      uniqueResults.forEach((r, i) => {
        const parts = [`${i + 1}. ${r.major_name}`];
        if (r.major_group) parts.push(`[${r.major_group}]`);
        if (r.min_score) parts.push(`- ${r.min_score}分`);
        if (r.min_rank) parts.push(`- ${r.min_rank}位次`);
        if (r.person_count !== null) parts.push(`- ${r.person_count}人`);
        if (r.subject_requirement) parts.push(`- ${r.subject_requirement}`);
        console.log(parts.join(' '));
        if (r.major_description) {
          console.log('   说明:', r.major_description);
        }
      });
    }

    window.__scraperData = uniqueResults;
    return uniqueResults;
  }

  function deduplicate(results) {
    const unique = [];
    const seen = new Map();
    for (const r of results) {
      const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_group || '');
      if (!seen.has(key)) {
        seen.set(key, r);
        unique.push(r);
      } else {
        const existing = seen.get(key);
        if (!existing.min_score && r.min_score) existing.min_score = r.min_score;
        if (!existing.min_rank && r.min_rank) existing.min_rank = r.min_rank;
        if (!existing.subject_requirement && r.subject_requirement) existing.subject_requirement = r.subject_requirement;
        if (!existing.major_description && r.major_description) existing.major_description = r.major_description;
      }
    }
    return unique;
  }

  function downloadData() {
    const data = window.__scraperData || [];
    if (data.length === 0) {
      console.log('❌ 没有数据，先运行 extract()');
      return;
    }

    const schoolName = data[0]?.school_name || '院校';
    const year = data[0]?.year || '';
    const downloadKey = schoolName + '|' + year;

    if (downloadedSchools.has(downloadKey)) {
      console.log(`%c⚠️ ${schoolName}(${year}年) 已下载，运行 resetDownloadStatus() 可重新下载`, 'color:#f59e0b;font-weight:bold');
      return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${schoolName}_${year}_专业分数线.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    downloadedSchools.add(downloadKey);
    saveDownloadStatus();

    console.log(`%c💾 已下载 ${data.length} 条数据`, 'color:#22c55e;font-weight:bold');
  }

  function resetDownloadStatus() {
    downloadedSchools.clear();
    localStorage.removeItem('quark_scraper_downloaded');
    console.log('🔄 下载状态已重置');
  }

  function addToAll() {
    const data = window.__scraperData || [];
    if (data.length === 0) {
      console.log('❌ 没有数据可添加');
      return;
    }

    let newCount = 0;
    for (const record of data) {
      const key = record.school_name + '|' + record.major_name + '|' + record.year + '|' + (record.major_group || '');
      if (!globalDataKeys.has(key)) {
        globalDataKeys.add(key);
        allData.push(record);
        newCount++;
      }
    }

    console.log(`✅ 已添加 ${newCount} 条，总计 ${allData.length} 条`);
    saveProgress();
  }

  function downloadAll() {
    if (allData.length === 0) {
      console.log('❌ 没有数据');
      return;
    }

    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `夸克高考专业分数线_${CONFIG.province}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log(`%c💾 已下载全部 ${allData.length} 条数据`, 'color:#22c55e;font-weight:bold');
  }

  function showStats() {
    const schools = new Set(allData.map(d => d.school_name));
    const years = new Set(allData.map(d => d.year));
    console.log(`\n📊 统计：${allData.length}条数据，${schools.size}所院校，${years.size}年`);
  }

  function saveProgress() {
    try {
      localStorage.setItem('quark_scraper_pc_progress', JSON.stringify({ allData, timestamp: Date.now() }));
    } catch (e) {}
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('quark_scraper_pc_progress');
      if (saved) {
        const data = JSON.parse(saved);
        allData = data.allData || [];
        globalDataKeys = new Set();
        allData.forEach(r => {
          globalDataKeys.add(r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_group || ''));
        });
        if (allData.length > 0) console.log(`📂 已加载 ${allData.length} 条历史数据`);
      }
    } catch (e) {}
  }

  function saveDownloadStatus() {
    try {
      localStorage.setItem('quark_scraper_downloaded', JSON.stringify(Array.from(downloadedSchools)));
    } catch (e) {}
  }

  function loadDownloadStatus() {
    try {
      const saved = localStorage.getItem('quark_scraper_downloaded');
      if (saved) {
        downloadedSchools = new Set(JSON.parse(saved));
        if (downloadedSchools.size > 0) console.log(`📂 ${downloadedSchools.size} 所院校已下载`);
      }
    } catch (e) {}
  }

  function clearProgress() {
    localStorage.removeItem('quark_scraper_pc_progress');
    allData = [];
    globalDataKeys = new Set();
    console.log('🗑 进度已清除');
  }

  function reset() {
    window[SCRIPT_KEY] = false;
    localStorage.removeItem('quark_scraper_pc_progress');
    localStorage.removeItem('quark_scraper_downloaded');
    allData = [];
    globalDataKeys = new Set();
    downloadedSchools = new Set();
    console.log('🔄 已完全重置');
  }

  console.log('%c✅ 夸克高考提取脚本已加载 [' + new Date().toLocaleTimeString() + ']', 'color:#22c55e;font-weight:bold');
  console.log('   使用: QuarkScraperPC.extract() → QuarkScraperPC.download()');

  loadProgress();
  loadDownloadStatus();

  window.QuarkScraperPC = {
    extract: extractCurrentPage,
    download: downloadData,
    add: addToAll,
    downloadAll: downloadAll,
    stats: showStats,
    clear: clearProgress,
    resetDownloadStatus: resetDownloadStatus,
    reset: reset
  };
})();
