# -*- coding: utf-8 -*-
"""
海南高考中外合作办学院校专业分数线自动化采集工具
参考 quark_scraper_v6.js 和 hainan_auto_scraper.py 的方法，使用CDP执行导航和操作

使用步骤:
1. 关闭所有Edge/夸克浏览器窗口
2. 以远程调试模式启动浏览器:
   PowerShell: & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --remote-allow-origins=*
3. 在浏览器中登录账户，打开夸克高考页面
4. 运行本脚本: python hainan_international_scraper.py

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
SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_international_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_international_scores")

HAINAN_INTERNATIONAL_SCHOOLS = [
    "西交利物浦大学",
    "宁波诺丁汉大学",
    "北京师范大学-香港浸会大学联合国际学院",
    "上海纽约大学",
    "昆山杜克大学",
    "香港中文大学（深圳）",
    "深圳北理莫斯科大学",
    "广东以色列理工学院",
    "汕头大学",
    "香港科技大学（广州）",
    "北京理工大学珠海学院",
    "吉林大学珠海学院",
    "中山大学新华学院",
    "中山大学南方学院",
    "华南理工大学广州学院",
    "暨南大学珠海校区",
    "北京师范大学珠海校区",
    "深圳技术大学",
    "澳门科技大学",
    "澳门城市大学",
    "香港理工大学",
    "香港大学",
    "香港科技大学",
    "香港中文大学",
    "香港城市大学",
    "香港浸会大学",
    "香港岭南大学",
    "香港教育大学",
    "香港都会大学",
    "香港高等教育科技学院",
    "北京邮电大学世纪学院",
    "北京工商大学嘉华学院",
    "首都师范大学科德学院",
    "天津商业大学宝德学院",
    "天津天狮学院",
    "天津外国语大学滨海外事学院",
    "南开大学滨海学院",
    "天津财经大学珠江学院",
    "大连理工大学城市学院",
    "大连医科大学中山学院",
    "东北财经大学津桥商学院",
    "辽宁师范大学海华学院",
    "吉林外国语大学",
    "上海杉达学院",
    "上海师范大学天华学院",
    "上海外国语大学贤达经济人文学院",
    "上海立达学院",
    "南京邮电大学通达学院",
    "南京工业大学浦江学院",
    "南京师范大学泰州学院",
    "江苏科技大学苏州理工学院",
    "江苏师范大学科文学院",
    "浙江工商大学杭州商学院",
    "浙江理工大学科技与艺术学院",
    "浙江师范大学行知学院",
    "宁波大学科学技术学院",
    "温州医科大学仁济学院",
    "安徽师范大学皖江学院",
    "安徽财经大学商学院",
    "福州大学至诚学院",
    "集美大学诚毅学院",
    "福建师范大学协和学院",
    "江西科技学院",
    "江西师范大学科学技术学院",
    "南昌大学科学技术学院",
    "山东协和学院",
    "山东英才学院",
    "青岛恒星科技学院",
    "烟台大学文经学院",
    "河南理工大学万方科技学院",
    "河南大学民生学院",
    "河南师范大学新联学院",
    "湖北大学知行学院",
    "武汉科技大学城市学院",
    "武汉工程科技学院",
    "武汉工商学院",
    "湖北师范大学文理学院",
    "湖南涉外经济学院",
    "湖南工商大学北津学院",
    "湘潭大学兴湘学院",
    "广东财经大学华商学院",
    "广东外语外贸大学南国商学院",
    "华南农业大学珠江学院",
    "东莞理工学院城市学院",
    "广州商学院",
    "广西外国语学院",
    "广西师范大学漓江学院",
    "广西民族大学相思湖学院",
    "海南师范大学",
    "海南医学院",
    "三亚学院",
    "重庆工商大学派斯学院",
    "重庆师范大学涉外商贸学院",
    "四川外国语大学重庆南方翻译学院",
    "四川大学锦城学院",
    "电子科技大学成都学院",
    "四川师范大学文理学院",
    "贵州师范大学求是学院",
    "昆明理工大学津桥学院",
    "云南师范大学商学院",
    "西北大学现代学院",
    "西安财经大学行知学院",
    "兰州财经大学长青学院",
    "新疆财经大学商务学院",
    "河北工程技术学院",
    "河北传媒学院",
    "河北科技学院",
    "河北外国语学院",
    "燕京理工学院",
    "山西应用科技学院",
    "山西工商学院",
    "内蒙古师范大学鸿德学院",
    "辽宁传媒学院",
    "沈阳城市学院",
    "黑龙江东方学院",
    "黑龙江财经学院",
    "哈尔滨剑桥学院",
    "黑龙江外国语学院",
    "上海建桥学院",
    "浙江树人学院",
    "浙江越秀外国语学院",
    "安徽新华学院",
    "安徽三联学院",
    "安徽信息工程学院",
    "厦门华厦学院",
    "闽南理工学院",
    "泉州信息工程学院",
    "江西服装学院",
    "南昌理工学院",
    "江西应用科技学院",
    "齐鲁理工学院",
    "山东现代学院",
    "山东华宇工学院",
    "郑州工商学院",
    "郑州科技学院",
    "郑州工业应用技术学院",
    "信阳学院",
    "商丘学院",
    "黄河科技学院",
    "武汉学院",
    "武汉东湖学院",
    "汉口学院",
    "武昌理工学院",
    "武昌工学院",
    "湖北商贸学院",
    "湖南工学院",
    "湖南应用技术学院",
    "湖南信息学院",
    "广州应用科技学院",
    "广州华立学院",
    "广州软件学院",
    "广东培正学院",
    "广东东软学院",
]

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
            print(f"✅ 成功连接到浏览器")
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

    def send_command_no_wait(self, method: str, params: Optional[Dict] = None) -> bool:
        """发送命令但不等待响应（用于会断开连接的导航命令）"""
        if not self.ws:
            return False

        self.message_id += 1
        msg_id = self.message_id

        message = {
            "id": msg_id,
            "method": method,
            "params": params or {}
        }

        try:
            self.ws.send(json.dumps(message))
            return True
        except Exception as e:
            print(f"❌ 发送命令失败: {e}")
            return False

    def execute_script(self, script: str, return_by_value: bool = True, timeout: int = 30) -> Optional[Any]:
        result = self.send_command("Runtime.evaluate", {
            "expression": script,
            "returnByValue": return_by_value,
            "awaitPromise": True
        }, timeout=timeout)
        if result and "result" in result:
            return result["result"].get("value")
        return None

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

def generate_school_list():
    international_schools = HAINAN_INTERNATIONAL_SCHOOLS
    
    os.makedirs(os.path.dirname(SCHOOLS_FILE), exist_ok=True)
    with open(SCHOOLS_FILE, "w", encoding="utf-8") as f:
        json.dump(international_schools, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已生成海南中外合作办学院校列表: {SCHOOLS_FILE}")
    print(f"   院校总数: {len(international_schools)}所")
    
    return international_schools

def load_schools() -> List[str]:
    if not os.path.exists(SCHOOLS_FILE):
        print(f"⚠️ 院校列表文件不存在，正在生成...")
        return generate_school_list()
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

def navigate_to_url(browser: QuarkCDPClient, url: str) -> bool:
    # 启用Page域，使用Page.navigate命令进行导航
    # 这样不会因为执行上下文销毁而断开WebSocket连接
    browser.send_command_no_wait("Page.enable")

    # 发送导航命令（不等响应，因为导航会创建新执行上下文）
    result = browser.send_command("Page.navigate", {"url": url}, timeout=15)
    if result is None:
        # 如果Page.navigate失败，可能是连接已断，尝试重新连接
        return False

    # 等待页面加载完成
    script = """
    new Promise((resolve) => {
        var checkCount = 0;
        var maxChecks = 60;
        var check = function() {
            checkCount++;
            if (document.readyState === 'complete') {
                resolve(true);
            } else if (checkCount < maxChecks) {
                setTimeout(check, 1000);
            } else {
                resolve(false);
            }
        };
        setTimeout(check, 2000);
    })
    """
    try:
        return browser.execute_script(script, timeout=60) or False
    except Exception as e:
        print(f"     ⚠️ 等待页面加载异常: {e}")
        return False

def wait_for_data_load(browser: QuarkCDPClient, timeout: int = 30) -> bool:
    script = f"""
    new Promise((resolve) => {{
        var checkCount = 0;
        var maxChecks = {timeout * 2};
        function check() {{
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
                setTimeout(check, 500);
            }} else {{
                resolve(false);
            }}
        }}
        check();
    }})
    """
    return browser.execute_script(script, timeout=timeout + 5) or False

def find_year_button(browser: QuarkCDPClient) -> bool:
    script = """
    (function() {
        var allYearBtns = document.querySelectorAll('.select-tabs-tab-nianfen');
        if(allYearBtns.length >= 2) return true;
        if(allYearBtns.length === 1) return true;
        
        var qkButtons = document.querySelectorAll('.qk-button');
        for(var i=0; i<qkButtons.length; i++) {
            var text = qkButtons[i].innerText.trim();
            if(/^202[0-9]$/.test(text)) return true;
        }
        
        var otherYearBtns = document.querySelectorAll('[class*="nianfen"], [class*="year"]');
        for(var i=0; i<otherYearBtns.length; i++) {
            var text = otherYearBtns[i].innerText.trim();
            if(/^202[0-9]$/.test(text)) return true;
        }
        
        return false;
    })()
    """
    return browser.execute_script(script) or False

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
        
        var rect = targetBtn.getBoundingClientRect();
        targetBtn.scrollIntoView({{behavior: 'smooth', block: 'center'}});
        
        self.wait(500).then(function() {{
            targetBtn.click();
            return self.wait(500);
        }}).then(function() {{
            var options = document.querySelectorAll('.select-modal-li');
            if(options.length === 0) {{
                var arrows = targetBtn.querySelectorAll('svg, [class*="arrow"], [class*="chevron"], [class*="caret"]');
                var tryNext = function(index) {{
                    if(index >= arrows.length) return Promise.resolve(document.querySelectorAll('.select-modal-li'));
                    arrows[index].click();
                    return self.wait(500).then(function() {{
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
            return self.wait(500);
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
            return self.wait(3000);
        }}).then(function() {{
            var checkCount = 0;
            var maxChecks = 20;
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
    return browser.execute_script(script, timeout=60) or False

def switch_to_major_tab(browser: QuarkCDPClient) -> bool:
    script = """
    (function() {
        var tabs = document.querySelectorAll('.qk-tabs-tab');
        for(var i=0; i<tabs.length; i++) {
            if(tabs[i].innerText.indexOf('专业分数线') >= 0) {
                tabs[i].click();
                return true;
            }
        }
        return false;
    })()
    """
    return browser.execute_script(script) or False

def extract_major_scores(browser: QuarkCDPClient, school_name: str, year: int) -> List[Dict]:
    script = f"""
    (function() {{
        var items = document.querySelectorAll('.content-List-li');
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
    
    return browser.execute_script(script, timeout=30) or []

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

def reconnect_browser() -> Optional[QuarkCDPClient]:
    pages = get_quark_pages()
    if not pages:
        return None
    
    gaokao_page = find_gaokao_page(pages)
    if not gaokao_page:
        return None
    
    ws_url = gaokao_page.get("webSocketDebuggerUrl")
    if not ws_url:
        return None
    
    browser = QuarkCDPClient(ws_url)
    if browser.connect():
        return browser
    return None

def process_school(browser: QuarkCDPClient, school_name: str) -> int:
    downloaded = get_downloaded_years(school_name)
    
    if len(downloaded) == 3:
        print(f"  ⏭️ {school_name} 三年数据已全部下载，跳过")
        return 0
    
    print(f"  📡 正在处理: {school_name}")
    print(f"     已下载: {downloaded}")
    
    url = build_school_url(school_name)
    print(f"     URL: {url}")
    
    try:
        if not navigate_to_url(browser, url):
            print(f"     ❌ 导航失败，尝试重新连接...")
            new_browser = reconnect_browser()
            if new_browser:
                browser.close()
                browser = new_browser
                if not navigate_to_url(browser, url):
                    print(f"     ❌ 重新连接后导航仍失败")
                    return 0
            else:
                print(f"     ❌ 无法重新连接到浏览器")
                return 0
    except Exception as e:
        print(f"     ❌ 导航异常: {e}")
        new_browser = reconnect_browser()
        if new_browser:
            browser.close()
            browser = new_browser
            if not navigate_to_url(browser, url):
                print(f"     ❌ 重新连接后导航仍失败")
                return 0
        else:
            return 0
    
    print("     等待页面加载...")
    time.sleep(10)
    
    try:
        if not wait_for_data_load(browser, timeout=30):
            print(f"     ❌ 页面数据加载失败")
            return 0
    except Exception as e:
        print(f"     ❌ 等待数据加载异常: {e}")
        return 0
    
    switch_to_major_tab(browser)
    time.sleep(3)
    
    if not find_year_button(browser):
        print(f"     ⚠️ 未找到年份切换按钮")
    
    total_count = 0
    
    for year in [2025, 2024, 2023]:
        if year in downloaded:
            print(f"     ⏭️ {year}年已下载，跳过")
            continue
        
        if year != 2025:
            print(f"     切换到{year}年...")
            try:
                if not switch_year(browser, year):
                    print(f"     ❌ 切换到{year}年失败")
                    continue
            except Exception as e:
                print(f"     ❌ 切换年份异常: {e}")
                continue
        
        time.sleep(2)
        try:
            expand_all_descriptions(browser)
        except Exception:
            pass
        time.sleep(2)
        
        try:
            data = extract_major_scores(browser, school_name, year)
        except Exception as e:
            print(f"     ❌ 提取数据异常: {e}")
            continue
        
        if data and len(data) > 0:
            save_school_data(school_name, year, data)
            total_count += len(data)
        else:
            print(f"     ⚠️ {year}年无有效数据")
    
    return total_count

def main():
    print("=" * 70)
    print("海南高考中外合作办学院校专业分数线自动化采集工具")
    print("=" * 70)
    
    print("\n步骤1: 检查浏览器连接...")
    pages = get_quark_pages()
    
    if not pages:
        print("\n❌ 未检测到浏览器远程调试端口")
        print("\n请按以下步骤操作:")
        print("1. 关闭所有浏览器窗口")
        print("2. 以远程调试模式启动Edge浏览器(PowerShell):")
        print('   & "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222 --remote-allow-origins=*')
        print("3. 在浏览器中登录账户")
        print("4. 打开夸克高考页面")
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
    
    print("\n步骤2: 连接到浏览器...")
    browser = QuarkCDPClient(ws_url)
    if not browser.connect():
        return
    
    print("\n步骤3: 加载院校列表...")
    schools = load_schools()
    if not schools:
        browser.close()
        return
    
    print(f"✅ 共 {len(schools)} 所中外合作办学院校")
    
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
            print(f"     尝试重新连接浏览器...")
            new_browser = reconnect_browser()
            if new_browser:
                browser.close()
                browser = new_browser
                try:
                    count = process_school(browser, school)
                    if count > 0:
                        success_count += 1
                        total_records += count
                    else:
                        fail_count += 1
                except Exception as e2:
                    print(f"  ❌ {school} 重新连接后仍失败: {e2}")
                    fail_count += 1
            else:
                fail_count += 1
        
        time.sleep(3)
    
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