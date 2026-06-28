# -*- coding: utf-8 -*-
"""
夸克高考专业分数线数据抓取工具
使用Edge浏览器远程调试模式抓取数据
"""

import json
import time
import os
import re
from datetime import datetime

try:
    import websocket
except ImportError:
    os.system('pip install websocket-client')
    import websocket

try:
    import urllib.request
    import urllib.error
except:
    pass

# Edge浏览器远程调试端口
EDGE_DEBUG_PORT = 9222

# Supabase配置
SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

def get_debugger_pages():
    """获取所有调试页面"""
    urls_to_try = [
        f'http://localhost:{EDGE_DEBUG_PORT}/json',
        f'http://127.0.0.1:{EDGE_DEBUG_PORT}/json',
    ]

    for url in urls_to_try:
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as response:
                pages = json.loads(response.read().decode())
                return pages, url.replace('/json', '')
        except Exception as e:
            continue

    return [], None

def find_quark_page(pages):
    """查找夸克高考相关页面"""
    for page in pages:
        url = page.get('url', '').lower()
        title = page.get('title', '').lower()
        if 'quark' in url and ('gaokao' in url or 'college' in url):
            return page
    return None

def connect_to_page(ws_url):
    """连接到指定页面"""
    try:
        ws = websocket.create_connection(ws_url, timeout=10)
        return ws
    except Exception as e:
        print(f"连接失败: {e}")
        return None

def send_cdp_command(ws, method, params=None):
    """发送CDP命令"""
    if not ws:
        return None

    msg_id = int(time.time() * 1000)
    message = {
        'id': msg_id,
        'method': method,
        'params': params or {}
    }

    try:
        ws.send(json.dumps(message))
        # 等待响应
        ws.settimeout(10)
        response = ws.recv()
        return json.loads(response)
    except Exception as e:
        print(f"CDP命令执行失败: {e}")
        return None

def get_page_content(ws):
    """获取页面DOM内容"""
    result = send_cdp_command(ws, 'Runtime.evaluate', {
        'expression': 'document.body.innerHTML',
        'returnByValue': True
    })
    if result and 'result' in result:
        return result['result'].get('value', '')
    return ''

def extract_major_scores_from_html(html):
    """从HTML中提取专业分数线数据"""
    # 尝试提取表格数据
    data = []

    # 常见的分数数据模式
    patterns = [
        r'"major_name"\s*:\s*"([^"]+)"',
        r'"min_score"\s*:\s*(\d+)',
        r'"min_rank"\s*:\s*(\d+)',
        r'"avg_score"\s*:\s*(\d+)',
        r'"batch_name"\s*:\s*"([^"]+)"',
    ]

    # 尝试提取JSON数据块
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, html)

    for match in matches:
        try:
            obj = json.loads(match)
            if 'major_name' in obj or 'min_score' in obj:
                data.append(obj)
        except:
            continue

    return data

def find_and_click_show_all(ws):
    """查找并点击"查看全部"按钮"""
    # 查找包含"全部"或"查看全部"的元素
    script = """
    (function() {
        const buttons = document.querySelectorAll('button, div[role="button"], a');
        for (const btn of buttons) {
            const text = btn.textContent || btn.innerText || '';
            if (text.includes('全部') || text.includes('查看全部')) {
                btn.click();
                return { clicked: true, text: text.trim() };
            }
        }
        return { clicked: false, message: '未找到按钮' };
    })()
    """

    result = send_cdp_command(ws, 'Runtime.evaluate', {
        'expression': script,
        'returnByValue': True
    })

    if result and 'result' in result:
        return result['result'].get('value', {})
    return {}

