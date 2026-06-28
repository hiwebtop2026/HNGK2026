// ============================================================
// 夸克高考专业分数线自动抓取工具 (浏览器控制台版)
// 使用方法：
// 1. 在Edge浏览器中打开任意一个夸克高考院校页面
// 2. 按 F12 打开开发者工具
// 3. 切换到 Console (控制台) 标签
// 4. 把下面所有代码复制粘贴进去，按回车运行
// 5. 脚本会自动抓取所有院校数据，最后下载为JSON文件
// ============================================================

(function() {
  'use strict';

  // ========== 配置 ==========
  const CONFIG = {
    years: [2025, 2024, 2023],
    province: '海南',
    batch: '本科批',
    genre: '综合',
    delayBetweenSchools: 2000,  // 院校之间延迟(毫秒)
    delayBetweenYears: 1500,    // 年份之间延迟(毫秒)
    maxSchools: 0,  // 最多抓取多少所，0表示全部
  };

  // 院校列表（从Excel提取的943所）
  const SCHOOLS = [
    // 这里会在运行时动态获取，或者用户手动添加
  ];

  let allData = [];
  let currentSchoolIndex = 0;
  let isRunning = false;

  // ========== 工具函数 ==========
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getCurrentSchoolName() {
    const url = window.location.href;
    const match = url.match(/university_name=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return '';
  }

  function getCurrentYear() {
    const url = window.location.href;
    const match = url.match(/year[":]\s*["']?(\d{4})/);
    if (match) return parseInt(match[1]);
    
    const yearBtns = document.querySelectorAll('[class*="year"], [class*="nianfen"]');
    for (const btn of yearBtns) {
      const text = btn.textContent || '';
      const m = text.match(/(\d{4})/);
      if (m && (btn.classList.contains('active') || btn.classList.contains('selected'))) {
        return parseInt(m[1]);
      }
    }
    
    return 2025;
  }

  function buildSchoolUrl(schoolName, year) {
    const params = JSON.stringify({
      province: CONFIG.province,
      year: String(year),
      batch: CONFIG.batch,
      genre: CONFIG.genre
    });

    return (
      'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian' +
      `&university_name=${encodeURIComponent(schoolName)}` +
      `&q=${encodeURIComponent(schoolName)}` +
      '&uc_biz_str=qk_enable_gesture%3Atrue%7COPT%3AW_ENTER_ANI%401%7COPT%3ATOOLBAR_STYLE%400%7COPT%3AW_PAGE_REFRESH%400%7COPT%3ABACK_BTN_STYLE%400%7COPT%3AIMMERSIVE%401%7COPT%3AW_PAGE_REFRESH%400' +
      '&device=pc' +
      '&bar=pure' +
      '&by=tuijian' +
      '&by2=general_entity_college' +
      `&params=${encodeURIComponent(params)}` +
      '&type=zhuanye' +
      '&uc_param_str=ntnwvepffrbiprsvchutosstxskp'
    );
  }

  // ========== 页面操作 ==========
  
  async function switchToMajorTab() {
    console.log('  → 切换到专业分数线Tab...');
    
    const tabs = document.querySelectorAll('[class*="tab"], [role="tab"]');
    for (const tab of tabs) {
      const text = (tab.textContent || '').trim();
      if (text.includes('专业分数线') || text === '专业分数线') {
        tab.click();
        await sleep(2000);
        console.log('    ✓ 已切换');
        return true;
      }
    }
    
    const allClickable = document.querySelectorAll('div, span, button, a');
    for (const el of allClickable) {
      const text = (el.textContent || '').trim();
      if (text === '专业分数线' || (text.length <= 10 && text.includes('专业') && text.includes('分数线'))) {
        const style = window.getComputedStyle(el);
        if (style.cursor === 'pointer' || el.onclick || el.closest('[role="tab"]')) {
          el.click();
          await sleep(2000);
          console.log('    ✓ 已切换');
          return true;
        }
      }
    }
    
    console.log('    ⚠ 未找到Tab，可能已经在专业分数线页');
    return false;
  }

  async function clickViewAll() {
    console.log('  → 点击查看全部...');
    
    const allBtns = document.querySelectorAll('button, a, div, span');
    for (const btn of allBtns) {
      const text = (btn.textContent || '').trim();
      if (text === '查看全部' || text === '全部') {
        const style = window.getComputedStyle(btn);
        if (style.cursor === 'pointer' || btn.onclick || btn.tagName === 'BUTTON' || btn.tagName === 'A') {
          btn.click();
          await sleep(2500);
          console.log('    ✓ 已点击');
          return true;
        }
      }
    }
    
    const moreBtns = document.querySelectorAll('[class*="more"], [class*="all"], [class*="More"], [class*="All"]');
    for (const btn of moreBtns) {
      const text = (btn.textContent || '').trim();
      if (text.includes('全部') || text.includes('more')) {
        btn.click();
        await sleep(2500);
        console.log('    ✓ 已点击');
        return true;
      }
    }
    
    console.log('    ⚠ 未找到查看全部按钮');
    return false;
  }

  // ========== 数据提取 ==========
  
  function extractMajorScores(schoolName, year) {
    console.log('  → 提取专业分数线数据...');
    
    const results = [];
    
    // 方法1: 从列表项提取
    const allItems = document.querySelectorAll('[class*="list-item"], [class*="List-item"], [class*="item"], li');
    
    for (const item of allItems) {
      const text = item.textContent || '';
      if (text.length < 5 || text.length > 500) continue;
      
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) continue;
      
      let majorName = '';
      let minScore = null;
      let minRank = null;
      let personCount = null;
      let majorGroup = '';
      let subjectReq = '';
      let avgScore = null;
      let batchLineDiff = null;
      
      for (const line of lines) {
        const majorMatch = line.match(/^(.+?专业.*?)$/);
        if (majorMatch && !majorName && line.length > 2 && line.length < 50) {
          majorName = majorMatch[1].trim();
        }
        
        const scoreMatch = line.match(/(\d{2,3})\s*分/);
        if (scoreMatch && minScore === null) {
          minScore = parseInt(scoreMatch[1]);
        }
        
        const rankMatch = line.match(/(\d{3,6})\s*位次/);
        if (rankMatch && minRank === null) {
          minRank = parseInt(rankMatch[1]);
        }
        
        const countMatch = line.match(/(\d+)\s*人/);
        if (countMatch && personCount === null) {
          personCount = parseInt(countMatch[1]);
        }
        
        const groupMatch = line.match(/专业组([^，。\s]+)/);
        if (groupMatch && !majorGroup) {
          majorGroup = '专业组' + groupMatch[1].trim();
        }
        
        const subjectMatch = line.match(/(?:选科|科目|要求)[：:]\s*(.+)/);
        if (subjectMatch && !subjectReq) {
          subjectReq = subjectMatch[1].trim();
        }
      }
      
      if (!majorName && lines[0]) {
        const firstLine = lines[0];
        if (firstLine.length > 1 && firstLine.length < 50 && !/\d/.test(firstLine)) {
          majorName = firstLine;
        }
      }
      
      if ((minScore !== null || minRank !== null) && majorName) {
        const record = {
          school_name: schoolName,
          major_name: majorName,
          min_score: minScore,
          min_rank: minRank,
          avg_score: avgScore,
          person_count: personCount,
          major_group: majorGroup || undefined,
          subject_requirement: subjectReq || undefined,
          batch_line_diff: batchLineDiff || undefined,
          province: CONFIG.province,
          year: year,
          batch: CONFIG.batch,
          source: '夸克高考'
        };
        
        results.push(record);
      }
    }
    
    // 方法2: 从表格提取
    const tables = document.querySelectorAll('table');
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      if (rows.length < 2) continue;
      
      const headers = [];
      rows[0].querySelectorAll('th, td').forEach(cell => {
        headers.push((cell.textContent || '').trim());
      });
      
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length < 2) continue;
        
        const record = {
          school_name: schoolName,
          province: CONFIG.province,
          year: year,
          batch: CONFIG.batch,
          source: '夸克高考'
        };
        
        cells.forEach((cell, idx) => {
          if (idx >= headers.length) return;
          const header = headers[idx];
          const value = (cell.textContent || '').trim();
          
          if (header.includes('专业') && !header.includes('组')) {
            record.major_name = value;
          } else if (header.includes('专业组')) {
            record.major_group = value;
          } else if (header.includes('最低分') || (header.includes('分') && !header.includes('位次') && !header.includes('差'))) {
            const num = parseInt(value);
            if (!isNaN(num)) record.min_score = num;
          } else if (header.includes('位次') || header.includes('排名')) {
            const num = parseInt(value);
            if (!isNaN(num)) record.min_rank = num;
          } else if (header.includes('平均分') || header.includes('均分')) {
            const num = parseInt(value);
            if (!isNaN(num)) record.avg_score = num;
          } else if (header.includes('科目') || header.includes('选科') || header.includes('要求')) {
            record.subject_requirement = value;
          } else if (header.includes('人数') || header.includes('计划')) {
            const num = parseInt(value);
            if (!isNaN(num)) record.person_count = num;
          }
        });
        
        if (record.major_name && (record.min_score || record.min_rank)) {
          results.push(record);
        }
      }
    }
    
    // 去重
    const uniqueResults = [];
    const seen = new Set();
    for (const r of results) {
      const key = r.major_name + '_' + r.min_score + '_' + r.min_rank;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(r);
      }
    }
    
    console.log(`    ✓ 提取到 ${uniqueResults.length} 条数据`);
    return uniqueResults;
  }

  // ========== 抓取单所院校 ==========
  
  async function scrapeSchool(schoolName) {
    console.log(`\n📚 处理院校: ${schoolName}`);
    const schoolData = [];
    
    for (const year of CONFIG.years) {
      console.log(`  📅 ${year}年`);
      
      const url = buildSchoolUrl(schoolName, year);
      window.location.href = url;
      
      await sleep(4000);
      
      await switchToMajorTab();
      await clickViewAll();
      await sleep(1500);
      
      const records = extractMajorScores(schoolName, year);
      if (records.length > 0) {
        schoolData.push(...records);
        console.log('    数据预览:');
        records.slice(0, 2).forEach((r, i) => {
          console.log(`      ${i+1}. ${r.major_name} - ${r.min_score || '--'}分 - ${r.min_rank || '--'}位次`);
        });
      }
      
      await sleep(CONFIG.delayBetweenYears);
    }
    
    return schoolData;
  }

  // ========== 批量抓取 ==========
  
  async function startScraping() {
    if (isRunning) {
      console.log('⚠ 已经在运行中...');
      return;
    }
    
    if (SCHOOLS.length === 0) {
      console.log('❌ 没有院校列表！');
      console.log('请先运行 addSchools([...]) 添加院校名称');
      return;
    }
    
    isRunning = true;
    allData = [];
    currentSchoolIndex = 0;
    
    const totalSchools = CONFIG.maxSchools > 0 ? Math.min(CONFIG.maxSchools, SCHOOLS.length) : SCHOOLS.length;
    
    console.log('='.repeat(60));
    console.log('🚀 开始批量抓取专业分数线数据');
    console.log(`📊 共 ${totalSchools} 所院校, ${CONFIG.years.length} 个年份`);
    console.log(`⏱ 预计时间: ${Math.ceil(totalSchools * (CONFIG.years.length * 8 + 2) / 60)} 分钟`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    for (let i = 0; i < totalSchools; i++) {
      currentSchoolIndex = i;
      const school = SCHOOLS[i];
      
      try {
        const data = await scrapeSchool(school);
        allData.push(...data);
      } catch (e) {
        console.error(`  ❌ 抓取出错: ${e.message}`);
      }
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const progress = ((i + 1) / totalSchools * 100).toFixed(1);
      console.log(`\n📈 进度: ${i+1}/${totalSchools} (${progress}%) | 已获取 ${allData.length} 条数据 | 用时 ${Math.floor(elapsed/60)}分${elapsed%60}秒`);
      
      await sleep(CONFIG.delayBetweenSchools);
    }
    
    isRunning = false;
    console.log('\n' + '='.repeat(60));
    console.log('✅ 抓取完成！');
    console.log(`📊 共获取 ${allData.length} 条专业分数线数据`);
    console.log('='.repeat(60));
    
    downloadData();
  }

  // ========== 数据导出 ==========
  
  function downloadData() {
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `夸克高考专业分数线_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('💾 数据文件已下载！');
  }

  function copyData() {
    const json = JSON.stringify(allData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      console.log('📋 数据已复制到剪贴板！');
    }).catch(() => {
      console.log('❌ 复制失败');
    });
  }

  function showStats() {
    const schools = new Set(allData.map(d => d.school_name));
    const years = new Set(allData.map(d => d.year));
    console.log('\n📊 数据统计:');
    console.log(`  总数据量: ${allData.length} 条`);
    console.log(`  院校数: ${schools.size} 所`);
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

  // ========== 添加院校 ==========
  
  function addSchools(schoolArray) {
    const before = SCHOOLS.length;
    schoolArray.forEach(s => {
      if (s && s.trim() && !SCHOOLS.includes(s.trim())) {
        SCHOOLS.push(s.trim());
      }
    });
    console.log(`✅ 已添加 ${SCHOOLS.length - before} 所院校，共 ${SCHOOLS.length} 所`);
  }

  // ========== 暴露到全局 ==========
  
  window.QuarkScraper = {
    config: CONFIG,
    schools: SCHOOLS,
    allData: allData,
    isRunning: isRunning,
    currentSchoolIndex: currentSchoolIndex,
    
    addSchools: addSchools,
    start: startScraping,
    stop: function() { isRunning = false; console.log('⏹ 已停止'); },
    download: downloadData,
    copy: copyData,
    stats: showStats,
    
    scrapeCurrent: async function() {
      const name = getCurrentSchoolName() || '当前院校';
      const year = getCurrentYear();
      console.log(`\n📚 抓取当前页面: ${name} (${year}年)`);
      await switchToMajorTab();
      await clickViewAll();
      await sleep(1000);
      const data = extractMajorScores(name, year);
      allData.push(...data);
      console.log(`\n✅ 完成，共 ${data.length} 条数据`);
      return data;
    },
    
    test: async function() {
      console.log('🧪 测试当前页面的数据提取...');
      const name = getCurrentSchoolName() || '测试院校';
      const year = getCurrentYear();
      const data = extractMajorScores(name, year);
      console.log(`\n✅ 测试完成，提取到 ${data.length} 条数据`);
      if (data.length > 0) {
        console.table(data.slice(0, 5));
      }
      return data;
    }
  };

  // ========== 初始化提示 ==========
  
  console.log('\n' + '='.repeat(60));
  console.log('🎓 夸克高考专业分数线自动抓取工具 已加载');
  console.log('='.repeat(60));
  console.log('\n📖 使用方法:');
  console.log('');
  console.log('1️⃣  首先添加院校列表:');
  console.log('   QuarkScraper.addSchools(["清华大学", "北京大学", ...])');
  console.log('');
  console.log('2️⃣  测试当前页面:');
  console.log('   QuarkScraper.test()');
  console.log('');
  console.log('3️⃣  开始批量抓取:');
  console.log('   QuarkScraper.start()');
  console.log('');
  console.log('4️⃣  其他命令:');
  console.log('   QuarkScraper.stats()   - 查看统计');
  console.log('   QuarkScraper.download() - 下载数据');
  console.log('   QuarkScraper.copy()     - 复制到剪贴板');
  console.log('   QuarkScraper.stop()     - 停止抓取');
  console.log('');
  console.log('='.repeat(60));
  console.log('💡 先确保在专业分数线页面，然后运行 QuarkScraper.test() 测试一下');
  console.log('='.repeat(60) + '\n');

})();
