# -*- coding: utf-8 -*-
"""
天津高考近三年专业分数线自动化采集工具
使用Chrome DevTools Protocol (CDP) 连接夸克浏览器进行自动化采集

使用步骤:
1. 关闭所有夸克浏览器窗口
2. 以远程调试模式启动夸克浏览器:
   "C:\Program Files (x86)\Quark\Quark.exe" --remote-debugging-port=9222
3. 在夸克浏览器中登录账户，打开夸克高考页面
4. 运行本脚本: python tianjin_auto_scraper.py

依赖:
- websocket-client: pip install websocket-client
"""

import json
import time
import urllib.request
import urllib.parse
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any

try:
    import websocket
except ImportError:
    print("❌ 缺少 websocket-client 库，请安装: pip install websocket-client")
    sys.exit(1)

QUARK_DEBUG_URL = "http://localhost:9222"
SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")

class QuarkCDPClient:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws: Optional[websocket.WebSocket] = None
        self.message_id = 0
        self.response_cache: Dict[int, Any] = {}
        self.response_event = __import__("threading").Event()

    def connect(self) -> bool:
        try:
            self.ws = websocket.create_connection(self.ws_url, timeout=15)
            self._start_listener()
            print(f"✅ 成功连接到夸克浏览器")
            return True
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            return False

    def _start_listener(self):
        import threading
        def listener():
            while self.ws and self.ws.connected:
                try:
                    message = self.ws.recv()
                    if message:
                        data = json.loads(message)
                        if "id" in data and data["id"] in self.response_cache:
                            self.response_cache[data["id"]] = data
                            self.response_event.set()
                except Exception:
                    break
        threading.Thread(target=listener, daemon=True).start()

    def send_command(self, method: str, params: Optional[Dict] = None, timeout: int = 30) -> Optional[Any]:
        if not self.ws:
            return None

        self.message_id += 1
        msg_id = self.message_id
        self.response_cache[msg_id] = None
        self.response_event.clear()

        message = {
            "id": msg_id,
            "method": method,
            "params": params or {}
        }

        try:
            self.ws.send(json.dumps(message))
            if self.response_event.wait(timeout=timeout):
                response = self.response_cache.get(msg_id)
                if response and "result" in response:
                    return response["result"]
                elif response and "error" in response:
                    print(f"❌ CDP命令错误: {response['error'].get('message', '未知错误')}")
            else:
                print(f"❌ CDP命令超时: {method} (超时{timeout}秒)")
        except Exception as e:
            print(f"❌ 发送命令失败: {e}")

        return None

    def execute_script(self, script: str, return_by_value: bool = True) -> Optional[Any]:
        result = self.send_command("Runtime.evaluate", {
            "expression": script,
            "returnByValue": return_by_value,
            "awaitPromise": True
        })
        if result and "result" in result:
            return result["result"].get("value")
        return None

    def wait_for_element(self, selector: str, timeout: int = 10) -> bool:
        script = f"""
        new Promise((resolve) => {{
            let count = 0;
            const maxChecks = {timeout * 2};
            const check = () => {{
                if (document.querySelector('{selector}')) {{
                    resolve(true);
                }} else if (count < maxChecks) {{
                    count++;
                    setTimeout(check, 500);
                }} else {{
                    resolve(false);
                }}
            }};
            check();
        }})
        """
        return self.execute_script(script) or False

    def navigate(self, url: str, max_retries: int = 3) -> bool:
        for attempt in range(max_retries):
            print(f"      导航尝试 {attempt + 1}/{max_retries}...")
            result = self.send_command("Page.navigate", {"url": url}, timeout=45)
            if result:
                time.sleep(5)
                return True
            else:
                if attempt < max_retries - 1:
                    print(f"      导航失败，等待5秒后重试...")
                    time.sleep(5)
        
        return False

    def close(self):
        if self.ws:
            self.ws.close()

def get_quark_pages() -> List[Dict]:
    try:
        url = f"{QUARK_DEBUG_URL}/json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"❌ 获取页面列表失败: {e}")
        return []

def find_gaokao_page(pages: List[Dict]) -> Optional[Dict]:
    for page in pages:
        title = page.get("title", "")
        url = page.get("url", "")
        if "高考" in title or "gaokao" in url.lower() or "quark" in url.lower():
            return page
    return pages[0] if pages else None

