// 夸克高考专业分数线数据提取脚本
// 直接在浏览器控制台运行此脚本

(function() {
  console.log('🚀 开始提取专业分数线数据...');
  
  const results = [];
  
  function getSchoolName() {
    const url = window.location.href;
    const match = url.match(/university_name=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    const title = document.title;
    const schoolMatch = title.match(/(.+?)[-_—]/);
    return schoolMatch ? schoolMatch[1] : '未知院校';
  }
  
  function getYear() {
    const url = window.location.href;
    const match = url.match(/year[":]\s*["']?(\d{4})/);
    if (match) return parseInt(match[1]);
    
    const yearBtns = document.querySelectorAll('[class*="year"], [class*="nianfen"]');
    for (const btn of yearBtns) {
      const text = btn.textContent || '';
      const m = text.match(/(\d{4})/);
      if (m && btn.classList.contains('active') || btn.classList.contains('selected')) {
        return parseInt(m[1]);
      }
    }
    
    return 2025;
  }
  
  function getProvince() {
    const url = window.location.href;
    const match = url.match(/province[":]\s*["']([^"']+)/);
    if (match) return decodeURIComponent(match[1]);
    return '海南';
  }
  
  function getBatch() {
    const url = window.location.href;
    const match = url.match(/batch[":]\s*["']([^"']+)/);
    if (match) return decodeURIComponent(match[1]);
    return '本科批';
  }
  
  const schoolName = getSchoolName();
  const year = getYear();
  const province = getProvince();
  const batch = getBatch();
  
  console.log(`📍 院校: ${schoolName}`);
  console.log(`📅 年份: ${year}`);
  console.log(`📍 省份: ${province}`);
  console.log(`📋 批次: ${batch}`);
  
  const allItems = document.querySelectorAll('[class*="list-item"], [class*="List-item"], [class*="item"], li');
  
  console.log(`🔍 找到 ${allItems.length} 个列表项，正在分析...`);
  
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
      const majorMatch = line.match(/^(.+?专业.*?)$|^(.+?(?:学|工程|技术|管理|经济|法学|文学|理学|工学|医学|农学|军事|艺术|教育|历史|哲学))$/);
      if (majorMatch && !majorName && line.length > 2 && line.length < 50) {
        majorName = majorMatch[0].trim();
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
      
      const avgMatch = line.match(/平均分\D*(\d+)/);
      if (avgMatch && avgScore === null) {
        avgScore = parseInt(avgMatch[1]);
      }
      
      const diffMatch = line.match(/线差\D*(\d+)/);
      if (diffMatch && batchLineDiff === null) {
        batchLineDiff = parseInt(diffMatch[1]);
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
        province: province,
        year: year,
        batch: batch,
        source: '夸克高考'
      };
      
      results.push(record);
    }
  }
  
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
        province: province,
        year: year,
        batch: batch,
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
        } else if (header.includes('线差')) {
          const num = parseInt(value);
          if (!isNaN(num)) record.batch_line_diff = num;
        }
      });
      
      if (record.major_name && (record.min_score || record.min_rank)) {
        results.push(record);
      }
    }
  }
  
  const uniqueResults = [];
  const seen = new Set();
  for (const r of results) {
    const key = r.major_name + '_' + r.min_score + '_' + r.min_rank;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ 提取完成！共获取 ${uniqueResults.length} 条专业分数线数据`);
  console.log('='.repeat(60));
  
  if (uniqueResults.length > 0) {
    console.log('\n📊 数据预览:');
    uniqueResults.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.major_name} - ${r.min_score || '--'}分 - ${r.min_rank || '--'}位次`);
    });
  }
  
  window._extractedData = uniqueResults;
  
  console.log('\n💡 下一步操作:');
  console.log('  运行 copyToClipboard() 复制数据到剪贴板');
  console.log('  运行 downloadJSON() 下载JSON文件');
  console.log('  运行 showAll() 查看所有数据');
  
  window.copyToClipboard = function() {
    const json = JSON.stringify(uniqueResults, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      console.log('📋 数据已复制到剪贴板！');
    }).catch(() => {
      console.log('❌ 复制失败，请手动复制 window._extractedData');
    });
  };
  
  window.downloadJSON = function() {
    const json = JSON.stringify(uniqueResults, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schoolName}_${year}_专业分数线.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('💾 文件已下载！');
  };
  
  window.showAll = function() {
    console.table(uniqueResults);
  };
  
  return {
    total: uniqueResults.length,
    data: uniqueResults,
    school: schoolName,
    year: year
  };
})();
