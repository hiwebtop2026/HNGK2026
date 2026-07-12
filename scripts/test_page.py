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

url = 'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6&q=%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6&uc_biz_str=qk_enable_gesture:true%7COPT:W_ENTER_ANI@1%7COPT:TOOLBAR_STYLE@0%7COPT:W_PAGE_REFRESH@0%7COPT:BACK_BTN_STYLE@0%7COPT:IMMERSIVE@1%7COPT%3AW_PAGE_REFRESH%400&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&params={%22province%22:%22%E6%B5%B7%E5%8D%97%22,%22year%22:%222025%22,%22batch%22:%22%E6%9C%AC%E7%A7%91%E6%89%B9%22,%22genre%22:%22%E7%BB%BC%E5%90%88%22}&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp'

driver.get(url)
time.sleep(20)

print('=' * 60)
print('查看列表项的完整HTML结构')
print('=' * 60)

items = driver.find_elements(By.CSS_SELECTOR, '.content-List-li')
print(f'找到 {len(items)} 个 content-List-li 元素')

if items:
    for i, item in enumerate(items[:5]):
        print(f'\n--- 列表项 {i} ---')
        html = item.get_attribute('innerHTML')[:2000]
        print(html)

print('\n' + '=' * 60)
print('查看带有分数数字的元素')
print('=' * 60)

all_data = driver.execute_script("""
    var results = [];
    var lists = document.querySelectorAll('.content-List-li');
    for(var i=0; i<lists.length; i++) {
        var li = lists[i];
        var children = li.querySelectorAll('*');
        var row = {};
        for(var j=0; j<children.length; j++) {
            var child = children[j];
            var classAttr = child.className || '';
            var text = child.innerText.trim();
            if(text) {
                if(!row[classAttr]) row[classAttr] = [];
                row[classAttr].push(text);
            }
        }
        if(Object.keys(row).length > 0) {
            results.push(row);
        }
    }
    return results;
""")

for i, row in enumerate(all_data[:10]):
    print(f'\n--- 数据行 {i} ---')
    for cls, texts in row.items():
        print(f'  class="{cls}"')
        for text in texts[:3]:
            print(f'    text: "{text}"')

driver.quit()