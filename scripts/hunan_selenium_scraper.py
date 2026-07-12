# -*- coding: utf-8 -*-
"""
湖南高考近三年专业分数线自动化采集工具（优化版）
优化内容：
1. 减少固定等待时间，使用动态等待
2. 优化页面加载检测
3. 批量日志写入减少IO操作
4. 优化请求超时控制
"""
import json
import time
import urllib.parse
import os
import sys
import re
import subprocess
from datetime import datetime
from typing import Dict, List

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, InvalidSessionIdException, WebDriverException
except ImportError:
    print("❌ 缺少 Selenium 库，请安装: pip install selenium")
    sys.exit(1)

SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "hunan_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "hunan_scores")
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "logs", "hunan_scraper_selenium.log")

os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

class Logger:
    _buffer = []
    _flush_interval = 50
    _last_flush = time.time()
    
    @staticmethod
    def log(message: str, force_flush: bool = False):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{timestamp}] {message}"
        print(log_line)
        
        Logger._buffer.append(log_line + "\n")
        
        now = time.time()
        if len(Logger._buffer) >= Logger._flush_interval or (force_flush and Logger._buffer) or (now - Logger._last_flush > 10):
            Logger._flush()
    
    @staticmethod
    def _flush():
        if Logger._buffer:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.writelines(Logger._buffer)
            Logger._buffer.clear()
            Logger._last_flush = time.time()
    
    @staticmethod
    def flush():
        Logger._flush()

def load_schools() -> List[str]:
    if not os.path.exists(SCHOOLS_FILE):
        Logger.log(f"❌ 院校列表文件不存在: {SCHOOLS_FILE}")
        return []
    with open(SCHOOLS_FILE, "r", encoding="utf-8-sig") as f:
        return json.load(f)

def is_school_downloaded(school_name: str, year: int) -> bool:
    filename = f"{school_name}_{year}_专业分数线.json"
    filepath = os.path.join(OUTPUT_DIR, filename)
    return os.path.exists(filepath)

def get_downloaded_years(school_name: str) -> List[int]:
    years = []
    for year in [2023, 2024, 2025]:
        if is_school_downloaded(school_name, year):
            years.append(year)
    return years

def save_school_data(school_name: str, year: int, data: List[Dict]):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{school_name}_{year}_专业分数线.json"
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    Logger.log(f"  ✅ 已保存: {filename} ({len(data)}条)")

def build_school_url(school_name: str) -> str:
    encoded_name = urllib.parse.quote(school_name)
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
            "province": "湖南",
            "year": "2025",
            "batch": "本科批",
            "genre": "综合"
        }, ensure_ascii=False),
        "type": "luqu",
        "from": "kkframenew_gaokaopd_chadaxue",
        "uc_param_str": "ntnwvepffrbiprsvchutosstxskp"
    }
    query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    return f"{base_url}?{query_string}"

