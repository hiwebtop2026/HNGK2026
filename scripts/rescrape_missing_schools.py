# -*- coding: utf-8 -*-
"""
重新采集41所缺失院校的数据
这些院校的数据文件存在，但所有记录的min_score都是None
需要改进数据提取逻辑，确保能获取到分数数据
"""
import json
import os
import sys
import time
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, InvalidSessionIdException

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")
SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_schools.json")

MISSING_SCHOOLS = [
    '中南大学', '中南财经政法大学', '中国地质大学', '中山大学', '兰州大学',
    '北京交通大学', '北京化工大学', '北京协和医学院', '北京林业大学', '北京科技大学',
    '北京语言大学', '北京邮电大学', '华中农业大学', '华中师范大学', '华中科技大学',
    '南开大学', '四川农业大学', '四川大学', '天津中医药大学', '天津医科大学',
    '天津大学', '天津工业大学', '天津师范大学', '天津理工大学', '天津科技大学',
    '天津财经大学', '暨南大学', '武汉大学', '武汉理工大学', '河北工业大学',
    '湖南大学', '电子科技大学', '西北农林科技大学', '西北工业大学', '西南交通大学',
    '西南大学', '西南财经大学', '西安交通大学', '西安电子科技大学', '重庆大学', '长安大学'
]

class Logger:
    @staticmethod
    def log(message):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {message}")

def create_driver():
    edge_options = Options()
    edge_options.add_argument("--disable-gpu")
    edge_options.add_argument("--no-sandbox")
    edge_options.add_argument("--disable-dev-shm-usage")
    edge_options.add_argument("--window-size=1920,1080")
    edge_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Edge(options=edge_options)
    driver.set_page_load_timeout(30)
    return driver

def build_school_url(school_name):
    import urllib.parse
    base_url = "https://vt.quark.cn/blm/gaokao-college-794/tab"
    params = {
        "app": "fen_shu_xian",
        "university_name": school_name,
        "q": school_name,
        "uc_biz_str": "qk_enable_gesture:true|OPT:W_ENTER_ANI@1|OPT:TOOLBAR_STYLE@0|OPT:W_PAGE_REFRESH@0|OPT:BACK_BTN_STYLE@0|OPT:IMMERSIVE@1",
        "device": "pc",
        "bar": "pure",
        "by": "tuijian",
        "by2": "general_entity_college",
        "params": json.dumps({
            "province": "天津",
            "year": "2025",
            "batch": "本科批A阶段",
            "genre": "综合"
        }, ensure_ascii=False),
        "type": "luqu",
        "from": "kkframenew_gaokaopd_chadaxue",
        "uc_param_str": "ntnwvepffrbiprsvchutosstxskp"
    }
    query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    return f"{base_url}?{query_string}"

