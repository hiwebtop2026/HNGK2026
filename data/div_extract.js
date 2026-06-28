// ====== 针对DIV布局的数据提取脚本 ======
(function(){
  console.clear();
  console.log('%c🎓 夸克高考专业分数线提取工具 (DIV版)', 'color:#3b82f6;font-size:18px;font-weight:bold');
  
  const url = location.href;
  const schoolMatch = url.match(/university_name=([^&]+)/);
  const schoolName = schoolMatch ? decodeURIComponent(schoolMatch[1]) : '未知院校';
  console.log('%c📚 院校: ' + schoolName, 'color:#22c55e;font-weight:bold');
  
  const yearMatch = url.match(/year[":]\s*["']?(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2025;
  console.log('%c📅 年份: ' + year, 'color:#22c55e;font-weight:bold');
  
  const pageText = document.body.innerText;
  console.log('%c📝 页面文本长度: ' + pageText.length + ' 字符', 'color:#f59e0b;font-weight:bold');
  
  const results = [];
  
  const allElements = document.querySelectorAll('div, section, article, li');
  console.log('%c🔍 正在扫描 ' + allElements.length + ' 个元素...', 'color:#f59e0b');
  
  for (const el of allElements) {
    const text = (el.textContent || '').trim();
    if (text.length < 10 || text.length > 500) continue;
    
    const children = el.children;
    if (children.length > 20) continue;
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2 || lines.length > 15) continue;
    
    let hasScore = false;
    let hasRank = false;
    let majorName = '';
    let minScore = null;
    let minRank = null;
    let personCount = null;
    let majorGroup = '';
    let subjectReq = '';
    
    for (const line of lines) {
      const scoreMatch = line.match(/(\d{2,3})\s*分/);
      if (scoreMatch && minScore === null) {
        minScore = parseInt(scoreMatch[1]);
        hasScore = true;
      }
      
      const rankMatch = line.match(/(\d{3,7})\s*位次/);
      if (rankMatch && minRank === null) {
        minRank = parseInt(rankMatch[1]);
        hasRank = true;
      }
      
      const countMatch = line.match(/(\d+)\s*人/);
      if (countMatch && personCount === null) {
        personCount = parseInt(countMatch[1]);
      }
      
      const groupMatch = line.match(/专业组([^\s，。]+)/);
      if (groupMatch && !majorGroup) {
        majorGroup = '专业组' + groupMatch[1];
      }
      
      const subjectMatch = line.match(/(?:选科|科目|选课|要求)[：:]\s*(.+?)(?:\s|$)/);
      if (subjectMatch && !subjectReq) {
        subjectReq = subjectMatch[1];
      }
    }
    
    if (!hasScore && !hasRank) continue;
    
    for (const line of lines) {
      if (line.length >= 2 && line.length <= 40 && 
          !line.includes('分') && !line.includes('位次') && 
          !line.includes('人数') && !line.includes('计划') &&
          !/^\d+$/.test(line)) {
        majorName = line;
        break;
      }
    }
    
    if (!majorName && lines[0] && lines[0].length > 1) {
      majorName = lines[0];
    }
    
    if ((hasScore || hasRank) && majorName && majorName.length > 1) {
      const record = {
        school_name: schoolName,
        major_name: majorName,
        min_score: minScore,
        min_rank: minRank,
        person_count: personCount,
        major_group: majorGroup || undefined,
        subject_requirement: subjectReq || undefined,
        province: '海南',
        year: year,
        batch: '本科批',
        source: '夸克高考'
      };
      
      results.push(record);
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
  
  console.log('%c✅ 提取完成！共 ' + uniqueResults.length + ' 条数据', 'color:#22c55e;font-size:16px;font-weight:bold');
  
  if (uniqueResults.length > 0) {
    console.log('%c📋 数据预览:', 'color:#3b82f6;font-weight:bold');
    console.table(uniqueResults.slice(0, 10));
    
    window.__data = uniqueResults;
    
    console.log('%c💾 输入 downloadData() 下载JSON文件', 'color:#8b5cf6;font-weight:bold');
  } else {
    console.log('%c❌ 未提取到数据', 'color:#ef4444;font-weight:bold');
    console.log('正在尝试其他方式...');
    
    const scorePattern = /([^\n\d]{2,30}?)\s+(\d{2,3})\s*分\s+(\d{3,7})\s*位次/g;
    const text = document.body.innerText;
    let match;
    const simpleResults = [];
    
    while ((match = scorePattern.exec(text)) !== null) {
      const majorName = match[1].trim().replace(/^\s*[•·●○◆◇■□▲△]?\s*/, '');
      if (majorName.length > 1 && majorName.length < 40) {
        simpleResults.push({
          school_name: schoolName,
          major_name: majorName,
          min_score: parseInt(match[2]),
          min_rank: parseInt(match[3]),
          province: '海南',
          year: year,
          batch: '本科批',
          source: '夸克高考'
        });
      }
    }
    
    console.log('%c📊 正则提取到 ' + simpleResults.length + ' 条数据', 'color:#f59e0b;font-weight:bold');
    
    if (simpleResults.length > 0) {
      console.table(simpleResults.slice(0, 10));
      window.__data = simpleResults;
      console.log('%c💾 输入 downloadData() 下载JSON文件', 'color:#8b5cf6;font-weight:bold');
    }
  }
  
  window.downloadData = function(){
    if(!window.__data||!window.__data.length){console.log('没有数据');return;}
    const json = JSON.stringify(window.__data,null,2);
    const blob = new Blob([json],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = schoolName+'_'+year+'_专业分数线.json';
    a.click();
    URL.revokeObjectURL(a.href);
    console.log('%c💾 已下载！', 'color:#22c55e;font-weight:bold');
  };
})();
