from selenium import webdriver
from selenium.webdriver.common.by import By
import time
import json

schools = ['东华理工大学', '东南大学']

for school_name in schools:
    print('=' * 60)
    print(f'测试学校: {school_name}')
    print('=' * 60)
    
    options = webdriver.EdgeOptions()
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--start-maximized')
    
    driver = webdriver.Edge(options=options)
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    })
    
    base_url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name='
    params = '&uc_biz_str=qk_enable_gesture:true|OPT:W_ENTER_ANI@1|OPT:TOOLBAR_STYLE@0|OPT:W_PAGE_REFRESH@0|OPT:BACK_BTN_STYLE@0|OPT:IMMERSIVE@1&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&params={%22province%22:%22%E5%A4%A9%E6%B4%A5%22,%22year%22:%222025%22,%22batch%22:%22%E6%9C%AC%E7%A7%91%E6%89%B9A%E6%AE%B5%22,%22genre%22:%22%E7%BB%BC%E5%90%88%22}&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp'
    url = base_url + school_name + '&q=' + school_name + params
    
    driver.get(url)
    print(f"页面加载中...")
    time.sleep(15)
    
    print("\n步骤1: 查看页面标题和结构")
    print(f"页面标题: {driver.title}")
    
    page_source = driver.page_source[:2000]
    print(f"页面内容前2000字符:")
    print(page_source[:500])
    
    print("\n步骤2: 查找专业分数线标签")
    tabs = driver.execute_script("""
        var results = [];
        var tabs = document.querySelectorAll('.qk-tabs-tab');
        for(var i=0; i<tabs.length; i++) {
            results.push({cls: tabs[i].className, text: tabs[i].innerText.trim()});
        }
        return results;
    """)
    print("找到的标签:")
    for tab in tabs:
        print(f"  class='{tab.get('cls')}' text='{tab.get('text')}'")
    
    print("\n步骤3: 尝试切换到专业分数线")
    driver.execute_script("""
        var tabs = document.querySelectorAll('.qk-tabs-tab');
        for(var i=0; i<tabs.length; i++) {
            if(tabs[i].innerText && tabs[i].innerText.indexOf('专业分数线') >= 0) {
                tabs[i].click();
                break;
            }
        }
    """)
    time.sleep(3)
    
    print("\n步骤4: 检查列表项")
    items = driver.find_elements(By.CSS_SELECTOR, '.content-List-li')
    print(f"找到 {len(items)} 个列表项")
    
    if items:
        html = items[0].get_attribute('innerHTML')[:1000]
        print(f"第一个列表项HTML:")
        print(html)
    
    print("\n步骤5: 使用JS提取数据")
    all_data = driver.execute_script("""
        var results = [];
        var items = document.querySelectorAll('.content-List-li');
        for(var i=0; i<items.length; i++) {
            var item = items[i];
            try {
                var contentEl = item.querySelector('.content-List-li-content');
                if(!contentEl) contentEl = item;
                
                var majorName = '';
                var score = '';
                var rank = '';
                
                var majorEl = contentEl.querySelector('.content-List-major');
                if(majorEl) {
                    var textEl = majorEl.querySelector('.content-List-li-content-text, .qk-paragraph-text');
                    if(textEl) majorName = textEl.innerText.trim();
                }
                
                var scoreEl = contentEl.querySelector('.content-List-low_score');
                if(scoreEl) {
                    var textEl = scoreEl.querySelector('.content-List-li-content-text, .qk-paragraph-text');
                    if(textEl) score = textEl.innerText.trim();
                }
                
                var rankEl = contentEl.querySelector('.content-List-low_rank');
                if(rankEl) {
                    var textEl = rankEl.querySelector('.content-List-li-content-text, .qk-paragraph-text');
                    if(textEl) rank = textEl.innerText.trim();
                }
                
                if(majorName && majorName.length >= 2 && majorName !== '普通类' && majorName !== '普通招生') {
                    results.push({
                        major_name: majorName,
                        min_score: score,
                        min_rank: rank
                    });
                }
            } catch(e) {}
        }
        return results;
    """)
    
    print(f"\n采集到 {len(all_data)} 条数据")
    for data in all_data[:5]:
        print(f"  专业: {data.get('major_name')}, 分数: {data.get('min_score')}, 排名: {data.get('min_rank')}")
    
    if all_data:
        output_file = rf'I:\trae_projects\GAOKAO2026\data\tianjin_scores\{school_name}_2025_专业分数线.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
        print(f"\n✅ 数据已保存到: {output_file}")
    
    driver.quit()
    print(f"\n{'=' * 60}")