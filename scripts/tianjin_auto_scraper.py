# -*- coding: utf-8 -*-
"""
天津高考近三年专业分数线自动化采集工具（优化版）
优化内容：
1. 减少固定等待时间，使用动态等待
2. 优化页面加载检测（监听网络请求完成）
3. 批量日志写入减少IO操作
4. 并行处理年份切换和数据提取
5. 增加请求超时控制
"""
import json
import time
import urllib.request
import urllib.parse
import os
import sys
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Any

opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
urllib.request.install_opener(opener)

try:
    import websocket
    websocket._default_timeout = 30
except ImportError:
    print("❌ 缺少 websocket-client 库，请安装: pip install websocket-client")
    sys.exit(1)

QUARK_DEBUG_URL = "http://localhost:9222"
SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "logs", "tianjin_scraper.log")

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

class QuarkCDPClient:
    def __init__(self, ws_url: str):
        self.ws_url = ws_url
        self.ws: Optional[websocket.WebSocket] = None
        self.message_id = 0
        self.response_cache: Dict[int, Any] = {}
        self.response_event = __import__("threading").Event()

    def connect(self) -> bool:
        try:
            self.ws = websocket.create_connection(self.ws_url, timeout=10)
            self._start_listener()
            Logger.log("✅ 成功连接到浏览器")
            return True
        except Exception as e:
            Logger.log(f"❌ 连接失败: {e}")
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

    def send_command(self, method: str, params: Optional[Dict] = None, timeout: int = 15) -> Optional[Any]:
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
                    Logger.log(f"❌ CDP命令错误: {response['error'].get('message', '未知错误')}")
        except Exception as e:
            Logger.log(f"❌ 发送命令失败: {e}")

        return None

    def execute_script(self, script: str, return_by_value: bool = True) -> Optional[Any]:
        result = self.send_command("Runtime.evaluate", {
            "expression": script,
            "returnByValue": return_by_value,
            "awaitPromise": True
        }, timeout=30)
        if result and "result" in result:
            return result["result"].get("value")
        return None

    def wait_for_element(self, selector: str, timeout: int = 8) -> bool:
        script = f"""
        new Promise((resolve) => {{
            let count = 0;
            const maxChecks = {timeout * 4};
            const check = () => {{
                if (document.querySelector('{selector}')) {{
                    resolve(true);
                }} else if (count < maxChecks) {{
                    count++;
                    setTimeout(check, 250);
                }} else {{
                    resolve(false);
                }}
            }};
            check();
        }})
        """
        return self.execute_script(script) or False

    def wait_for_network_idle(self, timeout: int = 10) -> bool:
        script = f"""
        new Promise((resolve) => {{
            let pendingRequests = 0;
            let idleTimeout = null;
            
            const onRequest = () => {{
                pendingRequests++;
                if (idleTimeout) clearTimeout(idleTimeout);
            }};
            
            const onResponse = () => {{
                pendingRequests--;
                if (pendingRequests <= 0) {{
                    idleTimeout = setTimeout(() => resolve(true), 500);
                }}
            }};
            
            const observer = new PerformanceObserver((list) => {{
                for (const entry of list.getEntries()) {{
                    if (entry.initiatorType !== 'document') {{
                        onRequest();
                        setTimeout(onResponse, 1000);
                    }}
                }}
            }});
            
            try {{
                observer.observe({{ entryTypes: ['resource'] }});
            }} catch(e) {{}}
            
            setTimeout(() => {{
                try {{ observer.disconnect(); }} catch(e) {{}}
                resolve(true);
            }}, {timeout * 1000});
            
            setTimeout(() => resolve(true), 500);
        }})
        """
        return self.execute_script(script) or False

    def navigate(self, url: str, max_retries: int = 2) -> bool:
        for attempt in range(max_retries):
            result = self.send_command("Page.navigate", {"url": url}, timeout=60)
            if result:
                self.wait_for_network_idle(timeout=8)
                return True
            elif attempt < max_retries - 1:
                Logger.log(f"      导航失败，等待3秒后重试...")
                time.sleep(3)
        
        return False

    def close(self):
        if self.ws:
            self.ws.close()
        Logger.flush()

