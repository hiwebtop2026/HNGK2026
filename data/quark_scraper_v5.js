(function() {
  'use strict';

  const CONFIG = {
    province: '海南',
    batch: '本科批',
    defaultYear: 2025
  };

  let allData = [];
  let globalDataKeys = new Set();

  function getSchoolName() {
    const url = window.location.href;
    
    const paramMatch = url.match(/[?&]university_name=([^&]+)/);
    if (paramMatch) {
      const name = decodeURIComponent(paramMatch[1]);
      if (name && name.length > 1) return name;
    }

    const qMatch = url.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const name = decodeURIComponent(qMatch[1]);
      if (name && name.length > 1 && !name.includes('高考')) return name;
    }

    const titleSelectors = [
      '.qk-title-text',
      '.university-name',
      '.school-name',
      '.college-name',
      '[class*="title"] [class*="text"]',
      'h1', 'h2'
    ];
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.innerText.trim();
        if (text && text.length >= 2 && text.length <= 30 && 
            /[\u4e00-\u9fa5]/.test(text) &&
            (text.includes('大学') || text.includes('学院') || text.includes('学校'))) {
          return text.replace(/[（(].*?[）)]/g, '').trim();
        }
      }
    }

    const pageText = document.body.innerText;
    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l);
    for (const line of lines.slice(0, 50)) {
      if (line.length >= 4 && line.length <= 30 && 
          /[\u4e00-\u9fa5]/.test(line) &&
          (line.endsWith('大学') || line.endsWith('学院')) &&
          !line.includes('排名') && !line.includes('分数') && !line.includes('位次')) {
        return line;
      }
    }

    const docTitle = document.title;
    const titleMatch = docTitle.match(/([^-|_—\s]+(?:大学|学院))/);
    if (titleMatch) {
      return titleMatch[1];
    }

    return '未知院校';
  }

  function getCurrentYear() {
    const url = window.location.href;
    
    const paramMatch = url.match(/[?&]params=([^&]+)/);
    if (paramMatch) {
      try {
        const params = JSON.parse(decodeURIComponent(paramMatch[1]));
        if (params.year) return parseInt(params.year);
      } catch (e) {}
    }

    const yearMatch = url.match(/[?&]year[=:]["']?(\d{4})/);
    if (yearMatch) return parseInt(yearMatch[1]);

    const pageText = document.body.innerText;
    const textYearMatch = pageText.match(/(\d{4})\s*年/);
    if (textYearMatch) {
      const year = parseInt(textYearMatch[1]);
      if (year >= 2020 && year <= 2030) return year;
    }

    const yearBtns = document.querySelectorAll('[class*="year"], [class*="nian"]');
    for (const btn of yearBtns) {
      const text = btn.innerText.trim();
      const match = text.match(/(\d{4})/);
      if (match) {
        const year = parseInt(match[1]);
        if (year >= 2020 && year <= 2030) return year;
      }
    }

    return CONFIG.defaultYear;
  }

  function parseMajorItem(text, schoolName, year) {
    const result = {
      school_name: schoolName,
      major_name: '',
      major_category: '',
      min_score: null,
      min_rank: null,
      subject_requirement: '',
      province: CONFIG.province,
      year: year,
      batch: CONFIG.batch,
      source: '夸克高考'
    };

    const categoryMatch = text.match(/\[([^\]]+类[^\]]*)\]/);
    if (categoryMatch) {
      result.major_category = categoryMatch[1].trim();
    }

    const scoreMatch = text.match(/(\d{2,3})\s*分/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[1]);
      if (score >= 100 && score <= 900) {
        result.min_score = score;
      }
    }

    const rankMatch = text.match(/(\d{2,6})\s*位次/);
    if (rankMatch) {
      const rank = parseInt(rankMatch[1]);
      if (rank >= 1 && rank <= 100000) {
        result.min_rank = rank;
      }
    }

    const subjectPatterns = [
      /(物\+化|物\+生|物\+政|物\+地|化\+生|化\+政|化\+地|生\+政|生\+地|政\+地)[(（](\d+科必选|2科必选|1科必选)[)）]/,
      /(物理|化学|生物|政治|历史|地理)\s*\+\s*(物理|化学|生物|政治|历史|地理)[(（](\d+科必选)[)）]/,
      /(不限|物理必选|化学必选|生物必选|政治必选|历史必选|地理必选)/,
      /选科要求[:：]\s*([^\n]+)/,
      /科目要求[:：]\s*([^\n]+)/
    ];
    for (const pattern of subjectPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.subject_requirement = match[0].trim();
        break;
      }
    }

    let majorName = text;
    majorName = majorName.replace(/\[.*?\]/g, '');
    majorName = majorName.replace(/\d{2,3}\s*分/g, '');
    majorName = majorName.replace(/\d{2,6}\s*位次/g, '');
    majorName = majorName.replace(/(物\+化|物\+生|物\+政|物\+地|化\+生|化\+政|化\+地|生\+政|生\+地|政\+地)\s*[(（]?\d*科?必选?[)）]?/g, '');
    majorName = majorName.replace(/(不限|物理必选|化学必选|生物必选|政治必选|历史必选|地理必选)/g, '');
    majorName = majorName.replace(/选科要求[:：]?/g, '');
    majorName = majorName.replace(/科目要求[:：]?/g, '');
    majorName = majorName.replace(/^[\s\d.、\-]+/, '');
    majorName = majorName.replace(/[\s\-—–·]+$/, '');
    majorName = majorName.trim();

    if (majorName.length > 1 && majorName.length < 100) {
      result.major_name = majorName;
    }

    if (result.major_name && (result.min_score !== null || result.min_rank !== null)) {
      return result;
    }
    return null;
  }

  function extractFromDOM(schoolName, year) {
    console.log('  🔍 从DOM提取数据...');
    const results = [];

    const selectors = [
      '[class*="content-List-li"]',
      '[class*="list-item"]',
      '[class*="major-item"]',
      '[class*="score-item"]',
      'li',
      '[class*="item"]'
    ];

    for (const selector of selectors) {
      const items = document.querySelectorAll(selector);
      console.log(`    选择器 ${selector}: ${items.length} 个元素`);
      
      items.forEach((item) => {
        try {
          const text = item.innerText || item.textContent || '';
          if (text.length < 5 || text.length > 500) return;
          if (!text.includes('分') && !text.includes('位次')) return;

          const lines = text.split('\n').map(l => l.trim()).filter(l => l);
          
          if (lines.length >= 2) {
            let majorName = '';
            let majorCategory = '';
            let minScore = null;
            let minRank = null;
            let subjectReq = '';
            let personCount = null;

            for (const line of lines) {
              const scoreMatch = line.match(/^(\d{2,3})$/);
              if (scoreMatch && minScore === null) {
                const score = parseInt(scoreMatch[1]);
                if (score >= 100 && score <= 900) minScore = score;
              }
              
              const rankMatch = line.match(/^(\d{2,6})$/);
              if (rankMatch && minRank === null) {
                const rank = parseInt(rankMatch[1]);
                if (rank >= 10 && rank <= 100000 && !scoreMatch) minRank = rank;
              }

              const countMatch = line.match(/^(\d+)\s*人?$/);
              if (countMatch && personCount === null) {
                personCount = parseInt(countMatch[1]);
              }

              const catMatch = line.match(/\[([^\]]+类[^\]]*)\]/);
              if (catMatch && !majorCategory) {
                majorCategory = catMatch[1].trim();
              }

              if ((line.includes('必选') || line.includes('不限') || line.includes('选科')) && 
                  line.length < 50 && !subjectReq) {
                subjectReq = line.trim();
              }

              if (!majorName && line.length >= 2 && line.length <= 50 &&
                  /[\u4e00-\u9fa5]/.test(line) &&
                  !line.includes('分') && !line.includes('位次') &&
                  !line.includes('人数') && !line.includes('计划') &&
                  !/^\d+$/.test(line) &&
                  !line.includes('必选') && !line.includes('不限') &&
                  !line.includes('选科') && !line.includes('科目')) {
                majorName = line;
              }
            }

            if (!majorName && lines[0]) {
              majorName = lines[0].replace(/^\d+[.、]\s*/, '').trim();
            }

            if (majorName && (minScore !== null || minRank !== null)) {
              results.push({
                school_name: schoolName,
                major_name: majorName,
                major_category: majorCategory || undefined,
                min_score: minScore,
                min_rank: minRank,
                person_count: personCount,
                subject_requirement: subjectReq || undefined,
                province: CONFIG.province,
                year: year,
                batch: CONFIG.batch,
                source: '夸克高考'
              });
            }
          }
        } catch (e) {}
      });

      if (results.length >= 5) break;
    }

    return deduplicate(results);
  }

  function extractFromText(schoolName, year) {
    console.log('  📝 从页面文本提取数据...');
    const results = [];
    const text = document.body.innerText;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    const scoreLinePattern = /^(.+?)\s+(\d{2,3})\s*分\s+(\d{2,6})\s*位次/;
    const bracketPattern = /^(\d+)[.、]\s*(.+?)\s*\[(.+?)\]\s*[-–—]\s*(\d{2,3})分\s*[-–—]\s*(\d{2,6})位次\s*[-–—]\s*(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const bracketMatch = line.match(bracketPattern);
      if (bracketMatch) {
        const majorName = bracketMatch[2].trim();
        const majorCategory = bracketMatch[3].trim();
        const score = parseInt(bracketMatch[4]);
        const rank = parseInt(bracketMatch[5]);
        const subjectReq = bracketMatch[6].trim();

        if (majorName && score >= 100 && score <= 900) {
          results.push({
            school_name: schoolName,
            major_name: majorName,
            major_category: majorCategory,
            min_score: score,
            min_rank: rank,
            subject_requirement: subjectReq,
            province: CONFIG.province,
            year: year,
            batch: CONFIG.batch,
            source: '夸克高考'
          });
          continue;
        }
      }

      const scoreMatch = line.match(scoreLinePattern);
      if (scoreMatch) {
        let majorName = scoreMatch[1].trim();
        const score = parseInt(scoreMatch[2]);
        const rank = parseInt(scoreMatch[3]);

        majorName = majorName.replace(/^\d+[.、]\s*/, '');
        const catMatch = majorName.match(/\[([^\]]+)\]/);
        let majorCategory = '';
        if (catMatch) {
          majorCategory = catMatch[1].trim();
          majorName = majorName.replace(/\[.*?\]/, '').trim();
        }

        if (majorName && majorName.length > 1 && score >= 100 && score <= 900) {
          const record = {
            school_name: schoolName,
            major_name: majorName,
            min_score: score,
            min_rank: rank,
            province: CONFIG.province,
            year: year,
            batch: CONFIG.batch,
            source: '夸克高考'
          };
          if (majorCategory) record.major_category = majorCategory;
          results.push(record);
        }
      }
    }

    return deduplicate(results);
  }

  function deduplicate(results) {
    const unique = [];
    const seen = new Map();
    for (const r of results) {
      const key = r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_category || '');
      if (!seen.has(key)) {
        seen.set(key, r);
        unique.push(r);
      } else {
        const existing = seen.get(key);
        if (!existing.min_score && r.min_score) existing.min_score = r.min_score;
        if (!existing.min_rank && r.min_rank) existing.min_rank = r.min_rank;
        if (!existing.subject_requirement && r.subject_requirement) existing.subject_requirement = r.subject_requirement;
        if (!existing.major_category && r.major_category) existing.major_category = r.major_category;
        if (existing.person_count === null && r.person_count !== null) existing.person_count = r.person_count;
      }
    }
    return unique;
  }

  function extractCurrentPage() {
    const schoolName = getSchoolName();
    const year = getCurrentYear();

    console.log('\n' + '='.repeat(60));
    console.log(`%c🎓 夸克高考专业分数线提取 v5`, 'color:#3b82f6;font-size:16px;font-weight:bold');
    console.log('='.repeat(60));
    console.log(`%c📚 院校: ${schoolName}`, 'color:#22c55e;font-weight:bold');
    console.log(`%c📅 年份: ${year}`, 'color:#22c55e;font-weight:bold');
    console.log('='.repeat(60));

    let results = extractFromDOM(schoolName, year);
    
    if (results.length === 0) {
      console.log('  ⚠️ DOM提取失败，尝试文本提取...');
      results = extractFromText(schoolName, year);
    }

    console.log(`\n%c✅ 提取到 ${results.length} 条专业数据`, 'color:#22c55e;font-weight:bold;font-size:14px');
    console.log('='.repeat(60));

    if (results.length > 0) {
      results.forEach((r, i) => {
        const parts = [];
        parts.push(`${i + 1}. ${r.major_name}`);
        if (r.major_category) parts.push(`[${r.major_category}]`);
        if (r.min_score) parts.push(`- ${r.min_score}分`);
        if (r.min_rank) parts.push(`- ${r.min_rank}位次`);
        if (r.subject_requirement) parts.push(`- ${r.subject_requirement}`);
        console.log(parts.join(' '));
      });
      console.log('='.repeat(60));

      if (results.length <= 15) {
        console.log('\n📋 详细数据:');
        console.table(results);
      }
    }

    window.__scraperData = results;
    return results;
  }

  function downloadData() {
    const data = window.__scraperData || [];
    if (data.length === 0) {
      console.log('❌ 没有数据可下载，请先运行 extract()');
      return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const schoolName = data[0]?.school_name || '院校';
    const year = data[0]?.year || '';
    a.download = `${schoolName}_${year}_专业分数线.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    console.log(`%c💾 已下载 ${data.length} 条数据`, 'color:#22c55e;font-weight:bold');
  }

  function addToAll() {
    const data = window.__scraperData || [];
    if (data.length === 0) {
      console.log('❌ 没有数据可添加');
      return;
    }

    let newCount = 0;
    for (const record of data) {
      const key = record.school_name + '|' + record.major_name + '|' + record.year + '|' + (record.major_category || '');
      if (!globalDataKeys.has(key)) {
        globalDataKeys.add(key);
        allData.push(record);
        newCount++;
      }
    }

    console.log(`✅ 已添加 ${newCount} 条新数据，总数据: ${allData.length} 条`);
    saveProgress();
  }

  function downloadAll() {
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
    console.log(`%c💾 已下载全部 ${allData.length} 条数据`, 'color:#22c55e;font-weight:bold');
  }

  function showStats() {
    const schools = new Set(allData.map(d => d.school_name));
    const years = new Set(allData.map(d => d.year));
    const majors = new Set(allData.map(d => d.major_name));

    console.log('\n' + '='.repeat(50));
    console.log('%c📊 数据统计', 'color:#f59e0b;font-size:16px;font-weight:bold');
    console.log('='.repeat(50));
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
    console.log('='.repeat(50));
  }

  function saveProgress() {
    try {
      localStorage.setItem('quark_scraper_v5_progress', JSON.stringify({
        allData,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('quark_scraper_v5_progress');
      if (saved) {
        const data = JSON.parse(saved);
        allData = data.allData || [];
        globalDataKeys = new Set();
        allData.forEach(r => {
          globalDataKeys.add(r.school_name + '|' + r.major_name + '|' + r.year + '|' + (r.major_category || ''));
        });
        console.log(`📂 已加载进度，共 ${allData.length} 条数据`);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function clearProgress() {
    localStorage.removeItem('quark_scraper_v5_progress');
    allData = [];
    globalDataKeys = new Set();
    console.log('🗑 进度已清除');
  }

  console.log('\n' + '='.repeat(60));
  console.log('%c🎓 夸克高考专业分数线提取工具 v5', 'color:#3b82f6;font-size:18px;font-weight:bold');
  console.log('='.repeat(60));
  console.log('');
  console.log('%c📖 使用方法:', 'color:#f59e0b;font-weight:bold');
  console.log('');
  console.log('  1️⃣  提取当前页面:');
  console.log('     QuarkScraper.extract()');
  console.log('');
  console.log('  2️⃣  下载当前页面数据:');
  console.log('     QuarkScraper.download()');
  console.log('');
  console.log('  3️⃣  添加当前页面到总数据:');
  console.log('     QuarkScraper.add()');
  console.log('');
  console.log('  4️⃣  下载全部数据:');
  console.log('     QuarkScraper.downloadAll()');
  console.log('');
  console.log('  5️⃣  查看统计:');
  console.log('     QuarkScraper.stats()');
  console.log('');
  console.log('  6️⃣  清除进度:');
  console.log('     QuarkScraper.clear()');
  console.log('');
  console.log('='.repeat(60));
  console.log('%c💡 提示: 切换到"专业分数线"标签页后运行 extract()', 'color:#22c55e;font-weight:bold');
  console.log('='.repeat(60) + '\n');

  loadProgress();

  window.QuarkScraper = {
    config: CONFIG,
    extract: extractCurrentPage,
    download: downloadData,
    add: addToAll,
    downloadAll: downloadAll,
    stats: showStats,
    clear: clearProgress,
    getAllData: () => allData,
    getCurrentData: () => window.__scraperData || []
  };
})();
