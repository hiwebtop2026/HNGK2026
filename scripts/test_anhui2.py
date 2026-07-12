from selenium import webdriver
from selenium.webdriver.common.by import By
import time

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
time.sleep(20)

print('=' * 60)
print('查看所有包含"分数线"的元素')
print('=' * 60)

script_result = driver.execute_script("""
    var results = [];
    var all = document.querySelectorAll('*');
    for(var i=0; i<all.length; i++) {
        try {
            var text = all[i].innerText.trim();
            if(text && text.length < 50) {
                if(text.match(/专业|分数线|625|621|会计学|金融学|本科批/) && !text.match(/百科|资讯|招生/)) {
                    var cls = all[i].className || '';
                    var tag = all[i].tagName;
                    results.push({cls: cls, tag: tag, text: text});
                }
            }
        } catch(e) {}
    }
    return results.slice(0, 50);
""")

for item in script_result:
    print(f'  tag={item.get("tag")} class="{item.get("cls")}" text="{item.get("text")}"')

print('\n' + '=' * 60)
print('查找年份选择器')
print('=' * 60)

year_selectors = driver.execute_script("""
    var results = [];
    var all = document.querySelectorAll('*');
    for(var i=0; i<all.length; i++) {
        try {
            var text = all[i].innerText.trim();
            if(text && text.match(/202[3-5]/) && text.length <= 4) {
                var cls = all[i].className || '';
                var tag = all[i].tagName;
                var rect = all[i].getBoundingClientRect();
                if(rect.width > 20 && rect.height > 15) {
                    results.push({cls: cls, tag: tag, text: text, id: all[i].id});
                }
            }
        } catch(e) {}
    }
    return results;
""")

print('找到的年份按钮:')
for item in year_selectors:
    print(f'  tag={item.get("tag")} id="{item.get("id")}" class="{item.get("cls")}" text="{item.get("text")}"')

print('\n' + '=' * 60)
print('尝试切换2023年')
print('=' * 60)

switch_success = driver.execute_script("""
    var targetYear = '2023';
    var all = document.querySelectorAll('*');
    for(var i=0; i<all.length; i++) {
        try {
            var text = all[i].innerText;
            if(text && text.trim() === targetYear) {
                var rect = all[i].getBoundingClientRect();
                if(rect.width > 20 && rect.height > 15) {
                    all[i].click();
                    return true;
                }
            }
        } catch(e) {}
    }
    return false;
""")

print(f'切换结果: {switch_success}')

time.sleep(5)

print('\n' + '=' * 60)
print('切换后检查数据')
print('=' * 60)

data_check = driver.execute_script("""
    var results = [];
    var all = document.querySelectorAll('*');
    for(var i=0; i<all.length; i++) {
        try {
            var text = all[i].innerText.trim();
            if(text && text.length < 50) {
                if(text.match(/专业|分数线|本科批/) && !text.match(/百科|资讯|招生/)) {
                    results.push(text);
                }
            }
        } catch(e) {}
    }
    return results.slice(0, 30);
""")

print('页面上的相关文本:')
for text in data_check:
    print(f'  "{text}"')

driver.quit()