def extract_major_scores(driver, school_name: str, year: int) -> List[Dict]:
    try:
        items = driver.find_elements(By.CSS_SELECTOR, '.content-List-li')
    except:
        try:
            items = driver.find_elements(By.CSS_SELECTOR, '[class*="List-li"]')
        except:
            items = []
    
    if not items:
        return []
    
    for item in items:
        try:
            for expand_sel in ['.expand-btn', '[class*="expand"]', '.more-btn', '[class*="more"]', '.arrow', '[class*="arrow"]', '.icon-arrow', '[class*="icon-arrow"]']:
                try:
                    expand_btn = item.find_element(By.CSS_SELECTOR, expand_sel)
                    expand_btn.click()
                    time.sleep(0.3)
                    break
                except:
                    continue
        except:
            pass
    
    all_data = []
    last_group = ''
    last_requirement = ''
    
    for item in items:
        try:
            major_el = None
            for sel in ['.content-List-major', '[class*="List-major"]', '.major-name']:
                try:
                    major_el = item.find_element(By.CSS_SELECTOR, sel)
                    break
                except:
                    continue
            
            if not major_el:
                continue
            
            name = major_el.text.strip()
            if len(name) < 2 or name == '普通类':
                continue
            
            score = None
            rank = None
            cnt = None
            batch = ''
            requirement = ''
            group = ''
            description = ''
            
            for sel in ['.content-List-low_score', '[class*="low_score"]', '.score']:
                try:
                    s_el = item.find_element(By.CSS_SELECTOR, sel)
                    text = s_el.text
                    match = re.search(r'\d{2,3}', text)
                    if match:
                        score = int(match.group())
                    break
                except:
                    continue
            
            for sel in ['.content-List-low_rank', '[class*="low_rank"]', '.rank']:
                try:
                    r_el = item.find_element(By.CSS_SELECTOR, sel)
                    text = r_el.text
                    match = re.search(r'\d{1,7}', text)
                    if match:
                        rank = int(match.group())
                    break
                except:
                    continue
            
            for sel in ['.content-List-luqurenshu', '[class*="luqurenshu"]', '.count']:
                try:
                    c_el = item.find_element(By.CSS_SELECTOR, sel)
                    text = c_el.text
                    match = re.search(r'\d+', text)
                    if match:
                        cnt = int(match.group())
                    break
                except:
                    continue
            
            for sel in ['.qk-margin-top-s', '[class*="margin-top"]', '.batch']:
                try:
                    b_el = item.find_element(By.CSS_SELECTOR, sel)
                    batch = b_el.text.strip()
                    break
                except:
                    continue
            
            for sel in ['.content-List-desc', '[class*="List-desc"]', '[class*="desc"]', '.description', '[class*="description"]']:
                try:
                    d_el = item.find_element(By.CSS_SELECTOR, sel)
                    description = d_el.text.strip()
                    break
                except:
                    continue
            
            t_el = None
            for sel in ['.content-List-subTitle', '[class*="subTitle"]']:
                try:
                    t_el = item.find_element(By.CSS_SELECTOR, sel)
                    break
                except:
                    continue
            
            ft = item.text
            sub_title = t_el.text.strip() if t_el else ''
            
            if not description:
                desc_match = re.search(r'[(（](.+)[)）]', name)
                if desc_match:
                    description = desc_match.group(1).strip()
                    name = name.replace(desc_match.group(0), '').strip()
            
            if not description:
                full_desc_match = re.search(r'[(（]([^)）]+)[)）]', ft)
                if full_desc_match:
                    potential_desc = full_desc_match.group(1).strip()
                    if potential_desc and '选科要求' not in potential_desc and '专业组' not in potential_desc:
                        description = potential_desc
            
            if description:
                all_paren_matches = re.findall(r'[(（]([^)）]+)[)）]', ft)
                for match in all_paren_matches:
                    match_text = match.strip()
                    if match_text and '选科要求' not in match_text and '专业组' not in match_text and match_text not in description:
                        description += ' ' + match_text
            
            campus_match = re.search(r'(校本部|校区)', ft)
            if campus_match and '校区' not in description and '校本部' not in description:
                if description:
                    description += ' ' + campus_match.group(1)
                else:
                    description = campus_match.group(1)
            
            req_match = re.search(r'选科要求[uff1a:：](.+)$', ft)
            if req_match:
                requirement = req_match.group(1).strip()
                last_requirement = requirement
            elif not requirement and sub_title:
                dash_idx = sub_title.find(' - ')
                if dash_idx >= 0:
                    requirement = sub_title[dash_idx+3:].strip()
                    last_requirement = requirement
            else:
                requirement = last_requirement
            
            mg_match = re.search(r'专业组[（(](\d+)[）)]', ft)
            if mg_match:
                group = '专业组（' + mg_match.group(1) + '）'
                last_group = group
            elif not group and sub_title:
                smg_match = re.search(r'专业组[（(](\d+)[）)]', sub_title)
                if smg_match:
                    group = '专业组（' + smg_match.group(1) + '）'
                    last_group = group
            else:
                group = last_group
            
            if score and (score < 100 or score > 900):
                continue
            
            all_data.append({
                'school_name': school_name,
                'year': year,
                'major_name': name,
                'major_group': group,
                'min_score': score,
                'min_rank': rank,
                'person_count': cnt,
                'batch': batch,
                'major_description': description,
                'subject_requirement': requirement,
                'province': '湖南'
            })
        except Exception:
            continue
    
    has_format_count = sum(1 for item in all_data if item['subject_requirement'] and '选科' in item['subject_requirement'])
    has_group_count = sum(1 for item in all_data if item['major_group'])
    
    filtered_data = []
    if year == 2025:
        for item in all_data:
            if item['subject_requirement'] and '选科' in item['subject_requirement']:
                item['major_group'] = ''
                filtered_data.append(item)
        if len(filtered_data) == 0:
            filtered_data = all_data
    else:
        if has_group_count > 0:
            for item in all_data:
                if item['major_group']:
                    filtered_data.append(item)
        else:
            for item in all_data:
                if item['subject_requirement'] and '选科' in item['subject_requirement']:
                    filtered_data.append(item)
            if len(filtered_data) == 0:
                filtered_data = all_data
    
    seen = {}
    result = []
    for item in filtered_data:
        key = f"{item['major_name']}|{item['min_score']}|{item['min_rank']}|{item['major_group']}"
        if key not in seen:
            seen[key] = item
        else:
            existing = seen[key]
            if item.get('batch') and not existing.get('batch'):
                existing['batch'] = item['batch']
            if item.get('major_description') and not existing.get('major_description'):
                existing['major_description'] = item['major_description']
            if item.get('subject_requirement') and not existing.get('subject_requirement'):
                existing['subject_requirement'] = item['subject_requirement']
    
    result = list(seen.values())
    
    return result

