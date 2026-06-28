function extractCurrentPage() {
  const results = [];
  
  const url = window.location.href;
  const schoolMatch = url.match(/university_name=([^&]+)/);
  const schoolName = schoolMatch ? decodeURIComponent(schoolMatch[1]) : '未知院校';
  
  const yearMatch = url.match(/year[":]\s*["']?(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2025;
  
  console.log(`\n📊 提取数据: ${schoolName} (${year}年)`);
  
  const tables = document.querySelectorAll('table');
  console.log(`发现 ${tables.length} 个表格`);
  
  for (let t = 0; t < tables.length; t++) {
    const table = tables[t];
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;
    
    console.log(`\n表格 ${t + 1}: ${rows.length} 行`);
    
    const headers = [];
    rows[0].querySelectorAll('th, td').forEach(cell => {
      headers.push((cell.textContent || '').trim());
    });
    console.log('表头:', headers.join(', '));
    
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length < 2) continue;
      
      const record = {
        school_name: schoolName,
        year: year,
        province: '海南',
        batch: '本科批',
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
        } else if (header.includes('备注')) {
          record.remark = value;
        }
      });
      
      if (record.major_name && (record.min_score || record.min_rank)) {
        results.push(record);
      }
    }
  }
  
  if (results.length === 0) {
    console.log('\n⚠️ 未从表格提取到数据，尝试从列表提取...');
    
    const allItems = document.querySelectorAll('[class*="list-item"], [class*="item"], li');
    console.log(`发现 ${allItems.length} 个列表项`);
    
    for (const item of allItems) {
      const text = item.textContent || '';
      if (text.length < 5 || text.length > 500) continue;
      
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) continue;
      
      let majorName = '';
      let minScore = null;
      let minRank = null;
      let personCount = null;
      
      for (const line of lines) {
        const majorMatch = line.match(/^([^\d\n\s]{2,}(?:专业|学|工程|技术|管理|经济|法学|文学|理学|工学|医学|农学|军事|艺术|教育|历史|哲学)[^\d\n]*)$/);
        if (majorMatch && !majorName) {
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
      }
      
      if (!majorName && lines[0]) {
        const firstLine = lines[0];
        if (firstLine.length > 1 && firstLine.length < 50 && !/\d/.test(firstLine)) {
          majorName = firstLine;
        }
      }
      
      if ((minScore !== null || minRank !== null) && majorName) {
        results.push({
          school_name: schoolName,
          major_name: majorName,
          min_score: minScore,
          min_rank: minRank,
          person_count: personCount,
          year: year,
          province: '海南',
          batch: '本科批',
          source: '夸克高考'
        });
      }
    }
  }
  
  const uniqueResults = [];
  const seen = new Set();
  for (const r of results) {
    const key = r.major_name + '_' + (r.min_score || '') + '_' + (r.min_rank || '');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  }
  
  console.log(`\n✅ 共提取 ${uniqueResults.length} 条数据`);
  
  if (uniqueResults.length > 0) {
    console.log('\n数据预览:');
    console.table(uniqueResults.slice(0, 5));
  }
  
  window.__scrapedData = uniqueResults;
  return uniqueResults;
}

function downloadScrapedData() {
  if (!window.__scrapedData || window.__scrapedData.length === 0) {
    console.log('❌ 没有数据可下载，请先运行 extractCurrentPage()');
    return;
  }
  
  const json = JSON.stringify(window.__scrapedData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const schoolName = window.__scrapedData[0]?.school_name || '院校';
  const year = window.__scrapedData[0]?.year || '';
  a.download = `${schoolName}_${year}_专业分数线.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log('💾 数据已下载！');
}

console.log('%c🎉 简易数据提取工具已加载', 'color: #22c55e; font-size: 14px; font-weight: bold;');
console.log('%c💡 使用方法:', 'color: #3b82f6; font-weight: bold;');
console.log('   1. 先运行 extractCurrentPage() 提取当前页面数据');
console.log('   2. 数据预览没问题后，运行 downloadScrapedData() 下载');

extractCurrentPage();