def extract_major_scores_improved(driver, school_name, year):
    Logger.log(f"    正在提取{year}年数据...")
    
    all_data = []
    last_group = ''
    last_requirement = ''
    
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.content-List-li, [class*="List-li"]'))
        )
    except TimeoutException:
        Logger.log(f"    ⚠️ 未找到列表元素")
        return all_data
    
    items = driver.find_elements(By.CSS_SELECTOR, '.content-List-li, [class*="List-li"], [class*="list-item"], .major-item')
    
    for item in items:
        try:
            name = ''
            score = None
            rank = None
            cnt = None
            batch = ''
            group = ''
            requirement = ''
            
            for sel in ['.content-List-major', '[class*="major"]', '.major-name', '.name']:
                try:
                    m_el = item.find_element(By.CSS_SELECTOR, sel)
                    name = m_el.text.strip()
                    if len(name) >= 2 and name != '普通类':
                        break
                    name = ''
                except:
                    continue
            
            if not name:
                continue
            
            for sel in ['.content-List-low_score', '[class*="low_score"]', '[class*="score"]', '.score', '[class*="fenshu"]', '[class*="fen"]']:
                try:
                    s_el = item.find_element(By.CSS_SELECTOR, sel)
                    text = s_el.text
                    match = re.search(r'\d{2,3}', text)
                    if match:
                        score = int(match.group())
                        if score >= 100 and score <= 900:
                            break
                    score = None
                except:
                    continue
            
            if score is None:
                try:
                    ft = item.text
                    score_match = re.search(r'分数[uff1a:]\s*(\d{2,3})', ft)
                    if score_match:
                        score = int(score_match.group(1))
                    else:
                        score_match = re.search(r'(\d{2,3})\s*分', ft)
                        if score_match:
                            score = int(score_match.group(1))
                except:
                    pass
            
            for sel in ['.content-List-low_rank', '[class*="low_rank"]', '[class*="rank"]', '.rank', '[class*="mingci"]', '[class*="ci"]']:
                try:
                    r_el = item.find_element(By.CSS_SELECTOR, sel)
                    text = r_el.text
                    match = re.search(r'\d{1,7}', text)
                    if match:
                        rank = int(match.group())
                    break
                except:
                    continue
            
            for sel in ['.content-List-luqurenshu', '[class*="luqurenshu"]', '.count', '[class*="num"]', '[class*="people"]']:
                try:
                    c_el = item.find_element(By.CSS_SELECTOR, sel)
                    text = c_el.text
                    match = re.search(r'\d+', text)
                    if match:
                        cnt = int(match.group())
                    break
                except:
                    continue
            
            for sel in ['.qk-margin-top-s', '[class*="margin-top"]', '.batch', '[class*="batch"]', '[class*="pici"]']:
                try:
                    b_el = item.find_element(By.CSS_SELECTOR, sel)
                    batch = b_el.text.strip()
                    break
                except:
                    continue
            
            ft = item.text
            
            req_match = re.search(r'选科要求[uff1a:](.+)$', ft)
            if req_match:
                requirement = req_match.group(1).strip()
                last_requirement = requirement
            else:
                requirement = last_requirement
            
            mg_match = re.search(r'专业组[（(](\d+)[）)]', ft)
            if mg_match:
                group = '专业组（' + mg_match.group(1) + '）'
                last_group = group
            else:
                group = last_group
            
            if score and (score < 100 or score > 900):
                score = None
            
            all_data.append({
                'school_name': school_name,
                'year': year,
                'major_name': name,
                'major_group': group,
                'min_score': score,
                'min_rank': rank,
                'person_count': cnt,
                'batch': batch,
                'subject_requirement': requirement,
                'province': '天津'
            })
        except Exception as e:
            continue
    
    seen = {}
    result = []
    for item in all_data:
        key = f"{item['major_name']}|{item['min_score']}|{item['min_rank']}"
        if key not in seen:
            seen[key] = True
            result.append(item)
    
    valid_count = sum(1 for r in result if r['min_score'] is not None and r['min_score'] >= 100)
    Logger.log(f"    提取完成: {len(result)}条记录, 有效分数: {valid_count}条")
    
    return result

def switch_year(driver, year):
    Logger.log(f"    正在切换到{year}年...")
    
    scripts = [
        f"""
        var btns = document.querySelectorAll('.qk-button, .select-tabs-tab, [class*="tab"]');
        for(var i=0; i<btns.length; i++) {{
            if(btns[i].innerText.match(/202[3-5]/)) {{
                btns[i].click();
                break;
            }}
        }}
        """,
        f"""
        var yearBtn = document.querySelector('[class*="nianfen"]') || document.querySelector('[class*="year"]');
        if(yearBtn) yearBtn.click();
        """,
        f"""
        var all = document.querySelectorAll('*');
        for(var i=0; i<all.length; i++) {{
            try {{
                if(all[i].innerText.trim() === '{year}' && all[i].children.length < 5) {{
                    var r = all[i].getBoundingClientRect();
                    if(r.width > 20 && r.height > 15) {{
                        all[i].click();
                        break;
                    }}
                }}
            }} catch(e) {{}}
        }}
        """
    ]
    
    for script in scripts:
        try:
            driver.execute_script(script)
            time.sleep(3)
            
            page_text = driver.page_source
            if str(year) in page_text:
                Logger.log(f"     ✅ 切换到{year}年成功")
                return True
        except Exception as e:
            continue
    
    return False

