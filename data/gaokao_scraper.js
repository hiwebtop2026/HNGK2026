var _GKS = {};

_GKS.getSchoolName = function() {
  var s = document.querySelector('.qk-title-text');
  return s ? s.innerText.trim().replace(/[（(].*?[）)]/g, '') : '未知院校';
};

_GKS.getYear = function() {
  var b = document.querySelectorAll('.select-tabs-tab-nianfen .qk-button-title');
  for (var i=0; i<b.length; i++) {
    var m = b[i].innerText.match(/(\d{4})/);
    if (m) return parseInt(m[1]);
  }
  return 2025;
};

_GKS.extract = function() {
  console.clear();
  console.log('🎓 ' + _GKS.getSchoolName() + ' ' + _GKS.getYear() + '年');
  console.log('------------------------');
  
  var items = document.querySelectorAll('.content-List-li');
  var data = [];
  var subj = '';
  
  for (var i=0; i<items.length; i++) {
    var item = items[i];
    
    var titleEl = item.querySelector('.content-List-subTitle');
    if (titleEl) {
      var t = titleEl.innerText.trim();
      if (t.indexOf('专业组') >= 0 || t.indexOf('选科') >= 0) subj = t;
    }
    
    var nameEl = item.querySelector('.content-List-major');
    var scoreEl = item.querySelector('.content-List-low_score');
    var rankEl = item.querySelector('.content-List-low_rank');
    var descEl = item.querySelector('.qk-margin-top-s');
    
    if (!nameEl) continue;
    
    var name = nameEl.innerText.trim();
    if (name.length < 2) continue;
    
    var score = scoreEl ? parseInt(scoreEl.innerText.match(/\d{2,3}/)) : null;
    var rank = rankEl ? parseInt(rankEl.innerText.match(/\d{3,7}/)) : null;
    var desc = descEl ? descEl.innerText.trim() : '';
    
    if (score && (score < 100 || score > 900)) continue;
    if (rank && (rank < 10 || rank > 100000)) continue;
    
    data.push({
      school_name: _GKS.getSchoolName(),
      year: _GKS.getYear(),
      major_name: name,
      min_score: score,
      min_rank: rank,
      subject_requirement: subj,
      major_description: desc,
      province: '海南',
      batch: '本科批'
    });
  }
  
  console.log('✅ 提取到 ' + data.length + ' 条数据\n');
  for (var j=0; j<data.length; j++) {
    var r = data[j];
    console.log((j+1) + '. ' + r.major_name);
    if (r.min_score) console.log('   分数: ' + r.min_score + '分');
    if (r.min_rank) console.log('   位次: ' + r.min_rank);
    if (r.subject_requirement) console.log('   选科: ' + r.subject_requirement);
    if (r.major_description) console.log('   说明: ' + r.major_description);
    console.log('');
  }
  
  _GKS.currentData = data;
  return data;
};

_GKS.download = function() {
  if (!_GKS.currentData || _GKS.currentData.length === 0) {
    console.log('❌ 请先运行 _GKS.extract()');
    return;
  }
  var json = JSON.stringify(_GKS.currentData, null, 2);
  var blob = new Blob([json], {type: 'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  var d = _GKS.currentData[0];
  a.download = d.school_name + '_' + d.year + '_专业分数线.json';
  a.click();
  console.log('✅ 已下载');
};

console.log('✅ gaokao_scraper 已加载');
console.log('使用: _GKS.extract() → _GKS.download()');