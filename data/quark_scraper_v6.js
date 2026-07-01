if(window.__gaokao_initialized){
  var _scraper=window.GaokaoScraper;
  var _school=_scraper.getSchoolName()||'未检测到';
  var _downloaded=[2023,2024,2025].filter(function(y){return _scraper.checkYearDownloaded(_school,y);});
  var _status=_scraper.isProcessing?'⏳ 处理中':'监控中';
  var _lock=window.__gaokao_lock?'🔒 '+window.__gaokao_lock:'';
  _status+' | '+_school+' | 已下载: '+_downloaded.join(',')+'/3年 '+_lock;
}else{
  window.__gaokao_initialized=true;
  
  var GaokaoScraper=(function(){
  var self={};
  
  self.startTime=0;
  self.currentSchool='';
  self.isProcessing=false;
  self.isPaused=false;
  self.debounceTimer=null;
  self._intervalId=null;
  self._observer=null;
  self._lastUrl=null;
  
  self.wait=function(ms){
    return new Promise(function(r){setTimeout(r,ms);});
  };
  
  self.downloadData=function(data,filename){
    var json=JSON.stringify(data,null,2);
    var blob=new Blob([json],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename+'.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  
  self.expandAllDescriptions=function(){
    var expandEls=document.querySelectorAll('[class*="expand"]');
    for(var i=0;i<expandEls.length;i++)expandEls[i].click();
    var collapseEls=document.querySelectorAll('[class*="collapse"]');
    for(var i=0;i<collapseEls.length;i++)collapseEls[i].click();
    var svgArrows=document.querySelectorAll('.content-List-li svg');
    for(var i=0;i<svgArrows.length;i++){
      var parent=svgArrows[i].parentElement;
      if(parent)parent.click();
    }
    var allSpans=document.querySelectorAll('.content-List-li span');
    for(var i=0;i<allSpans.length;i++){
      if(allSpans[i].innerText.trim()==='▼')allSpans[i].click();
    }
    var allDivs=document.querySelectorAll('.content-List-li div');
    for(var i=0;i<allDivs.length;i++){
      if(allDivs[i].innerText.indexOf('更多')>=0 || allDivs[i].innerText.indexOf('展开')>=0){
        allDivs[i].click();
      }
    }
  };
  
  self.parseMajorInfo=function(fullText,subTitle){
    var group='';
    var requirement='';
    var hasRequirementFormat=false;
    var reqMatch=fullText.match(/选科要求[\uff1a:](.+)$/);
    if(reqMatch){
      requirement=reqMatch[1].trim();
      hasRequirementFormat=true;
    }
    var mgMatch=fullText.match(/专业组[（(](\d+)[）)]/);
    if(mgMatch)group='专业组（'+mgMatch[1]+'）';
    if(subTitle){
      var smgMatch=subTitle.match(/专业组[（(](\d+)[）)]/);
      if(smgMatch)group='专业组（'+smgMatch[1]+'）';
      if(!requirement){
        var dashIndex=subTitle.indexOf(' - ');
        if(dashIndex>=0)requirement=subTitle.substring(dashIndex+3).trim();
      }
    }
    if(!requirement && !hasRequirementFormat){
      var ftDashIndex=fullText.indexOf(' - ');
      if(ftDashIndex>=0 && fullText.indexOf('专业组')>=0){
        requirement=fullText.substring(ftDashIndex+3).trim();
        var reqEnd=requirement.indexOf('\n');
        if(reqEnd>=0)requirement=requirement.substring(0,reqEnd).trim();
      }
    }
    return {group,requirement,hasRequirementFormat};
  };
  
  self.extractDescription=function(fullText){
    var desc='';
    var batchIndex=fullText.indexOf('本科批');
    if(batchIndex>=0){
      var afterBatch=fullText.substring(batchIndex+3);
      var reqIndex=afterBatch.indexOf('选科要求');
      if(reqIndex>=0)desc=afterBatch.substring(0,reqIndex).trim();
      else desc=afterBatch.trim();
      desc=desc.replace(/\n+/g,'').trim();
    }
    return desc;
  };
  
  self.extractData=function(school,year){
    var items=document.querySelectorAll('.content-List-li');
    var allData=[];
    var lastGroup='';
    var lastRequirement='';
    
    for(var i=0;i<items.length;i++){
      var item=items[i];
      var majorEl=item.querySelector('.content-List-major');
      if(!majorEl)continue;
      var name=majorEl.innerText.trim();
      if(name.length<2 || name==='普通类')continue;
      
      var sEl=item.querySelector('.content-List-low_score');
      var rEl=item.querySelector('.content-List-low_rank');
      var cEl=item.querySelector('.content-List-luqurenshu');
      var bEl=item.querySelector('.qk-margin-top-s');
      var tEl=item.querySelector('.content-List-subTitle');
      var ft=item.innerText;
      
      var score=sEl?parseInt(sEl.innerText.match(/\d{2,3}/)):null;
      var rank=rEl?parseInt(rEl.innerText.match(/\d{1,7}/)):null;
      var cnt=cEl?parseInt(cEl.innerText.match(/\d+/)):null;
      var batch=bEl?bEl.innerText.trim():'';
      var subTitle=tEl?tEl.innerText.trim():'';
      
      var parsed=self.parseMajorInfo(ft,subTitle);
      var mg=parsed.group||lastGroup;
      var req=parsed.requirement||lastRequirement;
      
      if(mg.indexOf('专业组')>=0)lastGroup=mg;
      if(req)lastRequirement=req;
      
      var desc=self.extractDescription(ft);
      
      if(score&&(score<100||score>900))continue;
      
      allData.push({
        school_name:school,
        year:year,
        major_name:name,
        major_group:mg,
        min_score:score,
        min_rank:rank,
        person_count:cnt,
        batch:batch,
        major_description:desc,
        subject_requirement:req,
        province:'海南',
        hasRequirementFormat:parsed.hasRequirementFormat
      });
    }
    
    var hasFormatCount=0,hasGroupFormatCount=0;
    for(var i=0;i<allData.length;i++){
      if(allData[i].hasRequirementFormat)hasFormatCount++;
      if(allData[i].major_group)hasGroupFormatCount++;
    }
    
    var filteredData=[];
    if(year===2025){
      for(var i=0;i<allData.length;i++){
        if(allData[i].hasRequirementFormat){
          allData[i].major_group='';
          filteredData.push(allData[i]);
        }
      }
    }else{
      if(hasGroupFormatCount>0){
        for(var i=0;i<allData.length;i++){
          if(allData[i].major_group)filteredData.push(allData[i]);
        }
      }else{
        for(var i=0;i<allData.length;i++){
          if(allData[i].hasRequirementFormat)filteredData.push(allData[i]);
        }
        if(filteredData.length===0)filteredData=allData;
      }
    }
    
    var result=[];
    var seen={};
    for(var i=0;i<filteredData.length;i++){
      var item=filteredData[i];
      var key=item.major_name+'|'+item.min_score+'|'+item.min_rank;
      if(seen[key])continue;
      seen[key]=true;
      delete item.hasRequirementFormat;
      result.push(item);
    }
    
    return result;
  };
  
  self.waitForDataLoad=function(){
    return new Promise(function(resolve){
      var checkCount=0,maxChecks=20;
      function check(){
        var items=document.querySelectorAll('.content-List-li');
        var hasValidScore=false;
        for(var i=0;i<items.length;i++){
          var majorEl=items[i].querySelector('.content-List-major');
          var scoreEl=items[i].querySelector('.content-List-low_score');
          if(majorEl && scoreEl){
            var name=majorEl.innerText.trim();
            var score=scoreEl.innerText.trim();
            if(name.length>=2 && name!=='普通类' && /^\d{2,3}$/.test(score)){
              hasValidScore=true;
              break;
            }
          }
        }
        if(hasValidScore){resolve();return;}
        checkCount++;
        if(checkCount<maxChecks)setTimeout(check,500);
        else resolve();
      }
      check();
    });
  };
  
  self.findMajorYearButton=function(){
    var allYearBtns=document.querySelectorAll('.select-tabs-tab-nianfen');
    if(allYearBtns.length>=2)return allYearBtns[1];
    if(allYearBtns.length===1)return allYearBtns[0];
    
    var activeBtns=[];
    allYearBtns=document.querySelectorAll('.select-tabs-tab-nianfen');
    for(var i=0;i<allYearBtns.length;i++){
      if(allYearBtns[i].className.indexOf('active')>=0)activeBtns.push(allYearBtns[i]);
    }
    if(activeBtns.length>=2)return activeBtns[1];
    if(activeBtns.length===1)return activeBtns[0];
    
    var otherYearBtns=document.querySelectorAll('[class*="nianfen"], [class*="year"]');
    for(var i=0;i<otherYearBtns.length;i++){
      var text=otherYearBtns[i].innerText.trim();
      if(/^202[0-9]$/.test(text)){
        var parent=otherYearBtns[i].parentElement;
        if(parent && parent.className.indexOf('select')>=0)return otherYearBtns[i];
      }
    }
    
    var qkButtons=document.querySelectorAll('.qk-button');
    for(var i=0;i<qkButtons.length;i++){
      var text=qkButtons[i].innerText.trim();
      if(/^202[0-9]$/.test(text))return qkButtons[i];
    }
    
    return null;
  };
  
  self.switchYear=function(yearBtn,year){
    var rect=yearBtn.getBoundingClientRect();
    yearBtn.scrollIntoView({behavior:'smooth',block:'center'});
    
    return self.wait(500).then(function(){
      yearBtn.click();
      return self.wait(500);
    }).then(function(){
      yearBtn.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,composed:true,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2}));
      return self.wait(100);
    }).then(function(){
      yearBtn.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,composed:true,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2}));
      return self.wait(1000);
    }).then(function(){
      var options=document.querySelectorAll('.select-modal-li');
      if(options.length===0){
        var arrows=yearBtn.querySelectorAll('svg, [class*="arrow"], [class*="chevron"], [class*="caret"]');
        var tryNext=function(index){
          if(index>=arrows.length)return Promise.resolve(document.querySelectorAll('.select-modal-li'));
          arrows[index].click();
          return self.wait(500).then(function(){
            var opts=document.querySelectorAll('.select-modal-li');
            return opts.length>0?opts:tryNext(index+1);
          });
        };
        return tryNext(0);
      }
      return options;
    }).then(function(options){
      var target=null;
      for(var i=0;i<options.length;i++){
        if(options[i].innerText.trim()===String(year)){target=options[i];break;}
      }
      
      if(!target){
        var allOptions=document.querySelectorAll('*');
        for(var i=0;i<allOptions.length;i++){
          try{
            if(allOptions[i].innerText.trim()===String(year) && allOptions[i].children.length<5){
              var r=allOptions[i].getBoundingClientRect();
              if(r.width>20 && r.height>15 && r.top>0){target=allOptions[i];break;}
            }
          }catch(e){}
        }
      }
      
      if(!target)throw new Error('未找到'+year+'选项');
      
      var targetRect=target.getBoundingClientRect();
      if(targetRect.top<0 || targetRect.top>window.innerHeight){
        target.scrollIntoView({behavior:'smooth',block:'center'});
        return self.wait(500).then(function(){return target.getBoundingClientRect();});
      }
      return targetRect;
    }).then(function(targetRect){
      var target=null;
      var allOptions=document.querySelectorAll('.select-modal-li');
      for(var i=0;i<allOptions.length;i++){
        if(allOptions[i].innerText.trim()===String(year)){target=allOptions[i];break;}
      }
      if(!target){
        var all=document.querySelectorAll('*');
        for(var i=0;i<all.length;i++){
          try{
            if(all[i].innerText.trim()===String(year) && all[i].children.length<5){
              var r=all[i].getBoundingClientRect();
              if(r.width>20 && r.height>15){target=all[i];break;}
            }
          }catch(e){}
        }
      }
      if(target){target.click();return self.wait(200);}
      return self.wait(200);
    }).then(function(){
      return self.wait(3000);
    }).then(function(){
      return self.waitForDataLoad();
    });
  };
  
  self.getSchoolName=function(){
    var school=document.querySelector('.qk-title-text');
    return school?school.innerText.trim().replace(/[（(].*?[）)]/g,''):'';
  };
  
  self.switchToMajorTab=function(){
    var tabs=document.querySelectorAll('.qk-tabs-tab');
    for(var i=0;i<tabs.length;i++){
      if(tabs[i].innerText.indexOf('专业分数线')>=0){tabs[i].click();return true;}
    }
    return false;
  };
  
  self.getDownloadKey=function(school,year){
    return 'gaokao_dl_'+encodeURIComponent(school)+'_'+year;
  };
  
  self.checkYearDownloaded=function(school,year){
    return localStorage.getItem(self.getDownloadKey(school,year))==='1';
  };
  
  self.markYearDownloaded=function(school,year){
    localStorage.setItem(self.getDownloadKey(school,year),'1');
  };
  
  self.checkSchoolDownloaded=function(school){
    return self.checkYearDownloaded(school,2023) && 
           self.checkYearDownloaded(school,2024) && 
           self.checkYearDownloaded(school,2025);
  };
  
  self.clearDownloaded=function(){
    var keys=Object.keys(localStorage);
    for(var i=0;i<keys.length;i++){
      if(keys[i].indexOf('gaokao_dl_')===0)localStorage.removeItem(keys[i]);
    }
    console.log('✅ 已清除所有下载记录');
  };
  
  self.clearSchoolDownloaded=function(school){
    for(var year=2023;year<=2025;year++){
      localStorage.removeItem(self.getDownloadKey(school,year));
    }
    console.log('✅ 已清除 '+school+' 的下载记录');
  };
  
  self.redownload=function(school){
    self.clearSchoolDownloaded(school);
    self.collectAllYears();
  };
  
  self.stopMonitoring=function(){
    if(self._intervalId){
      clearInterval(self._intervalId);
      self._intervalId=null;
    }
    if(self._observer){
      self._observer.disconnect();
      self._observer=null;
    }
    self.isPaused=true;
  };
  
  self.startMonitoring=function(){
    if(self._intervalId)clearInterval(self._intervalId);
    if(self._observer)self._observer.disconnect();
    
    self.isPaused=false;
    
    var checkSchool=function(){
      if(self.isProcessing)return;
      
      var school=self.getSchoolName();
      if(!school)return;
      
      if(school!==self.currentSchool){
        self.currentSchool=school;
        self.collectAllYears();
      }
    };
    
    var debouncedCheck=function(){
      if(self.debounceTimer)clearTimeout(self.debounceTimer);
      self.debounceTimer=setTimeout(checkSchool,1000);
    };
    
    self._observer=new MutationObserver(function(mutations){
      debouncedCheck();
    });
    
    self._observer.observe(document.body,{
      childList:true,
      subtree:true,
      characterData:true
    });
    
    self._intervalId=setInterval(checkSchool,5000);
    
    checkSchool();
  };
  
  self.collectAllYears=function(){
    var school=self.getSchoolName();
    
    if(!school)return Promise.resolve();
    
    if(self.isProcessing){
      console.log('⚠️ '+school+' 正在处理中');
      return Promise.resolve();
    }
    
    if(window.__gaokao_lock){
      console.log('⚠️ 已有下载任务进行中: '+window.__gaokao_lock);
      return Promise.resolve();
    }
    
    self.currentSchool=school;
    
    var downloadedYears=[2023,2024,2025].filter(function(y){return self.checkYearDownloaded(school,y);});
    
    if(downloadedYears.length===3){
      console.log('✅ '+school+' 数据均已下载，暂停监控');
      self.stopMonitoring();
      return Promise.resolve();
    }
    
    self.isProcessing=true;
    window.__gaokao_lock=school;
    
    console.log('======== 开始采集 '+school+' ========');
    console.log('已下载: '+downloadedYears.join(',') || '无');
    
    self.switchToMajorTab();
    
    return self.wait(2000).then(function(){
      var targetBtn=self.findMajorYearButton();
      if(!targetBtn){throw new Error('未找到年份按钮');}
      targetBtn.scrollIntoView({behavior:'smooth',block:'center'});
      return self.wait(500).then(function(){return targetBtn;});
    }).then(function(targetBtn){
      var years=[2023,2024,2025];
      var totalCount=0;
      
      var processYear=function(index){
        if(index>=years.length){
          console.log('======== '+school+' 采集完成！共 '+totalCount+' 条 ========');
          self.isProcessing=false;
          window.__gaokao_lock=null;
          
          if(self.checkSchoolDownloaded(school)){
            console.log('✅ '+school+' 近三年数据全部下载完成');
            self.stopMonitoring();
          }
          return;
        }
        
        var year=years[index];
        
        if(self.checkYearDownloaded(school,year)){
          console.log('  '+year+'年已下载，跳过');
          return processYear(index+1);
        }
        
        return self.switchYear(targetBtn,year).then(function(){
          self.expandAllDescriptions();
          return self.wait(2000);
        }).then(function(){
          var data=self.extractData(school,year);
          console.log('✅ '+year+'年: '+data.length+'条');
          
          if(data.length>0){
            self.downloadData(data,school+'_'+year+'_专业分数线');
            self.markYearDownloaded(school,year);
            totalCount+=data.length;
          }
          
          return self.wait(500);
        }).then(function(){
          return processYear(index+1);
        }).catch(function(err){
          console.log('❌ '+year+'年失败: '+err.message);
          return processYear(index+1);
        });
      };
      
      return processYear(0);
    }).catch(function(err){
      console.error('❌ '+school+'采集失败: '+err.message);
      self.isProcessing=false;
      window.__gaokao_lock=null;
    });
  };
  
  self.initUrlChangeListener=function(){
    self._lastUrl=window.location.href;
    
    var checkUrlChange=function(){
      var currentUrl=window.location.href;
      if(currentUrl!==self._lastUrl){
        self._lastUrl=currentUrl;
        if(self.isPaused){
          self.currentSchool='';
          self.startMonitoring();
        }
      }
    };
    
    window.addEventListener('popstate',checkUrlChange);
    
    if(!window._gaokaoOriginalPushState){
      window._gaokaoOriginalPushState=history.pushState;
      history.pushState=function(){
        window._gaokaoOriginalPushState.apply(this,arguments);
        checkUrlChange();
      };
    }
    
    if(!window._gaokaoOriginalReplaceState){
      window._gaokaoOriginalReplaceState=history.replaceState;
      history.replaceState=function(){
        window._gaokaoOriginalReplaceState.apply(this,arguments);
        checkUrlChange();
      };
    }
  };
  
  self.startAutoDetect=function(){
    self.initUrlChangeListener();
    self.startMonitoring();
    
    console.log('✅ GaokaoScraper 已启动');
    console.log('方法: GaokaoScraper.collectAllYears() / .status() / .redownload() / .clearDownloaded()');
  };
  
  self.status=function(){
    var schools={};
    var keys=Object.keys(localStorage);
    for(var i=0;i<keys.length;i++){
      if(keys[i].indexOf('gaokao_dl_')===0){
        var parts=keys[i].substring('gaokao_dl_'.length).split('_');
        var year=parts.pop();
        var school=decodeURIComponent(parts.join('_'));
        if(!schools[school])schools[school]={downloaded:[],pending:[]};
        if(localStorage.getItem(keys[i])==='1')schools[school].downloaded.push(year);
      }
    }
    
    console.log('======== 下载状态 ========');
    for(var school in schools){
      var s=schools[school];
      var pending=[2023,2024,2025].filter(function(y){return s.downloaded.indexOf(String(y))===-1;});
      console.log(school+':');
      console.log('  已下载: '+s.downloaded.join(', ') || '无');
      console.log('  待下载: '+pending.join(', ') || '无');
    }
    if(Object.keys(schools).length===0)console.log('无下载记录');
  };
  
  return self;
  })();
  
  window.GaokaoScraper=GaokaoScraper;
  GaokaoScraper.startAutoDetect();
  
  '✅ 已初始化 | 等待院校加载...';
}