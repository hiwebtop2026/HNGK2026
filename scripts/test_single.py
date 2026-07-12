from selenium import webdriver
from selenium.webdriver.common.by import By
import time
import json

print("正在启动浏览器...")

options = webdriver.EdgeOptions()
options.add_experimental_option('excludeSwitches', ['enable-automation'])
options.add_experimental_option('useAutomationExtension', False)
options.add_argument('--disable-blink-features=AutomationControlled')
options.add_argument('--start-maximized')

driver = webdriver.Edge(options=options)
driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
    'source': "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
})

url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=%E5%AE%89%E5%BE%BD%E5%86%9C%E4%B8%9A%E5%A4%A7%E5%AD%A6&q=%E5%AE%89%E5%BE%BD%E5%86%9C%E4%B8%9A%E5%A4%A7%E5%AD%A6&uc_biz_str=qk_enable_gesture:true|OPT:W_ENTER_ANI@1|OPT:TOOLBAR_STYLE@0|OPT:W_PAGE_REFRESH@0|OPT:BACK_BTN_STYLE@0|OPT:IMMERSIVE@1&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&params={%22province%22:%22%E6%B5%B7%E5%8D%97%22,%22year%22:%222025%22,%22batch%22:%22%E6%9C%AC%E7%A7%91%E6%89%B9%22,%22genre%22:%22%E7%BB%BC%E5%90%88%22}&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp'

driver.get(url)
print("页面加载中...")
time.sleep(20)

print("\n步骤1: 切换到专业分数线标签")
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

print("\n步骤2: 切换到2023年")
switch_result = driver.execute_script("""
    var currentYearBtn = document.querySelector('.select-tabs-tab-nianfen');
    if(currentYearBtn) {
        currentYearBtn.click();
        setTimeout(function() {
            var all = document.querySelectorAll('*');
            for(var i=0; i<all.length; i++) {
                try {
                    var text = all[i].innerText;
                    if(text && text.trim() === '2023') {
                        all[i].click();
                    }
                } catch(e) {}
            }
        }, 500);
        return true;
    }
    return false;
""")
print(f"年份切换尝试: {switch_result}")
time.sleep(5)

print("\n步骤3: 检查当前年份")
current_year = driver.execute_script("""
    var yearEls = document.querySelectorAll('.select-tabs-tab-nianfen');
    for(var i=0; i<yearEls.length; i++) {
        try {
            var text = yearEls[i].innerText;
            if(text && text.match(/202[3-5]/)) {
                return text.trim();
            }
        } catch(e) {}
    }
    return null;
""")
print(f"当前年份: {current_year}")

print("\n步骤4: 提取专业分数线数据")
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
            var count = '';
            
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
            
            var countEl = contentEl.querySelector('.content-List-luqurenshu');
            if(countEl) {
                var textEl = countEl.querySelector('.content-List-li-content-text, .qk-paragraph-text');
                if(textEl) count = textEl.innerText.trim();
            }
            
            if(majorName && majorName.length >= 2 && majorName !== '普通类' && majorName !== '普通招生') {
                results.push({
                    major_name: majorName,
                    min_score: score,
                    min_rank: rank,
                    count: count
                });
            }
        } catch(e) {}
    }
    return results;
""")

print(f"\n采集到 {len(all_data)} 条数据")
for data in all_data:
    print(f"  专业: {data.get('major_name')}, 分数: {data.get('min_score')}, 排名: {data.get('min_rank')}, 人数: {data.get('count')}")

if all_data:
    output_file = r'I:\trae_projects\GAOKAO2026\data\hainan_scores\安徽农业大学_2023_专业分数线.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"\n✅ 数据已保存到: {output_file}")

driver.quit()