def switch_to_major_tab(driver):
    scripts = [
        """
        var tabs = document.querySelectorAll('.qk-tabs-tab');
        for(var i=0; i<tabs.length; i++) {
            if(tabs[i].innerText.indexOf('专业分数线') >= 0) {
                tabs[i].click();
                break;
            }
        }
        """,
        """
        var all = document.querySelectorAll('*');
        for(var i=0; i<all.length; i++) {
            try {
                if(all[i].innerText.trim() === '专业分数线') {
                    all[i].click();
                    break;
                }
            } catch(e) {}
        }
        """
    ]
    
    for script in scripts:
        try:
            driver.execute_script(script)
            time.sleep(2)
            return True
        except Exception:
            continue
    
    return False

def save_school_data(school_name, year, data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{school_name}_{year}_专业分数线.json"
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    valid_count = sum(1 for r in data if r['min_score'] is not None and r['min_score'] >= 100)
    Logger.log(f"  ✅ 已保存: {filename} ({len(data)}条记录, 有效分数:{valid_count}条)")

def scrape_school(driver, school_name):
    Logger.log(f"🔍 开始采集: {school_name}")
    
    url = build_school_url(school_name)
    
    try:
        driver.get(url)
        time.sleep(5)
        
        switch_to_major_tab(driver)
        time.sleep(3)
        
        for year in [2025, 2024, 2023]:
            Logger.log(f"  📅 处理{year}年...")
            
            if year != 2025:
                switch_year(driver, year)
                time.sleep(4)
            
            data = extract_major_scores_improved(driver, school_name, year)
            
            if data:
                save_school_data(school_name, year, data)
            
            time.sleep(2)
        
        Logger.log(f"✅ {school_name}采集完成")
        return True
        
    except Exception as e:
        Logger.log(f"❌ {school_name}采集失败: {str(e)[:100]}")
        return False

def main():
    Logger.log("=" * 70)
    Logger.log("重新采集缺失院校数据")
    Logger.log("=" * 70)
    
    Logger.log(f"\n待采集院校数: {len(MISSING_SCHOOLS)}")
    for school in MISSING_SCHOOLS[:5]:
        Logger.log(f"  - {school}")
    if len(MISSING_SCHOOLS) > 5:
        Logger.log(f"  ... 还有 {len(MISSING_SCHOOLS) - 5} 所院校")
    
    driver = create_driver()
    success_count = 0
    fail_count = 0
    session_recovers = 0
    
    try:
        for i, school_name in enumerate(MISSING_SCHOOLS, 1):
            Logger.log(f"\n{'='*60}")
            Logger.log(f"[{i}/{len(MISSING_SCHOOLS)}] {school_name}")
            Logger.log(f"{'='*60}")
            
            try:
                success = scrape_school(driver, school_name)
                if success:
                    success_count += 1
                else:
                    fail_count += 1
            
            except InvalidSessionIdException:
                Logger.log(f"  ❌ 会话崩溃，正在恢复...")
                session_recovers += 1
                
                try:
                    driver.quit()
                except:
                    pass
                
                driver = create_driver()
                Logger.log(f"  ✅ 会话已恢复 ({session_recovers})")
                fail_count += 1
            
            time.sleep(3)
        
    finally:
        driver.quit()
    
    Logger.log("\n" + "=" * 70)
    Logger.log("采集结果汇总")
    Logger.log("=" * 70)
    Logger.log(f"成功: {success_count}")
    Logger.log(f"失败: {fail_count}")
    Logger.log(f"会话恢复次数: {session_recovers}")
    
    if fail_count > 0:
        Logger.log(f"\n⚠️ 建议检查失败院校的页面结构或手动采集")

if __name__ == "__main__":
    main()