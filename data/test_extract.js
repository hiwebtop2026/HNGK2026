// ====== 最简测试脚本：提取当前页面专业分数线数据 ======
console.log('🧪 开始测试数据提取...');

// 从URL获取院校名称
const url = window.location.href;
const schoolMatch = url.match(/university_name=([^&]+)/);
const schoolName = schoolMatch ? decodeURIComponent(schoolMatch[1]) : '未知院校';
console.log(`📚 院校: ${schoolName}`);

// 获取年份
const yearMatch = url.match(/year[":]\s*["']?(\d{4})/);
const year = yearMatch ? parseInt(yearMatch[1]) : 2025;
console.log(`📅 年份: ${year}`);

// 查找所有表格
const tables = document.querySelectorAll('table');
console.log(`📊 发现 ${tables.length} 个表格`);

const results = [];

for (let t = 0; t < tables.length; t++) {
  const table = tables[t];
  const rows = table.querySelectorAll('tr');
  if (rows.length < 2) continue;

  // 获取表头
  const headers = [];
  rows[0].querySelectorAll('th, td').forEach(cell => {
    headers.push((cell.textContent || '').trim());
  });
  console.log(`  表格${t+1}: ${rows.length}行, 表头: ${headers.join(' | ')}`);

  // 提取数据行
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
      } else if (header.includes('人数') || header.includes('计划')) {
        const num = parseInt(value);
        if (!isNaN(num)) record.person_count = num;
      } else if (header.includes('科目') || header.includes('选科') || header.includes('要求')) {
        record.subject_requirement = value;
      }
    });

    if (record.major_name && (record.min_score || record.min_rank)) {
      results.push(record);
    }
  }
}

// 如果表格没数据，尝试从列表提取
if (results.length === 0) {
  console.log('⚠️  表格提取失败，尝试从列表元素提取...');
  
  const allItems = document.querySelectorAll('[class*="item"], [class*="list"], li');
  console.log(`  发现 ${allItems.length} 个列表项`);
  
  for (const item of allItems) {
    const text = item.textContent || '';
    if (text.length < 5 || text.length > 500) continue;
    
    const scoreMatch = text.match(/(\d{2,3})\s*分/);
    const rankMatch = text.match(/(\d{3,6})\s*位次/);
    const majorMatch = text.match(/([^\d\n]{2,}(?:专业|学|工程|技术|管理|经济)[^\d\n]*)/);
    
    if (scoreMatch && majorMatch) {
      results.push({
        school_name: schoolName,
        major_name: majorMatch[1].trim(),
        min_score: parseInt(scoreMatch[1]),
        min_rank: rankMatch ? parseInt(rankMatch[1]) : null,
        year: year,
        province: '海南',
        batch: '本科批',
        source: '夸克高考'
      });
    }
  }
}

// 去重
const uniqueResults = [];
const seen = new Set();
for (const r of results) {
  const key = r.major_name + '_' + (r.min_score || '') + '_' + (r.min_rank || '');
  if (!seen.has(key)) {
    seen.add(key);
    uniqueResults.push(r);
  }
}

console.log(`\n✅ 提取完成！共 ${uniqueResults.length} 条数据`);

if (uniqueResults.length > 0) {
  console.log('\n📋 数据预览:');
  console.table(uniqueResults.slice(0, 10));
  
  // 保存到全局变量
  window.__testData = uniqueResults;
  
  // 提供下载功能
  console.log('\n💾 运行 downloadTestData() 下载数据');
} else {
  console.log('❌ 未提取到数据，请检查页面是否在专业分数线页面');
  console.log('💡 请确保页面滚动到"专业分数线"部分，并点击"查看全部"');
}

function downloadTestData() {
  if (!window.__testData || window.__testData.length === 0) {
    console.log('❌ 没有数据可下载');
    return;
  }
  const json = JSON.stringify(window.__testData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName}_${year}_专业分数线.json`;
  a.click();
  URL.revokeObjectURL(url);
  console.log('💾 数据已下载！');
}

window.downloadTestData = downloadTestData;