def switch_year(driver, year: int) -> bool:
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
            time.sleep(1.5)
            
            if str(year) in driver.page_source:
                return True
        except Exception:
            continue
    
    return False

def switch_to_major_tab(driver) -> bool:
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
            time.sleep(0.5)
            return True
        except Exception:
            continue
    
    return False

def switch_province(driver, province: str) -> bool:
    scripts = [
        f"""
        var provinceSelect = document.querySelector('[class*="province"]');
        if(provinceSelect) provinceSelect.click();
        """,
        f"""
        var regionBtns = document.querySelectorAll('.qk-button, .select-tabs-tab, [class*="tab"]');
        for(var i=0; i<regionBtns.length; i++) {{
            if(regionBtns[i].innerText && regionBtns[i].innerText.indexOf('地区') >= 0) {{
                regionBtns[i].click();
                break;
            }}
        }}
        """,
        f"""
        var all = document.querySelectorAll('*');
        for(var i=0; i<all.length; i++) {{
            try {{
                if(all[i].innerText && all[i].innerText.indexOf('地区') >= 0 && all[i].innerText.indexOf('{province}') >= 0) {{
                    all[i].click();
                    break;
                }}
            }} catch(e) {{}}
        }}
        """
    ]
    
    for script in scripts:
        try:
            driver.execute_script(script)
            time.sleep(1)
            
            if province in driver.page_source:
                return True
        except Exception:
            continue
    
    return False