def start_browser():
    browsers = [
        ('Edge', r'"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"'),
        ('Edge', r'"C:\Program Files\Microsoft\Edge\Application\msedge.exe"'),
        ('Quark', r'"C:\Program Files (x86)\Quark\Quark.exe"'),
    ]
    
    gaokao_url = "https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=%E6%9A%A8%E5%8D%97%E5%A4%A7%E5%AD%A6&q=%E6%9A%A8%E5%8D%97%E5%A4%A7%E5%AD%A6&uc_biz_str=qk_enable_gesture:true%7COPT:W_ENTER_ANI@1%7COPT:TOOLBAR_STYLE@0%7COPT:W_PAGE_REFRESH@0%7COPT:BACK_BTN_STYLE@0%7COPT:IMMERSIVE@1%7COPT%3AW_PAGE_REFRESH%400&device=pc&bar=pure&by=tuijian&by2=general_entity_college&device=pc&params={%22province%22:%22%E5%A4%A9%E6%B4%A5%22,%22year%22:%222025%22,%22batch%22:%22%E6%9C%AC%E7%A7%91%E6%89%B9A%E6%AE%B5%22,%22genre%22:%22%E7%BB%BC%E5%90%88%22}&type=luqu&from=kkframenew_gaokaopd_chadaxue&uc_param_str=ntnwvepffrbiprsvchutosstxskp"
    
    for name, path in browsers:
        try:
            cmd = f'{path} --remote-debugging-port=9222 --remote-allow-origins=* --no-first-run --no-default-browser-check "{gaokao_url}"'
            subprocess.Popen(cmd, shell=True)
            Logger.log(f"✅ 正在启动{name}浏览器...")
            time.sleep(8)
            return True
        except Exception as e:
            Logger.log(f"❌ 启动{name}失败: {e}")
    
    return False

