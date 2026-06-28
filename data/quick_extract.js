// ====== 快速提取脚本 ======
(function(){
  console.clear();
  console.log('%c🎓 夸克高考专业分数线提取工具', 'color:#3b82f6;font-size:18px;font-weight:bold');
  
  const url = location.href;
  const schoolMatch = url.match(/university_name=([^&]+)/);
  const schoolName = schoolMatch ? decodeURIComponent(schoolMatch[1]) : '未知院校';
  console.log('%c📚 院校: ' + schoolName, 'color:#22c55e;font-weight:bold');
  
  const yearMatch = url.match(/year[":]\s*["']?(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : 2025;
  console.log('%c📅 年份: ' + year, 'color:#22c55e;font-weight:bold');
  
  const tables = document.querySelectorAll('table');
  console.log('%c📊 发现 ' + tables.length + ' 个表格', 'color:#f59e0b;font-weight:bold');
  
  const results = [];
  
  for(let t=0;t<tables.length;t++){
    const table = tables[t];
    const rows = table.querySelectorAll('tr');
    if(rows.length<2) continue;
    
    const headers = [];
    rows[0].querySelectorAll('th,td').forEach(c=>headers.push((c.textContent||'').trim()));
    console.log('  表格'+(t+1)+': '+rows.length+'行 | 表头: '+headers.join(' | '));
    
    for(let i=1;i<rows.length;i++){
      const cells = rows[i].querySelectorAll('td');
      if(cells.length<2) continue;
      
      const r = {school_name:schoolName,year:year,province:'海南',batch:'本科批',source:'夸克高考'};
      
      cells.forEach((cell,idx)=>{
        if(idx>=headers.length) return;
        const h = headers[idx];
        const v = (cell.textContent||'').trim();
        
        if(h.includes('专业')&&!h.includes('组')) r.major_name=v;
        else if(h.includes('专业组')) r.major_group=v;
        else if(h.includes('最低分')||(h.includes('分')&&!h.includes('位次')&&!h.includes('差'))){
          const n=parseInt(v); if(!isNaN(n)) r.min_score=n;
        }
        else if(h.includes('位次')||h.includes('排名')){
          const n=parseInt(v); if(!isNaN(n)) r.min_rank=n;
        }
        else if(h.includes('人数')||h.includes('计划')){
          const n=parseInt(v); if(!isNaN(n)) r.person_count=n;
        }
        else if(h.includes('科目')||h.includes('选科')||h.includes('要求')) r.subject_requirement=v;
      });
      
      if(r.major_name&&(r.min_score||r.min_rank)) results.push(r);
    }
  }
  
  if(results.length===0){
    console.log('%c⚠️  表格未提取到，尝试列表方式...', 'color:#f59e0b');
    const items = document.querySelectorAll('[class*="item"],[class*="list"],li');
    items.forEach(item=>{
      const text = item.textContent||'';
      if(text.length<5||text.length>500) return;
      const sm = text.match(/(\d{2,3})\s*分/);
      const rm = text.match(/(\d{3,6})\s*位次/);
      const mm = text.match(/([^\d\n]{2,}(?:专业|学|工程|技术|管理|经济)[^\d\n]*)/);
      if(sm&&mm){
        results.push({
          school_name:schoolName,
          major_name:mm[1].trim(),
          min_score:parseInt(sm[1]),
          min_rank:rm?parseInt(rm[1]):null,
          year:year,province:'海南',batch:'本科批',source:'夸克高考'
        });
      }
    });
  }
  
  const unique = [];
  const seen = new Set();
  results.forEach(r=>{
    const k = r.major_name+'_'+(r.min_score||'')+'_'+(r.min_rank||'');
    if(!seen.has(k)){seen.add(k);unique.push(r);}
  });
  
  console.log('%c✅ 提取完成！共 ' + unique.length + ' 条数据', 'color:#22c55e;font-size:16px;font-weight:bold');
  
  if(unique.length>0){
    console.log('%c📋 数据预览:', 'color:#3b82f6;font-weight:bold');
    console.table(unique.slice(0,10));
    
    window.__data = unique;
    
    console.log('%c💾 输入 downloadData() 下载JSON文件', 'color:#8b5cf6;font-weight:bold');
  }else{
    console.log('%c❌ 未提取到数据', 'color:#ef4444;font-weight:bold');
    console.log('请确保：1.页面在专业分数线Tab  2.已点击"查看全部"  3.数据区域已加载');
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