def create_driver():
    options = webdriver.EdgeOptions()
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--start-maximized")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    
    driver = webdriver.Edge(options=options)
    driver.set_page_load_timeout(60)
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            })
        """
    })
    
    return driver

def start_browser_automatically():
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_path):
        edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    if os.path.exists(edge_path):
        try:
            subprocess.Popen([edge_path])
            Logger.log("✅ 浏览器已自动启动")
            time.sleep(5)
            return True
        except Exception as e:
            Logger.log(f"⚠️ 浏览器自动启动失败: {e}")
            return False
    return False

def process_school(driver, school_name: str, skip_completed: bool = True) -> int:
    downloaded = get_downloaded_years(school_name)
    
    if skip_completed and len(downloaded) == 3:
        return 0
    
    Logger.log(f"  📡 正在处理: {school_name}")
    
    url = build_school_url(school_name)
    
    try:
        driver.get(url)
        
        try:
            WebDriverWait(driver, 12).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '.content-List-li, [class*="List-li"]'))
            )
        except TimeoutException:
            Logger.log(f"     ❌ 页面加载失败")
            return 0
        
        switch_to_major_tab(driver)
        time.sleep(0.5)
    except Exception as e:
        Logger.log(f"     ❌ 导航失败: {e}")
        return 0
    
    total_count = 0
    
    data_2025 = extract_major_scores(driver, school_name, 2025)
    
    if not data_2025 and len(downloaded) == 0:
        Logger.log(f"     ❌ 该院校无任何数据，跳过")
        return 0
    
    if 2025 not in downloaded and data_2025:
        save_school_data(school_name, 2025, data_2025)
        total_count += len(data_2025)
    
    for year in [2024, 2023]:
        if skip_completed and year in downloaded:
            continue
        
        success = False
        for retry in range(2):
            if switch_year(driver, year):
                success = True
                break
        
        if not success:
            Logger.log(f"     ❌ 切换到{year}年失败")
            continue
        
        time.sleep(1.5)
        
        data = extract_major_scores(driver, school_name, year)
        
        if data and len(data) > 0:
            save_school_data(school_name, year, data)
            total_count += len(data)
        else:
            Logger.log(f"     ⚠️ {year}年无有效数据")
    
    return total_count

def get_missing_schools() -> List[str]:
    schools = load_schools()
    missing = []
    for school in schools:
        downloaded = get_downloaded_years(school)
        if len(downloaded) < 3:
            missing.append(school)
    return missing

def main():
    Logger.log("=" * 70)
    Logger.log("湖南高考近三年专业分数线自动化采集工具（优化版）")
    Logger.log("=" * 70)
    
    skip_completed = '--all' not in sys.argv
    only_missing = '--missing' in sys.argv
    
    if only_missing:
        missing = get_missing_schools()
        Logger.log(f"\n📋 仅处理缺失数据的院校，共 {len(missing)} 所")
        target_schools = missing
    else:
        target_schools = load_schools()
    
    if not target_schools:
        Logger.log("❌ 没有需要处理的院校")
        return
    
    Logger.log("\n步骤1: 启动浏览器...")
    
    start_browser_automatically()
    driver = create_driver()
    Logger.log("✅ 浏览器启动成功")
    
    Logger.log("\n请在浏览器中登录夸克高考页面，脚本将等待30秒后开始采集...")
    time.sleep(30)
    
    Logger.log(f"\n步骤2: 开始批量采集...")
    Logger.log("=" * 70)
    
    success_count = 0
    fail_count = 0
    total_records = 0
    start_time = time.time()
    
    for i, school in enumerate(target_schools):
        Logger.log(f"\n[{i+1}/{len(target_schools)}]")
        
        try:
            count = process_school(driver, school, skip_completed=skip_completed)
            if count > 0:
                success_count += 1
                total_records += count
            else:
                downloaded = get_downloaded_years(school)
                if len(downloaded) == 3:
                    success_count += 1
                else:
                    fail_count += 1
        except InvalidSessionIdException:
            Logger.log(f"  ❌ 会话崩溃，正在恢复...")
            try:
                driver.quit()
            except:
                pass
            driver = create_driver()
            fail_count += 1
        except WebDriverException as e:
            Logger.log(f"  ❌ 浏览器错误: {e}")
            try:
                driver.quit()
            except:
                pass
            driver = create_driver()
            fail_count += 1
        except Exception as e:
            Logger.log(f"  ❌ {school} 处理异常: {e}")
            fail_count += 1
        
        time.sleep(0.5)
    
    end_time = time.time()
    elapsed = end_time - start_time
    
    Logger.log("\n" + "=" * 70, force_flush=True)
    Logger.log("采集完成！", force_flush=True)
    Logger.log(f"总院校数: {len(target_schools)}", force_flush=True)
    Logger.log(f"成功: {success_count}", force_flush=True)
    Logger.log(f"失败: {fail_count}", force_flush=True)
    Logger.log(f"总记录数: {total_records}", force_flush=True)
    Logger.log(f"耗时: {elapsed:.2f} 秒", force_flush=True)
    Logger.log(f"输出目录: {OUTPUT_DIR}", force_flush=True)
    Logger.log("=" * 70, force_flush=True)
    
    try:
        driver.quit()
    except:
        pass
    
    Logger.flush()

if __name__ == "__main__":
    main()