def switch_year(ws, year):
    """切换年份"""
    script = f"""
    (function() {{
        // 查找年份选择器
        const selects = document.querySelectorAll('select, div[role="combobox"], .year-selector');
        for (const sel of selects) {{
            const options = sel.querySelectorAll('option, div[role="option"]');
            for (const opt of options) {{
                const text = opt.textContent || '';
                if (text.includes('{year}')) {{
                    if (opt.click) opt.click();
                    else if (sel.click) sel.click();
                    return {{ success: true, year: text }};
                }}
            }}
        }}

        // 尝试直接查找年份文本
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {{
            const text = el.textContent || '';
            if (text.trim() === '{year}') {{
                el.click();
                return {{ success: true, clicked: '{year}' }};
            }}
        }}

        return {{ success: false, message: '未找到年份选择器' }};
    }})()
    """

    result = send_cdp_command(ws, 'Runtime.evaluate', {
        'expression': script,
        'returnByValue': True
    })

    if result and 'result' in result:
        return result['result'].get('value', {})
    return {}

def main():
    print("=" * 70)
    print("夸克高考专业分数线数据抓取工具")
    print("=" * 70)

    # 1. 检查Edge浏览器连接
    print("\n正在检查Edge浏览器连接...")
    pages, base_url = get_debugger_pages()

    if not pages:
        print("\n❌ 未检测到Edge浏览器")
        print("\n请按以下步骤操作:")
        print("1. 关闭所有Edge浏览器窗口")
        print("2. 打开PowerShell或CMD")
        print("3. 运行以下命令启动Edge:")
        print('   Start-Process "msedge" -ArgumentList "--remote-debugging-port=9222"')
        print("4. 在Edge中打开夸克高考页面")
        print("   https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian")
        print("5. 重新运行此脚本")
        return

    print(f"\n✅ 检测到 {len(pages)} 个Edge浏览器标签页")

    # 2. 查找夸克高考页面
    quark_page = find_quark_page(pages)

    if not quark_page:
        print("\n⚠️ 未找到夸克高考页面")
        print("\n请在Edge浏览器中打开夸克高考页面:")
        print("https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian")
        print("\n当前打开的页面:")
        for page in pages[:5]:
            print(f"  - {page.get('title', '无标题')}")
        return

    print(f"\n✅ 找到夸克高考页面:")
    print(f"   标题: {quark_page.get('title')}")
    print(f"   URL: {quark_page.get('url', '')[:80]}...")

    # 3. 连接到页面
    ws_url = quark_page.get('webSocketDebuggerUrl')
    if not ws_url:
        print("\n❌ 无法获取WebSocket调试地址")
        return

    print("\n正在连接到页面...")
    ws = connect_to_page(ws_url)

    if not ws:
        print("\n❌ 连接页面失败")
        return

    print("✅ 成功连接到夸克高考页面")

    # 4. 获取页面内容
    print("\n正在获取页面内容...")
    time.sleep(2)  # 等待页面完全加载

    html = get_page_content(ws)
    print(f"获取到页面内容: {len(html)} 字符")

    # 5. 提取数据
    print("\n正在分析页面数据...")
    data = extract_major_scores_from_html(html)

    if data:
        print(f"\n✅ 提取到 {len(data)} 条专业分数线数据")
        print("\n数据预览:")
        for i, item in enumerate(data[:5]):
            print(f"  {i+1}. {item}")
    else:
        print("\n⚠️ 未能自动提取数据")
        print("\n可能的原因:")
        print("  1. 数据通过JavaScript动态加载，需要等待更长时间")
        print("  2. 页面结构不同，需要手动操作")
        print("  3. 需要点击"查看全部"按钮加载完整数据")

        print("\n建议操作:")
        print("  1. 在浏览器中手动切换年份和点击"查看全部"")
        print("  2. 使用开发者工具(F12)复制Network中的API响应数据")
        print("  3. 将数据保存为JSON文件，然后运行数据导入脚本")

    # 关闭连接
    ws.close()

    print("\n" + "=" * 70)
    print("提示: 如果自动抓取失败，请使用手动导出方式")
    print("=" * 70)

if __name__ == '__main__':
    main()
