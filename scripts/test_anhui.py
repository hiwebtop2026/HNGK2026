from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json

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
print('当前页面: 2025年数据')
print('=' * 60)

items = driver.find_elements(By.CSS_SELECTOR, '.content-List-li')
print(f'找到 {len(items)} 个列表项')

for i, item in enumerate(items[:5]):
    try:
        content_el = item.find_element(By.CSS_SELECTOR, '.content-List-li-content')
        try:
            major_el = content_el.find_element(By.CSS_SELECTOR, '.content-List-major')
            text_elem = major_el.find_element(By.CSS_SELECTOR, '.content-List-li-content-text')
            major_name = text_elem.text.strip()
        except:
            major_name = 'N/A'
        try:
            score_el = content_el.find_element(By.CSS_SELECTOR, '.content-List-low_score')
            text_elem = score_el.find_element(By.CSS_SELECTOR, '.content-List-li-content-text')
            score = text_elem.text.strip()
        except:
            score = 'N/A'
        print(f'  [{i}] 专业: {major_name}, 分数: {score}')
    except:
        pass

print('\n' + '=' * 60)
print('尝试切换到2023年')
print('=' * 60)

year_buttons = driver.execute_script("""
    var btns = document.querySelectorAll('*');
    var yearBtns = [];
    for(var i=0; i<btns.length; i++) {
        try {
            var text = btns[i].innerText;
            if(text && text.match(/202[3-5]/)) {
                yearBtns.push({
                    class: btns[i].className,
                    text: text.trim(),
                    tag: btns[i].tagName
                });
            }
        } catch(e) {}
    }
    return yearBtns;
""")

print('找到的年份按钮:')
for btn in year_buttons[:10]:
    print(f'  class="{btn.get("class")}" tag={btn.get("tag")} text="{btn.get("text")}"')

switch_result = driver.execute_script("""
    var targetYear = '2023';
    var btns = document.querySelectorAll('.qk-button, .select-tabs-tab, [class*="tab"], [class*="year"]');
    for(var i=0; i<btns.length; i++) {
        if(btns[i].innerText && btns[i].innerText.trim() === targetYear) {
            btns[i].click();
            return true;
        }
    }
    return false;
""")

print(f'\n年份切换结果: {switch_result}')

time.sleep(5)

print('\n' + '=' * 60)
print('切换后页面: 2023年数据')
print('=' * 60)

items = driver.find_elements(By.CSS_SELECTOR, '.content-List-li')
print(f'找到 {len(items)} 个列表项')

all_data = []
for i, item in enumerate(items):
    try:
        content_el = item.find_element(By.CSS_SELECTOR, '.content-List-li-content')
        try:
            major_el = content_el.find_element(By.CSS_SELECTOR, '.content-List-major')
            text_elem = major_el.find_element(By.CSS_SELECTOR, '.content-List-li-content-text')
            major_name = text_elem.text.strip()
        except:
            major_name = 'N/A'
        try:
            score_el = content_el.find_element(By.CSS_SELECTOR, '.content-List-low_score')
            text_elem = score_el.find_element(By.CSS_SELECTOR, '.content-List-li-content-text')
            score = text_elem.text.strip()
        except:
            score = 'N/A'
        try:
            rank_el = content_el.find_element(By.CSS_SELECTOR, '.content-List-low_rank')
            text_elem = rank_el.find_element(By.CSS_SELECTOR, '.content-List-li-content-text')
            rank = text_elem.text.strip()
        except:
            rank = 'N/A'
        
        if len(major_name) >= 2 and major_name != '普通类' and major_name != '普通招生':
            print(f'  [{i}] 专业: {major_name}, 分数: {score}, 排名: {rank}')
            all_data.append({
                'major_name': major_name,
                'min_score': score,
                'min_rank': rank
            })
    except:
        pass

print(f'\n采集到 {len(all_data)} 条数据')

with open('I:\\trae_projects\\GAOKAO2026\\data\\hainan_scores\\安徽农业大学_2023_test.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, ensure_ascii=False, indent=2)

driver.quit()