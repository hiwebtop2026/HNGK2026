# -*- coding: utf-8 -*-
"""
天津高考公办院校补充采集工具
功能：
1. 检查当前已下载的数据
2. 联网收集天津地区高考招生的全部公办院校
3. 对比找出缺失院校，生成补充清单
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
SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")
SUPPLEMENT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_supplement_list.json")
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "logs", "tianjin_supplement.log")

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
            
            try {{ observer.observe({{ entryTypes: ['resource'] }}); }} catch(e) {{}}
            
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

def load_schools() -> List[str]:
    if not os.path.exists(SCHOOLS_FILE):
        Logger.log(f"❌ 院校列表文件不存在: {SCHOOLS_FILE}")
        return []
    with open(SCHOOLS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_downloaded_schools() -> set:
    downloaded = set()
    if os.path.exists(OUTPUT_DIR):
        for filename in os.listdir(OUTPUT_DIR):
            if '_专业分数线.json' in filename:
                school_name = filename.split('_')[0]
                downloaded.add(school_name)
    return downloaded

def extract_all_schools_from_page(browser: QuarkCDPClient) -> List[str]:
    script = """
    (function() {
        var schools = [];
        var seen = {};
        
        var listItems = document.querySelectorAll('.college-list-item, .school-list-item, [class*="college"], [class*="school"]');
        for(var i=0; i<listItems.length; i++) {
            try {
                var nameEl = listItems[i].querySelector('.college-name, .school-name, [class*="name"]');
                if(!nameEl) nameEl = listItems[i];
                
                var name = nameEl.innerText.trim();
                if(name.length >= 2 && !seen[name]) {
                    seen[name] = true;
                    schools.push(name);
                }
            } catch(e) {}
        }
        
        if(schools.length === 0) {
            var all = document.querySelectorAll('*');
            for(var i=0; i<all.length; i++) {
                try {
                    var text = all[i].innerText.trim();
                    if(text.length >= 2 && text.length <= 30 && 
                       /^[\\u4e00-\\u9fa5]+(大学|学院|学校)$/.test(text) && 
                       !seen[text]) {
                        var rect = all[i].getBoundingClientRect();
                        if(rect.width > 20 && rect.height > 10) {
                            seen[text] = true;
                            schools.push(text);
                        }
                    }
                } catch(e) {}
            }
        }
        
        return schools.sort();
    })()
    """
    return browser.execute_script(script) or []

def collect_public_schools(browser: QuarkCDPClient) -> List[str]:
    urls = [
        "https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&province=天津&year=2025&batch=本科批A阶段&type=luqu",
        "https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&province=天津&year=2025&batch=本科批B阶段&type=luqu",
        "https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&province=天津&year=2025&batch=本科提前批&type=luqu",
    ]
    
    all_schools = set()
    
    for url in urls:
        Logger.log(f"  📡 正在访问: {url}")
        if browser.navigate(url):
            time.sleep(3)
            
            schools = extract_all_schools_from_page(browser)
            if schools:
                Logger.log(f"    ✅ 发现 {len(schools)} 所院校")
                all_schools.update(schools)
            
            scroll_script = """
            new Promise((resolve) => {
                var scrollHeight = document.body.scrollHeight;
                var currentHeight = 0;
                var step = 500;
                
                var scroll = () => {
                    window.scrollBy(0, step);
                    currentHeight += step;
                    if(currentHeight < scrollHeight * 0.8) {
                        setTimeout(scroll, 300);
                    } else {
                        setTimeout(() => resolve(true), 500);
                    }
                };
                scroll();
            })
            """
            browser.execute_script(scroll_script)
            time.sleep(2)
            
            schools = extract_all_schools_from_page(browser)
            if schools:
                Logger.log(f"    ✅ 滚动后又发现 {len(schools)} 所院校")
                all_schools.update(schools)
    
    return sorted(list(all_schools))

def filter_public_schools(schools: List[str]) -> List[str]:
    private_keywords = ['学院', '独立学院', '民办', '博文', '武昌首义', '文华', '武汉东湖', '汉口学院',
                        '武昌理工', '武汉生物工程', '武汉传媒', '武汉工商', '武汉设计工程', '武汉体育学院体育科技',
                        '湖北第二师范学院', '湖北工程学院新技术', '湖北工业大学工程技术', '湖北经济学院法商学院',
                        '湖北汽车工业学院科技', '湖北文理学院理工', '湖北中医药大学临床', '三峡大学科技',
                        '长江大学工程技术', '长江大学文理', '武汉工程大学邮电与信息工程', '武汉纺织大学外经贸',
                        '武汉工业学院工商', '武汉科技大学城市', '武汉科技大学中南', '武汉理工大学华夏',
                        '江汉大学文理', '湖北美术学院', '武汉音乐学院', '武汉体育学院',
                        '天津天狮', '滨海学院', '津沽学院', '宝德学院', '仁爱学院', '珠江学院',
                        '中环信息学院', '临床医学院', '运动与文化艺术学院', '北京科技大学天津',
                        '北京邮电大学世纪', '北京工业大学耿丹', '首都师范大学科德', '北京工商大学嘉华',
                        '北京邮电大学宏福', '北京师范大学珠海', '中山大学南方', '华南理工大学广州',
                        '华南师范大学增城', '广东外语外贸大学南国', '广东财经大学华商学院', '广东工业大学华立',
                        '广州大学华软', '广州商学院', '东莞理工学院城市', '中山大学新华',
                        '电子科技大学成都', '四川大学锦江', '四川师范大学文理', '四川外国语大学成都',
                        '西南财经大学天府', '西南交通大学希望', '成都理工大学工程技术', '成都信息工程大学银杏',
                        '重庆大学城市科技', '西南大学育才', '重庆师范大学涉外商贸', '重庆工商大学融智',
                        '重庆工商大学派斯', '重庆邮电大学移通', '重庆科技学院', '重庆工程学院',
                        '云南师范大学商学院', '云南大学滇池', '云南艺术学院文华', '昆明理工大学津桥',
                        '贵州大学明德', '贵州师范大学求是', '贵州财经大学商务', '贵州民族大学人文科技',
                        '广西大学行健文理', '广西师范大学漓江', '广西民族大学相思湖', '桂林理工大学博文管理',
                        '桂林电子科技大学信息科技', '南宁学院', '北海艺术设计', '百色学院',
                        '湖南师范大学树达', '湖南科技大学潇湘', '湖南农业大学东方', '中南林业科技大学涉外',
                        '湖南理工学院南湖', '湖南工程学院应用技术', '湖南城市学院', '湖南文理学院芙蓉',
                        '湘潭大学兴湘', '长沙理工大学城南', '湖南工业大学科技', '南华大学船山',
                        '衡阳师范学院南岳', '湖南中医药大学湘杏', '湖南第一师范学院', '长沙学院',
                        '江西师范大学科学技术', '南昌大学科学技术', '江西农业大学南昌', '江西财经大学现代经济管理',
                        '华东交通大学理工', '东华理工大学长江', '南昌航空大学科技', '景德镇陶瓷大学科技艺术',
                        '江西科技师范大学理工', '赣南师范大学科技', '上饶师范学院', '九江学院',
                        '安徽大学江淮', '安徽师范大学皖江', '安徽农业大学经济技术', '安徽医科大学临床医学院',
                        '安徽理工大学', '安徽工业大学工商', '安徽工程大学机电', '安徽财经大学商学院',
                        '合肥师范学院', '淮北师范大学信息', '阜阳师范大学信息工程', '滁州学院',
                        '江苏大学京江', '江苏科技大学苏州理工', '扬州大学广陵', '南京师范大学中北',
                        '南京工业大学浦江', '南京邮电大学通达', '南京理工大学紫金', '南京航空航天大学金城',
                        '南京医科大学康达', '南京中医药大学翰林', '南京审计大学金审', '江苏师范大学科文学院',
                        '徐州医科大学华方', '常州大学怀德', '苏州科技大学天平', '无锡太湖',
                        '江南大学太湖', '南通大学杏林', '盐城师范学院', '淮阴师范学院',
                        '浙江工业大学之江', '浙江师范大学行知', '宁波大学科学技术', '浙江理工大学科技与艺术',
                        '杭州电子科技大学信息工程', '浙江工商大学杭州商学院', '浙江财经大学东方', '中国计量大学现代科技',
                        '绍兴文理学院元培', '温州大学瓯江', '嘉兴学院南湖', '湖州师范学院求真',
                        '上海杉达', '上海建桥', '上海视觉艺术', '上海师范大学天华',
                        '上海外国语大学贤达经济人文', '华东政法大学', '上海政法学院', '上海第二工业大学',
                        '上海应用技术大学', '上海电机学院', '上海商学院', '上海工程技术大学',
                        '山东大学威海', '山东师范大学历山', '山东财经大学燕山', '青岛理工大学琴岛',
                        '青岛农业大学海都', '聊城大学东昌', '济南大学泉城', '山东科技大学泰山科技',
                        '山东理工大学', '烟台大学文经', '山东建筑大学', '山东交通学院',
                        '河南大学民生', '河南师范大学新联', '河南科技学院新科学院', '河南理工大学万方科技',
                        '河南工业大学', '郑州轻工业大学', '郑州航空工业管理学院', '中原工学院信息商务',
                        '河北大学工商', '河北师范大学汇华', '河北科技大学理工', '河北工程大学科信',
                        '河北地质大学', '华北理工大学轻工', '河北农业大学现代科技', '河北经贸大学经济管理',
                        '山西大学商务', '太原理工大学现代科技', '山西农业大学信息', '山西医科大学晋祠',
                        '山西师范大学现代文理', '中北大学信息商务', '太原科技大学华科学院', '山西财经大学华商学院',
                        '内蒙古大学创业', '内蒙古师范大学鸿德', '内蒙古农业大学', '内蒙古工业大学',
                        '辽宁大学新华国际', '沈阳师范大学渤海', '大连理工大学城市', '大连海事大学',
                        '东北大学秦皇岛', '辽宁石油化工大学顺华', '沈阳工业大学工程', '沈阳航空航天大学北方',
                        '吉林大学珠海', '东北师范大学人文', '长春理工大学光电信息', '长春工业大学人文信息',
                        '吉林农业大学发展', '吉林财经大学', '吉林师范大学博达', '北华大学',
                        '黑龙江大学', '哈尔滨师范大学恒星', '哈尔滨商业大学广厦', '哈尔滨理工大学远东',
                        '东北石油大学华瑞', '黑龙江科技大学', '齐齐哈尔大学', '佳木斯大学',
                        '西北大学现代', '西安理工大学高科学院', '西安科技大学高新', '西安建筑科技大学华清',
                        '西安工程大学', '西安工业大学北方信息工程', '西安财经大学行知', '陕西科技大学镐京',
                        '西北农林科技大学', '陕西师范大学', '西安外国语大学', '西北政法大学',
                        '兰州大学', '西北师范大学知行', '兰州理工大学技术工程', '兰州交通大学博文',
                        '青海大学', '宁夏大学', '新疆大学', '石河子大学科技',
                        '西藏大学', '西藏民族大学']
    
    public_schools = []
    for school in schools:
        is_public = True
        for keyword in private_keywords:
            if keyword in school:
                is_public = False
                break
        if is_public:
            public_schools.append(school)
    
    return public_schools

def generate_supplement_list():
    Logger.log("=" * 70)
    Logger.log("天津高考公办院校补充清单生成工具")
    Logger.log("=" * 70)
    
    all_schools = load_schools()
    downloaded = get_downloaded_schools()
    
    Logger.log(f"\n📋 当前院校列表: {len(all_schools)} 所")
    Logger.log(f"✅ 已下载院校: {len(downloaded)} 所")
    Logger.log(f"❌ 缺失院校: {len(all_schools) - len(downloaded)} 所")
    
    current_missing = sorted([s for s in all_schools if s not in downloaded])
    
    Logger.log("\n=== 当前缺失院校（从现有列表） ===")
    for i, s in enumerate(current_missing, 1):
        Logger.log(f"  {i:3d}. {s}")
    
    Logger.log("\n步骤1: 连接浏览器，联网收集天津高考招生全部公办院校...")
    pages = get_quark_pages()
    
    if not pages:
        Logger.log("\n❌ 未检测到浏览器远程调试端口")
        Logger.log("请先启动浏览器并打开夸克高考页面")
        Logger.log("\n仅生成当前列表的补充清单...")
        
        supplement_data = {
            "generated_at": datetime.now().isoformat(),
            "total_schools_in_list": len(all_schools),
            "downloaded_schools": len(downloaded),
            "current_missing": current_missing,
            "new_found_schools": [],
            "supplement_list": current_missing
        }
        
        with open(SUPPLEMENT_FILE, "w", encoding="utf-8") as f:
            json.dump(supplement_data, f, ensure_ascii=False, indent=2)
        
        Logger.log(f"\n✅ 补充清单已保存到: {SUPPLEMENT_FILE}")
        Logger.log(f"   需要补充: {len(current_missing)} 所院校")
        return
    
    gaokao_page = find_gaokao_page(pages)
    if not gaokao_page:
        Logger.log("\n❌ 未找到夸克高考页面")
        return
    
    ws_url = gaokao_page.get("webSocketDebuggerUrl")
    if not ws_url:
        Logger.log("\n❌ 无法获取WebSocket调试地址")
        return
    
    browser = QuarkCDPClient(ws_url)
    if not browser.connect():
        return
    
    try:
        Logger.log("\n步骤2: 收集天津高考招生全部公办院校...")
        collected_schools = collect_public_schools(browser)
        Logger.log(f"   ✅ 共收集到 {len(collected_schools)} 所院校")
        
        Logger.log("\n步骤3: 过滤公办院校...")
        public_schools = filter_public_schools(collected_schools)
        Logger.log(f"   ✅ 公办院校: {len(public_schools)} 所")
        
        Logger.log("\n步骤4: 对比找出新增院校...")
        existing_set = set(all_schools)
        new_schools = sorted([s for s in public_schools if s not in existing_set])
        Logger.log(f"   ✅ 发现新增院校: {len(new_schools)} 所")
        
        if new_schools:
            Logger.log("\n=== 新增院校列表 ===")
            for i, s in enumerate(new_schools, 1):
                Logger.log(f"  {i:3d}. {s}")
        
        Logger.log("\n步骤5: 生成补充清单...")
        supplement_list = sorted(list(set(current_missing) | set(new_schools)))
        
        supplement_data = {
            "generated_at": datetime.now().isoformat(),
            "total_schools_in_list": len(all_schools),
            "downloaded_schools": len(downloaded),
            "current_missing": current_missing,
            "new_found_schools": new_schools,
            "supplement_list": supplement_list,
            "collected_public_schools": public_schools
        }
        
        with open(SUPPLEMENT_FILE, "w", encoding="utf-8") as f:
            json.dump(supplement_data, f, ensure_ascii=False, indent=2)
        
        Logger.log(f"\n✅ 补充清单已保存到: {SUPPLEMENT_FILE}")
        Logger.log(f"\n=== 补充清单汇总 ===")
        Logger.log(f"   当前缺失院校: {len(current_missing)} 所")
        Logger.log(f"   新增发现院校: {len(new_schools)} 所")
        Logger.log(f"   总补充数量: {len(supplement_list)} 所")
        
        Logger.log("\n=== 补充清单明细 ===")
        for i, s in enumerate(supplement_list, 1):
            status = "新增" if s in new_schools else "缺失"
            Logger.log(f"  {i:3d}. [{status}] {s}")
        
        if new_schools:
            updated_schools = sorted(list(existing_set | set(new_schools)))
            with open(SCHOOLS_FILE, "w", encoding="utf-8") as f:
                json.dump(updated_schools, f, ensure_ascii=False, indent=2)
            Logger.log(f"\n✅ 院校列表已更新，新增 {len(new_schools)} 所院校")
        
    finally:
        browser.close()

if __name__ == "__main__":
    generate_supplement_list()
