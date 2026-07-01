var QS = (function(){
  var loaded = false;
  
  function init() {
    if (loaded) return;
    loaded = true;
    console.clear();
    console.log('✅ 脚本已加载');
  }
  
  function getSchool() {
    var el = document.querySelector('.qk-title-text') || document.querySelector('h1');
    return el ? el.innerText.trim().replace(/[（(].*?[）)]/g, '') : '未知';
  }
  
  function getYear() {
    var btns = document.querySelectorAll('.select-tabs-tab-nianfen .qk-button-title');
    for (var i=0; i<btns.length; i++) {
      var m = btns[i].innerText.match(/(\d{4})/);
      if (m) return parseInt(m[1]);
    }
    return 2025;
  }
  
  function extract() {
    console.log('\n📊 提取数据...');
    var items = document.querySelectorAll('.content-List-li');
    var results = [];
    var subject = '';
    
    for (var i=0; i<items.length; i++) {
      var item = items[i];
      var title = item.querySelector('.content-List-subTitle');
      if (title) {
        var t = title.innerText.trim();
        if (t.indexOf('专业组') >= 0 || t.indexOf('选科') >= 0) subject = t;
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
      
      results.push({
        school: getSchool(),
        year: getYear(),
        major: name,
        score: score,
        rank: rank,
        subject: subject,
        desc: desc
      });
    }
    
    console.log('✅ 提取到 ' + results.length + ' 条数据');
    for (var j=0; j<results.length; j++) {
      var r = results[j];
      console.log((j+1) + '. ' + r.major + ' - ' + (r.score || '-') + '分 - ' + (r.rank || '-') + '位次');
      if (r.desc) console.log('   说明: ' + r.desc);
    }
    
    QS.data = results;
    return results;
  }
  
  function download() {
    if (!QS.data || QS.data.length === 0) {
      console.log('❌ 先运行 extract()');
      return;
    }
    var json = JSON.stringify(QS.data, null, 2);
    var blob = new Blob([json], {type: 'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = QS.data[0].school + '_' + QS.data[0].year + '_专业分数线.json';
    a.click();
    console.log('✅ 已下载');
  }
  
  init();
  
  return {
    extract: extract,
    download: download,
    data: []
  };
})();