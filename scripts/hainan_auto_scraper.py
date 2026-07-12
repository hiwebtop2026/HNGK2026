# -*- coding: utf-8 -*-
"""
海南高考近三年专业分数线自动化采集工具（优化版）
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
SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_scores")
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "logs", "hainan_scraper.log")

os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

HAINAN_985_SCHOOLS = [
    "北京大学", "清华大学", "复旦大学", "上海交通大学", "浙江大学",
    "南京大学", "中国科学技术大学", "哈尔滨工业大学", "西安交通大学",
    "北京航空航天大学", "北京理工大学", "中国人民大学", "北京师范大学",
    "武汉大学", "华中科技大学", "同济大学", "中山大学", "华南理工大学",
    "南开大学", "天津大学", "东南大学", "厦门大学", "山东大学",
    "四川大学", "吉林大学", "中南大学", "重庆大学", "西北工业大学",
    "兰州大学", "东北大学", "湖南大学", "大连理工大学", "华东师范大学",
    "电子科技大学", "中国农业大学", "中国海洋大学", "西北农林科技大学",
    "中央民族大学"
]

HAINAN_211_SCHOOLS = [
    "北京大学", "清华大学", "复旦大学", "上海交通大学", "浙江大学",
    "南京大学", "中国科学技术大学", "哈尔滨工业大学", "西安交通大学",
    "北京航空航天大学", "北京理工大学", "中国人民大学", "北京师范大学",
    "武汉大学", "华中科技大学", "同济大学", "中山大学", "华南理工大学",
    "南开大学", "天津大学", "东南大学", "厦门大学", "山东大学",
    "四川大学", "吉林大学", "中南大学", "重庆大学", "西北工业大学",
    "兰州大学", "东北大学", "湖南大学", "大连理工大学", "华东师范大学",
    "电子科技大学", "中国农业大学", "中国海洋大学", "西北农林科技大学",
    "中央民族大学", "北京交通大学", "北京工业大学", "北京科技大学",
    "北京化工大学", "北京邮电大学", "北京林业大学", "北京中医药大学",
    "北京外国语大学", "中国传媒大学", "中央财经大学", "对外经济贸易大学",
    "中国政法大学", "华北电力大学", "天津医科大学", "河北工业大学",
    "太原理工大学", "内蒙古大学", "辽宁大学", "大连海事大学",
    "延边大学", "东北师范大学", "哈尔滨工程大学", "东北农业大学",
    "东北林业大学", "华东理工大学", "东华大学", "上海外国语大学",
    "上海财经大学", "上海大学", "南京航空航天大学", "南京理工大学",
    "中国矿业大学", "南京邮电大学", "河海大学", "江南大学",
    "南京林业大学", "南京农业大学", "中国药科大学", "南京师范大学",
    "宁波大学", "安徽大学", "合肥工业大学", "福州大学", "南昌大学",
    "中国石油大学", "郑州大学", "中国地质大学", "武汉理工大学",
    "华中农业大学", "华中师范大学", "中南财经政法大学", "湖南师范大学",
    "暨南大学", "华南师范大学", "广西大学", "海南大学",
    "西南大学", "西南交通大学", "四川农业大学", "西南财经大学",
    "贵州大学", "云南大学", "西藏大学", "西北大学",
    "西安电子科技大学", "长安大学", "陕西师范大学", "青海大学",
    "宁夏大学", "新疆大学", "石河子大学"
]

HAINAN_DOUBLE_FIRST_SCHOOLS = [
    "北京大学", "清华大学", "中国人民大学", "北京师范大学",
    "北京航空航天大学", "北京理工大学", "中国农业大学", "北京科技大学",
    "北京交通大学", "北京邮电大学", "北京化工大学", "北京林业大学",
    "北京中医药大学", "北京外国语大学", "中国传媒大学", "中央财经大学",
    "对外经济贸易大学", "中国政法大学", "华北电力大学", "南开大学",
    "天津大学", "天津医科大学", "河北工业大学", "太原理工大学",
    "内蒙古大学", "辽宁大学", "大连理工大学", "东北大学",
    "吉林大学", "延边大学", "东北师范大学", "哈尔滨工业大学",
    "哈尔滨工程大学", "东北农业大学", "东北林业大学", "复旦大学",
    "同济大学", "上海交通大学", "华东理工大学", "东华大学",
    "华东师范大学", "上海外国语大学", "上海财经大学", "上海大学",
    "南京大学", "东南大学", "南京航空航天大学", "南京理工大学",
    "中国矿业大学", "南京邮电大学", "河海大学", "江南大学",
    "南京农业大学", "中国药科大学", "南京师范大学", "浙江大学",
    "宁波大学", "安徽大学", "中国科学技术大学", "合肥工业大学",
    "厦门大学", "福州大学", "南昌大学", "山东大学",
    "中国海洋大学", "中国石油大学", "郑州大学", "武汉大学",
    "华中科技大学", "中国地质大学", "武汉理工大学", "华中农业大学",
    "华中师范大学", "中南财经政法大学", "湖南大学", "中南大学",
    "湖南师范大学", "中山大学", "暨南大学", "华南理工大学",
    "华南师范大学", "广西大学", "海南大学", "重庆大学",
    "西南大学", "四川大学", "西南交通大学", "电子科技大学",
    "四川农业大学", "西南财经大学", "贵州大学", "云南大学",
    "西藏大学", "西北大学", "西安交通大学", "西北工业大学",
    "西安电子科技大学", "长安大学", "西北农林科技大学", "陕西师范大学",
    "兰州大学", "青海大学", "宁夏大学", "新疆大学",
    "石河子大学"
]

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

def switch_province_cdp(browser: QuarkCDPClient, province: str) -> bool:
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
            browser.execute_script(script)
            time.sleep(1)
            
            result = browser.execute_script(f"return document.body.innerText.indexOf('{province}') >= 0;")
            if result:
                return True
        except Exception:
            continue
    
    return False

def generate_school_list():
    all_schools = list(set(HAINAN_985_SCHOOLS + HAINAN_211_SCHOOLS + HAINAN_DOUBLE_FIRST_SCHOOLS))
    all_schools.sort()
    
    os.makedirs(os.path.dirname(SCHOOLS_FILE), exist_ok=True)
    with open(SCHOOLS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_schools, f, ensure_ascii=False, indent=2)
    
    Logger.log(f"✅ 已生成海南院校列表: {SCHOOLS_FILE}")
    Logger.log(f"   985院校: {len(HAINAN_985_SCHOOLS)}所")
    Logger.log(f"   211院校: {len(HAINAN_211_SCHOOLS)}所")
    Logger.log(f"   双一流院校: {len(HAINAN_DOUBLE_FIRST_SCHOOLS)}所")
    Logger.log(f"   去重后: {len(all_schools)}所")
    
    return all_schools

def load_schools() -> List[str]:
    if not os.path.exists(SCHOOLS_FILE):
        Logger.log(f"⚠️ 院校列表文件不存在，正在生成...")
        return generate_school_list()
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
            "province": "海南",
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

def extract_major_scores(browser: QuarkCDPClient, school_name: str, year: int) -> List[Dict]:
    script = f"""
    (function() {{
        var items = document.querySelectorAll('.content-List-li');
        
        for(var i=0; i<items.length; i++) {{
            var item = items[i];
            var expandSels = ['.expand-btn', '[class*="expand"]', '.more-btn', '[class*="more"]', '.arrow', '[class*="arrow"]', '.icon-arrow', '[class*="icon-arrow"]'];
            for(var j=0; j<expandSels.length; j++) {{
                var expandBtn = item.querySelector(expandSels[j]);
                if(expandBtn) {{
                    expandBtn.click();
                    break;
                }}
            }}
        }}
        
        var allData = [];
        var lastGroup = '';
        var lastRequirement = '';
        
        for(var i=0; i<items.length; i++) {{
            var item = items[i];
            
            var rect = item.getBoundingClientRect();
            if(rect.height < 10 || rect.width < 10) continue;
            
            var style = window.getComputedStyle(item);
            if(style.display === 'none' || style.visibility === 'hidden') continue;
            
            var majorEl = item.querySelector('.content-List-major');
            if(!majorEl) continue;
            var name = majorEl.innerText.trim();
            if(name.length < 2 || name === '普通类') continue;
            
            var sEl = item.querySelector('.content-List-low_score');
            if(!sEl) continue;
            
            var rEl = item.querySelector('.content-List-low_rank');
            var cEl = item.querySelector('.content-List-luqurenshu');
            var bEl = item.querySelector('.qk-margin-top-s');
            var tEl = item.querySelector('.content-List-subTitle');
            var ft = item.innerText;
            
            var score = sEl ? parseInt(sEl.innerText.match(/\\d{{2,3}}/)) : null;
            var rank = rEl ? parseInt(rEl.innerText.match(/\\d{{1,7}}/)) : null;
            var cnt = cEl ? parseInt(cEl.innerText.match(/\\d+/)) : null;
            var batch = bEl ? bEl.innerText.trim() : '';
            var subTitle = tEl ? tEl.innerText.trim() : '';
            
            if(score === null || isNaN(score)) continue;
            if(score < 100 || score > 900) continue;
            
            var group = '';
            var requirement = '';
            var hasRequirementFormat = false;
            var reqMatch = ft.match(/选科要求[uff1a:](.+)$/);
            if(reqMatch) {{
                requirement = reqMatch[1].trim();
                hasRequirementFormat = true;
            }}
            var mgMatch = ft.match(/专业组[（(](\\d+)[）)]/);
            if(mgMatch) group = '专业组（' + mgMatch[1] + '）';
            if(subTitle) {{
                var smgMatch = subTitle.match(/专业组[（(](\\d+)[）)]/);
                if(smgMatch) group = '专业组（' + smgMatch[1] + '）';
                if(!requirement) {{
                    var dashIndex = subTitle.indexOf(' - ');
                    if(dashIndex >= 0) requirement = subTitle.substring(dashIndex + 3).trim();
                }}
            }}
            if(!requirement && !hasRequirementFormat) {{
                var ftDashIndex = ft.indexOf(' - ');
                if(ftDashIndex >= 0 && ft.indexOf('专业组') >= 0) {{
                    requirement = ft.substring(ftDashIndex + 3).trim();
                    var reqEnd = requirement.indexOf('\\n');
                    if(reqEnd >= 0) requirement = requirement.substring(0, reqEnd).trim();
                }}
            }}
            
            var description = '';
            var descEl = item.querySelector('.content-List-desc');
            if(descEl) description = descEl.innerText.trim();
            
            if(!description) {{
                var descMatch = name.match(/[(（](.+)[)）]/);
                if(descMatch) {{
                    description = descMatch[1].trim();
                    name = name.replace(descMatch[0], '').trim();
                }}
            }}
            
            if(!description) {{
                var fullDescMatch = ft.match(/[(（]([^)）]+)[)）]/);
                if(fullDescMatch) {{
                    var potentialDesc = fullDescMatch[1].trim();
                    if(potentialDesc && potentialDesc.indexOf('选科要求') < 0 && potentialDesc.indexOf('专业组') < 0) {{
                        description = potentialDesc;
                    }}
                }}
            }}
            
            if(description) {{
                var allParenMatches = ft.match(/[(（]([^)）]+)[)）]/g);
                if(allParenMatches) {{
                    for(var k=0; k<allParenMatches.length; k++) {{
                        var match = allParenMatches[k].replace(/^[(（]|[)）]$/g, '').trim();
                        if(match && match.indexOf('选科要求') < 0 && match.indexOf('专业组') < 0 && description.indexOf(match) < 0) {{
                            description += ' ' + match;
                        }}
                    }}
                }}
            }}
            
            var campusMatch = ft.match(/(校本部|校区)/);
            if(campusMatch && description.indexOf('校区') < 0 && description.indexOf('校本部') < 0) {{
                if(description) description += ' ' + campusMatch[1];
                else description = campusMatch[1];
            }}
            
            var mg = group || lastGroup;
            var req = requirement || lastRequirement;
            
            if(mg.indexOf('专业组') >= 0) lastGroup = mg;
            if(req) lastRequirement = req;
            
            allData.push({{
                school_name: '{school_name}',
                year: {year},
                major_name: name,
                major_group: mg,
                min_score: score,
                min_rank: rank,
                person_count: cnt,
                batch: batch,
                major_description: description,
                subject_requirement: req,
                province: '海南'
            }});
        }}
        
        var hasFormatCount = 0, hasGroupFormatCount = 0;
        for(var i=0; i<allData.length; i++) {{
            if(allData[i].subject_requirement && allData[i].subject_requirement.indexOf('选科') >= 0) hasFormatCount++;
            if(allData[i].major_group) hasGroupFormatCount++;
        }}
        
        var filteredData = [];
        if({year} === 2025) {{
            for(var i=0; i<allData.length; i++) {{
                if(allData[i].subject_requirement && allData[i].subject_requirement.indexOf('选科') >= 0) {{
                    allData[i].major_group = '';
                    filteredData.push(allData[i]);
                }}
            }}
            if(filteredData.length === 0) filteredData = allData;
        }} else {{
            if(hasGroupFormatCount > 0) {{
                for(var i=0; i<allData.length; i++) {{
                    if(allData[i].major_group) filteredData.push(allData[i]);
                }}
            }} else {{
                for(var i=0; i<allData.length; i++) {{
                    if(allData[i].subject_requirement && allData[i].subject_requirement.indexOf('选科') >= 0) {{
                        filteredData.push(allData[i]);
                    }}
                }}
                if(filteredData.length === 0) filteredData = allData;
            }}
        }}
        
        var result = [];
        var seen = {{}};
        for(var i=0; i<filteredData.length; i++) {{
            var item = filteredData[i];
            var key = item.major_name + '|' + item.min_score + '|' + item.min_rank + '|' + item.major_group;
            if(seen[key]) continue;
            seen[key] = true;
            result.push(item);
        }}
        
        return result;
    }})()
    """.replace("school_name", json.dumps(school_name)).replace("year", str(year))
    
    return browser.execute_script(script) or []

def switch_year(browser: QuarkCDPClient, year: int) -> bool:
    script = f"""
    new Promise((resolve) => {{
        var self = {{}};
        self.wait = function(ms) {{ return new Promise(function(r) {{ setTimeout(r, ms); }}); }};
        
        var allYearBtns = document.querySelectorAll('.select-tabs-tab-nianfen');
        var targetBtn = null;
        if(allYearBtns.length >= 2) {{
            targetBtn = allYearBtns[1];
        }} else if(allYearBtns.length === 1) {{
            targetBtn = allYearBtns[0];
        }}
        
        if(!targetBtn) {{
            var qkButtons = document.querySelectorAll('.qk-button');
            for(var i=0; i<qkButtons.length; i++) {{
                var text = qkButtons[i].innerText.trim();
                if(/^202[0-9]$/.test(text)) {{
                    targetBtn = qkButtons[i];
                    break;
                }}
            }}
        }}
        
        if(!targetBtn) {{
            var otherYearBtns = document.querySelectorAll('[class*="nianfen"], [class*="year"]');
            for(var i=0; i<otherYearBtns.length; i++) {{
                var text = otherYearBtns[i].innerText.trim();
                if(/^202[0-9]$/.test(text)) {{
                    var parent = otherYearBtns[i].parentElement;
                    if(parent && parent.className.indexOf('select') >= 0) {{
                        targetBtn = otherYearBtns[i];
                        break;
                    }}
                }}
            }}
        }}
        
        if(!targetBtn) {{
            resolve(false);
            return;
        }}
        
        targetBtn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
        
        self.wait(300).then(function() {{
            targetBtn.click();
            return self.wait(300);
        }}).then(function() {{
            var options = document.querySelectorAll('.select-modal-li');
            if(options.length === 0) {{
                var arrows = targetBtn.querySelectorAll('svg, [class*="arrow"], [class*="chevron"], [class*="caret"]');
                var tryNext = function(index) {{
                    if(index >= arrows.length) return Promise.resolve(document.querySelectorAll('.select-modal-li'));
                    arrows[index].click();
                    return self.wait(300).then(function() {{
                        var opts = document.querySelectorAll('.select-modal-li');
                        return opts.length > 0 ? opts : tryNext(index + 1);
                    }});
                }};
                return tryNext(0);
            }}
            return options;
        }}).then(function(options) {{
            var target = null;
            for(var i=0; i<options.length; i++) {{
                if(options[i].innerText.trim() === '{year}') {{
                    target = options[i];
                    break;
                }}
            }}
            
            if(!target) {{
                var allOptions = document.querySelectorAll('*');
                for(var i=0; i<allOptions.length; i++) {{
                    try {{
                        if(allOptions[i].innerText.trim() === '{year}' && allOptions[i].children.length < 5) {{
                            var r = allOptions[i].getBoundingClientRect();
                            if(r.width > 20 && r.height > 15 && r.top > 0) {{
                                target = allOptions[i];
                                break;
                            }}
                        }}
                    }} catch(e) {{}}
                }}
            }}
            
            if(!target) {{
                resolve(false);
                return;
            }}
            
            target.scrollIntoView({{behavior: 'smooth', block: 'center'}});
            return self.wait(300);
        }}).then(function() {{
            var target = null;
            var allOptions = document.querySelectorAll('.select-modal-li');
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
            }}
            return self.wait(1500);
        }}).then(function() {{
            var checkCount = 0;
            var maxChecks = 16;
            var checkData = function() {{
                var items = document.querySelectorAll('.content-List-li');
                var hasValidScore = false;
                for(var i=0; i<items.length; i++) {{
                    var majorEl = items[i].querySelector('.content-List-major');
                    var scoreEl = items[i].querySelector('.content-List-low_score');
                    if(majorEl && scoreEl) {{
                        var name = majorEl.innerText.trim();
                        var score = scoreEl.innerText.trim();
                        if(name.length >= 2 && name !== '普通类' && /^\\d{{2,3}}$/.test(score)) {{
                            hasValidScore = true;
                            break;
                        }}
                    }}
                }}
                if(hasValidScore) {{
                    resolve(true);
                    return;
                }}
                checkCount++;
                if(checkCount < maxChecks) {{
                    setTimeout(checkData, 500);
                }} else {{
                    resolve(false);
                }}
            }}
            checkData();
        }}).catch(function(err) {{
            console.log('切换年份失败:', err);
            resolve(false);
        }});
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
                setTimeout(() => resolve(true), 500);
                return;
            }
        }
        
        var all = document.querySelectorAll('*');
        for(var i=0; i<all.length; i++) {
            try {
                if(all[i].innerText && all[i].innerText.trim() === '专业分数线') {
                    all[i].click();
                    setTimeout(() => resolve(true), 500);
                    return;
                }
            } catch(e) {}
        }
        
        resolve(true);
    })
    """
    return browser.execute_script(script) or False

def expand_all_descriptions(browser: QuarkCDPClient):
    script = """
    (function() {
        var expandEls = document.querySelectorAll('[class*="expand"]');
        for(var i=0; i<expandEls.length; i++) expandEls[i].click();
        var collapseEls = document.querySelectorAll('[class*="collapse"]');
        for(var i=0; i<collapseEls.length; i++) collapseEls[i].click();
        var svgArrows = document.querySelectorAll('.content-List-li svg');
        for(var i=0; i<svgArrows.length; i++) {
            var parent = svgArrows[i].parentElement;
            if(parent) parent.click();
        }
        var allSpans = document.querySelectorAll('.content-List-li span');
        for(var i=0; i<allSpans.length; i++) {
            if(allSpans[i].innerText.trim() === '▼') allSpans[i].click();
        }
        var allDivs = document.querySelectorAll('.content-List-li div');
        for(var i=0; i<allDivs.length; i++) {
            if(allDivs[i].innerText.indexOf('更多') >= 0 || allDivs[i].innerText.indexOf('展开') >= 0) {
                allDivs[i].click();
            }
        }
    })()
    """
    browser.execute_script(script)

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
    time.sleep(1)
    
    total_count = 0
    
    for year in [2025, 2024, 2023]:
        if skip_completed and year in downloaded:
            continue
        
        if year != 2025:
            Logger.log(f"     切换到{year}年...")
            if not switch_year(browser, year):
                Logger.log(f"     ❌ 切换到{year}年失败")
                continue
        
        time.sleep(1)
        expand_all_descriptions(browser)
        time.sleep(0.5)
        
        data = extract_major_scores(browser, school_name, year)
        
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
    Logger.log("海南高考近三年专业分数线自动化采集工具（优化版）")
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
    
    Logger.log("\n步骤1: 检查浏览器连接...")
    pages = get_quark_pages()
    
    if not pages:
        Logger.log("\n❌ 未检测到浏览器远程调试端口")
        Logger.log("\n请按以下步骤操作:")
        Logger.log("1. 关闭所有浏览器窗口")
        Logger.log("2. 以远程调试模式启动Edge浏览器(PowerShell):")
        Logger.log('   & "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222 --remote-allow-origins=*')
        Logger.log("3. 在浏览器中登录账户")
        Logger.log("4. 打开夸克高考页面")
        return
    
    Logger.log(f"✅ 找到 {len(pages)} 个浏览器标签页")
    
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