def load_schools() -> List[str]:
    if not os.path.exists(SCHOOLS_FILE):
        print(f"❌ 院校列表文件不存在: {SCHOOLS_FILE}")
        return []
    with open(SCHOOLS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_school_data(school_name: str, year: int, data: List[Dict]):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{school_name}_{year}_专业分数线.json"
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✅ 已保存: {filename} ({len(data)}条)")

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

def extract_major_scores(browser: QuarkCDPClient, school_name: str, year: int) -> List[Dict]:
    print(f"    正在提取{year}年数据...")
    
    script = """
    (function() {
        var items = document.querySelectorAll('.content-List-li');
        var allData = [];
        var lastGroup = '';
        var lastRequirement = '';
        
        for(var i=0; i<items.length; i++) {
            var item = items[i];
            var majorEl = item.querySelector('.content-List-major');
            if(!majorEl) continue;
            var name = majorEl.innerText.trim();
            if(name.length < 2 || name === '普通类') continue;
            
            var sEl = item.querySelector('.content-List-low_score');
            var rEl = item.querySelector('.content-List-low_rank');
            var cEl = item.querySelector('.content-List-luqurenshu');
            var bEl = item.querySelector('.qk-margin-top-s');
            var tEl = item.querySelector('.content-List-subTitle');
            var ft = item.innerText;
            
            var score = sEl ? parseInt(sEl.innerText.match(/\\d{2,3}/)) : null;
            var rank = rEl ? parseInt(rEl.innerText.match(/\\d{1,7}/)) : null;
            var cnt = cEl ? parseInt(cEl.innerText.match(/\\d+/)) : null;
            var batch = bEl ? bEl.innerText.trim() : '';
            var subTitle = tEl ? tEl.innerText.trim() : '';
            
            var reqMatch = ft.match(/选科要求[uff1a:](.+)$/);
            var requirement = reqMatch ? reqMatch[1].trim() : lastRequirement;
            
            var mgMatch = ft.match(/专业组[（(](\\d+)[）)]/);
            var group = mgMatch ? '专业组（' + mgMatch[1] + '）' : lastGroup;
            
            if(mgMatch) lastGroup = group;
            if(requirement) lastRequirement = requirement;
            
            if(score && (score < 100 || score > 900)) continue;
            
            allData.push({
                school_name: school_name,
                year: year,
                major_name: name,
                major_group: group,
                min_score: score,
                min_rank: rank,
                person_count: cnt,
                batch: batch,
                subject_requirement: requirement,
                province: '天津'
            });
        }
        
        var seen = {};
        var result = [];
        for(var i=0; i<allData.length; i++) {
            var item = allData[i];
            var key = item.major_name + '|' + item.min_score + '|' + item.min_rank;
            if(!seen[key]) {
                seen[key] = true;
                result.push(item);
            }
        }
        
        return result;
    })()
    """.replace("school_name", json.dumps(school_name)).replace("year", str(year))
    
    return browser.execute_script(script) or []

def switch_year(browser: QuarkCDPClient, year: int) -> bool:
    print(f"    正在切换到{year}年...")
    
    script = f"""
    new Promise((resolve) => {{
        var yearBtn = document.querySelector('.select-tabs-tab-nianfen');
        if(!yearBtn) {{
            yearBtn = document.querySelector('[class*="nianfen"]');
        }}
        if(!yearBtn) {{
            var btns = document.querySelectorAll('.qk-button');
            for(var i=0; i<btns.length; i++) {{
                if(btns[i].innerText.match(/^202[0-9]$/)) {{
                    yearBtn = btns[i];
                    break;
                }}
            }}
        }}
        
        if(!yearBtn) {{
            resolve(false);
            return;
        }}
        
        yearBtn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
        
        setTimeout(() => {{
            yearBtn.click();
            
            setTimeout(() => {{
                var options = document.querySelectorAll('.select-modal-li');
                if(options.length === 0) {{
                    var arrows = yearBtn.querySelectorAll('svg, [class*="arrow"]');
                    if(arrows.length > 0) arrows[0].click();
                }}
                
                setTimeout(() => {{
                    var allOptions = document.querySelectorAll('.select-modal-li');
                    var target = null;
                    for(var i=0; i<allOptions.length; i++) {{
                        if(allOptions[i].innerText.trim() === '{year}') {{
                            target = allOptions[i];
                            break;
                        }}
                    }}
                    
                    if(!target) {{
                        var all = document.querySelectorAll('*');
                        for(var i=0; i<all.length; i++) {{
                            try {{
                                if(all[i].innerText.trim() === '{year}' && all[i].children.length < 5) {{
                                    var r = all[i].getBoundingClientRect();
                                    if(r.width > 20 && r.height > 15) {{
                                        target = all[i];
                                        break;
                                    }}
                                }}
                            }} catch(e) {{}}
                        }}
                    }}
                    
                    if(target) {{
                        target.click();
                        setTimeout(() => resolve(true), 3000);
                    }} else {{
                        resolve(false);
                    }}
                }}, 1000);
            }}, 500);
        }}, 500);
    }})
    """
    
    return browser.execute_script(script) or False

def switch_to_major_tab(browser: QuarkCDPClient) -> bool:
    script = """
    new Promise((resolve) => {
        var tabs = document.querySelectorAll('.qk-tabs-tab');
        for(var i=0; i<tabs.length; i++) {
            if(tabs[i].innerText.indexOf('专业分数线') >= 0) {
                tabs[i].click();
                setTimeout(() => resolve(true), 2000);
                return;
            }
        }
        resolve(false);
    })
    """
    return browser.execute_script(script) or False

def process_school(browser: QuarkCDPClient, school_name: str) -> int:
    downloaded = get_downloaded_years(school_name)
    
    if len(downloaded) == 3:
        print(f"  ⏭️ {school_name} 三年数据已全部下载，跳过")
        return 0
    
    print(f"  📡 正在处理: {school_name}")
    print(f"     已下载: {downloaded}")
    
    url = build_school_url(school_name)
    print(f"     URL: {url}")
    
    if not browser.navigate(url):
        print(f"     ❌ 导航失败")
        return 0
    
    time.sleep(8)
    
    if not browser.wait_for_element('.content-List-li', timeout=20):
        print(f"     ❌ 页面加载失败")
        return 0
    
    switch_to_major_tab(browser)
    time.sleep(3)
    
    total_count = 0
    
    for year in [2023, 2024, 2025]:
        if year in downloaded:
            print(f"     ⏭️ {year}年已下载，跳过")
            continue
        
        if year != 2025:
            if not switch_year(browser, year):
                print(f"     ❌ 切换到{year}年失败")
                continue
            
            time.sleep(5)
            
            if not browser.wait_for_element('.content-List-li', timeout=15):
                print(f"     ❌ {year}年数据加载失败")
                continue
        
        data = extract_major_scores(browser, school_name, year)
        
        if data and len(data) > 0:
            save_school_data(school_name, year, data)
            total_count += len(data)
        else:
            print(f"     ⚠️ {year}年无有效数据")
    
    return total_count

def main():
    print("=" * 70)
    print("天津高考近三年专业分数线自动化采集工具")
    print("=" * 70)
    
    print("\n步骤1: 检查夸克浏览器连接...")
    pages = get_quark_pages()
    
    if not pages:
        print("\n❌ 未检测到夸克浏览器远程调试端口")
        print("\n请按以下步骤操作:")
        print("1. 关闭所有夸克浏览器窗口")
        print("2. 以远程调试模式启动夸克浏览器:")
        print('   "C:\\Program Files (x86)\\Quark\\Quark.exe" --remote-debugging-port=9222')
        print("3. 在夸克浏览器中登录账户")
        print("4. 打开夸克高考页面")
        print("\n或者使用Edge浏览器（夸克基于Chromium）:")
        print('   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222')
        return
    
    print(f"✅ 找到 {len(pages)} 个浏览器标签页")
    
    gaokao_page = find_gaokao_page(pages)
    if not gaokao_page:
        print("\n❌ 未找到夸克高考页面")
        print("请先在浏览器中打开夸克高考页面")
        return
    
    print(f"✅ 找到夸克高考页面: {gaokao_page.get('title', '未知')}")
    
    ws_url = gaokao_page.get("webSocketDebuggerUrl")
    if not ws_url:
        print("\n❌ 无法获取WebSocket调试地址")
        return
    
    print("\n步骤2: 连接到夸克浏览器...")
    browser = QuarkCDPClient(ws_url)
    if not browser.connect():
        return
    
    print("\n步骤3: 加载院校列表...")
    schools = load_schools()
    if not schools:
        browser.close()
        return
    
    print(f"✅ 共 {len(schools)} 所院校")
    
    print("\n步骤4: 开始批量采集...")
    print("=" * 70)
    
    success_count = 0
    fail_count = 0
    total_records = 0
    start_time = time.time()
    
    for i, school in enumerate(schools):
        print(f"\n[{i+1}/{len(schools)}]")
        
        try:
            count = process_school(browser, school)
            if count > 0:
                success_count += 1
                total_records += count
            else:
                downloaded = get_downloaded_years(school)
                if len(downloaded) == 3:
                    success_count += 1
                else:
                    fail_count += 1
        except Exception as e:
            print(f"  ❌ {school} 处理异常: {e}")
            fail_count += 1
        
        time.sleep(2)
    
    end_time = time.time()
    elapsed = end_time - start_time
    
    print("\n" + "=" * 70)
    print("采集完成！")
    print(f"总院校数: {len(schools)}")
    print(f"成功: {success_count}")
    print(f"失败: {fail_count}")
    print(f"总记录数: {total_records}")
    print(f"耗时: {elapsed:.2f} 秒")
    print(f"输出目录: {OUTPUT_DIR}")
    print("=" * 70)
    
    browser.close()

if __name__ == "__main__":
    main()