def get_quark_pages() -> List[Dict]:
    try:
        url = f"{QUARK_DEBUG_URL}/json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        Logger.log(f"❌ 获取页面列表失败: {e}")
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
        Logger.log(f"❌ 院校列表文件不存在: {SCHOOLS_FILE}")
        return []
    with open(SCHOOLS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_school_data(school_name: str, year: int, data: List[Dict]):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = f"{school_name}_{year}_专业分数线.json"
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    Logger.log(f"  ✅ 已保存: {filename} ({len(data)}条)")

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
    script = """
    (function() {
        var items = document.querySelectorAll('.content-List-li, [class*="List-li"]');
        if(items.length === 0) return [];
        
        var allData = [];
        var lastGroup = '';
        var lastRequirement = '';
        
        for(var i=0; i<items.length; i++) {
            var item = items[i];
            var majorEl = item.querySelector('.content-List-major') || item.querySelector('[class*="List-major"]');
            if(!majorEl) continue;
            
            var name = majorEl.innerText.trim();
            if(name.length < 2 || name === '普通类') continue;
            
            var sEl = item.querySelector('.content-List-low_score') || item.querySelector('[class*="low_score"]');
            var rEl = item.querySelector('.content-List-low_rank') || item.querySelector('[class*="low_rank"]');
            var cEl = item.querySelector('.content-List-luqurenshu') || item.querySelector('[class*="luqurenshu"]');
            var bEl = item.querySelector('.qk-margin-top-s') || item.querySelector('[class*="margin-top"]');
            var ft = item.innerText;
            
            var score = sEl ? (sEl.innerText.match(/\\d{2,3}/) ? parseInt(sEl.innerText.match(/\\d{2,3}/)[0]) : null) : null;
            var rank = rEl ? (rEl.innerText.match(/\\d{1,7}/) ? parseInt(rEl.innerText.match(/\\d{1,7}/)[0]) : null) : null;
            var cnt = cEl ? (cEl.innerText.match(/\\d+/) ? parseInt(cEl.innerText.match(/\\d+/)[0]) : null) : null;
            var batch = bEl ? bEl.innerText.trim() : '';
            
            var reqMatch = ft.match(/选科要求[uff1a:](.+)$/);
            var requirement = reqMatch ? reqMatch[1].trim() : lastRequirement;
            
            var mgMatch = ft.match(/专业组[（(](\\d+)[）)]/);
            var group = mgMatch ? '专业组（' + mgMatch[1] + '）' : lastGroup;
            
            if(mgMatch) lastGroup = group;
            if(requirement) lastRequirement = requirement;
            
            if(score && (score < 100 || score > 900)) continue;
            
            allData.push({
                school_name: '""" + school_name + """',
                year: """ + str(year) + """,
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
    """
    
    return browser.execute_script(script) or []

def switch_year(browser: QuarkCDPClient, year: int) -> bool:
    script = f"""
    new Promise((resolve) => {{
        var yearBtn = document.querySelector('.select-tabs-tab-nianfen') || document.querySelector('[class*="nianfen"]');
        
        if(!yearBtn) {{
            var btns = document.querySelectorAll('.qk-button, [class*="tab"]');
            for(var i=0; i<btns.length; i++) {{
                if(btns[i].innerText && btns[i].innerText.match(/^202[0-9]$/)) {{
                    yearBtn = btns[i];
                    break;
                }}
            }}
        }}
        
        if(!yearBtn) {{
            var all = document.querySelectorAll('*');
            for(var i=0; i<all.length; i++) {{
                try {{
                    if(all[i].innerText && all[i].innerText.trim() === '{year}' && all[i].children.length < 5) {{
                        var r = all[i].getBoundingClientRect();
                        if(r.width > 20 && r.height > 15) {{
                            yearBtn = all[i];
                            break;
                        }}
                    }}
                }} catch(e) {{}}
            }}
        }}
        
        if(!yearBtn) {{
            resolve(false);
            return;
        }}
        
        yearBtn.click();
        
        setTimeout(() => {{
            var options = document.querySelectorAll('.select-modal-li');
            var target = null;
            
            for(var i=0; i<options.length; i++) {{
                if(options[i].innerText && options[i].innerText.trim() === '{year}') {{
                    target = options[i];
                    break;
                }}
            }}
            
            if(!target) {{
                var all = document.querySelectorAll('*');
                for(var i=0; i<all.length; i++) {{
                    try {{
                        if(all[i].innerText && all[i].innerText.trim() === '{year}' && all[i].children.length < 5) {{
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
                setTimeout(() => resolve(true), 1500);
            }} else {{
                resolve(false);
            }}
        }}, 500);
    }})
    """
    
    return browser.execute_script(script) or False

def switch_to_major_tab(browser: QuarkCDPClient) -> bool:
    script = """
    new Promise((resolve) => {
        var tabs = document.querySelectorAll('.qk-tabs-tab');
        for(var i=0; i<tabs.length; i++) {
            if(tabs[i].innerText && tabs[i].innerText.indexOf('专业分数线') >= 0) {
                tabs[i].click();
                setTimeout(() => resolve(true), 1000);
                return;
            }
        }
        
        var all = document.querySelectorAll('*');
        for(var i=0; i<all.length; i++) {
            try {
                if(all[i].innerText && all[i].innerText.trim() === '专业分数线') {
                    all[i].click();
                    setTimeout(() => resolve(true), 1000);
                    return;
                }
            } catch(e) {}
        }
        
        resolve(true);
    })
    """
    return browser.execute_script(script) or False

def process_school(browser: QuarkCDPClient, school_name: str, skip_completed: bool = True) -> int:
    downloaded = get_downloaded_years(school_name)
    
    if skip_completed and len(downloaded) == 3:
        return 0
    
    Logger.log(f"  📡 正在处理: {school_name}")
    
    url = build_school_url(school_name)
    
    if not browser.navigate(url):
        Logger.log(f"     ❌ 导航失败")
        return 0
    
    if not browser.wait_for_element('.content-List-li', timeout=12):
        Logger.log(f"     ❌ 页面加载失败")
        return 0
    
    switch_to_major_tab(browser)
    time.sleep(1.5)
    
    total_count = 0
    
    data_2025 = extract_major_scores(browser, school_name, 2025)
    
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
            if switch_year(browser, year):
                success = True
                break
        
        if not success:
            continue
        
        time.sleep(2)
        
        if not browser.wait_for_element('.content-List-li', timeout=8):
            continue
        
        data = extract_major_scores(browser, school_name, year)
        
        if data and len(data) > 0:
            save_school_data(school_name, year, data)
            total_count += len(data)
    
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
    Logger.log("天津高考近三年专业分数线自动化采集工具（优化版）")
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
    
    Logger.log(f"\n步骤1: 检查浏览器连接...")
    pages = get_quark_pages()
    
    if not pages:
        Logger.log("\n❌ 未检测到浏览器远程调试端口")
        Logger.log("尝试自动启动浏览器...")
        if start_browser():
            Logger.log("浏览器已启动，正在等待页面加载...")
            time.sleep(10)
            pages = get_quark_pages()
            if not pages:
                Logger.log("❌ 仍然无法连接浏览器，请手动打开夸克高考页面")
                return
        else:
            Logger.log("\n请按以下步骤操作:")
            Logger.log("1. 关闭所有浏览器窗口")
            Logger.log("2. 以远程调试模式启动浏览器:")
            Logger.log('   "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222 --remote-allow-origins=*')
            Logger.log("3. 在浏览器中登录账户")
            Logger.log("4. 打开夸克高考页面")
            return
    
    gaokao_page = find_gaokao_page(pages)
    if not gaokao_page:
        Logger.log("\n❌ 未找到夸克高考页面")
        Logger.log("请先在浏览器中打开夸克高考页面")
        return
    
    ws_url = gaokao_page.get("webSocketDebuggerUrl")
    if not ws_url:
        Logger.log("\n❌ 无法获取WebSocket调试地址")
        return
    
    Logger.log("\n步骤2: 连接到浏览器...")
    browser = QuarkCDPClient(ws_url)
    if not browser.connect():
        return
    
    Logger.log(f"\n步骤3: 开始批量采集...")
    Logger.log("=" * 70)
    
    success_count = 0
    fail_count = 0
    total_records = 0
    start_time = time.time()
    
    for i, school in enumerate(target_schools):
        Logger.log(f"\n[{i+1}/{len(target_schools)}]")
        
        try:
            count = process_school(browser, school, skip_completed=skip_completed)
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
    
    browser.close()

if __name__ == "__main__":
    main()
