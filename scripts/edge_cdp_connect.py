# -*- coding: utf-8 -*-
"""
Edge浏览器CDP连接工具
使用Chrome DevTools Protocol连接Edge浏览器
"""

import json
import time
import os
import sys

try:
    import websocket
except ImportError:
    os.system('pip install websocket-client')
    import websocket

def get_debug_pages(port=9222):
    """获取所有调试页面"""
    import urllib.request

    urls_to_try = [
        f'http://localhost:{port}/json',
        f'http://127.0.0.1:{port}/json',
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

def find_gaokao_pages(pages):
    """查找高考相关页面"""
    gaokao = []
    for page in pages:
        url = page.get('url', '').lower()
        title = page.get('title', '').lower()
        if 'quark' in url or 'gaokao' in url or '高考' in title:
            gaokao.append(page)
    return gaokao

def main():
    print("=" * 60)
    print("Edge浏览器CDP连接工具")
    print("=" * 60)

    # 尝试不同的端口
    ports_to_try = [9222, 9223, 9224, 9225, 4000, 4001]

    pages = []
    base_url = None

    for port in ports_to_try:
        pages, base_url = get_debug_pages(port)
        if pages:
            print(f"\n✅ 成功连接到Edge浏览器 (端口 {port})")
            break

    if not pages:
        print("\n❌ 未检测到Edge浏览器")
        print("\n请按以下步骤开启Edge浏览器的远程调试模式:")
        print("\n方法1: 命令行启动Edge")
        print('  1. 关闭所有Edge浏览器窗口')
        print('  2. 打开命令提示符(CMD)')
        print('  3. 运行以下命令:')
        print('  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222')
        print("\n方法2: 修改Edge快捷方式")
        print('  1. 右键Edge快捷方式 → 属性')
        print('  2. 在"目标"后添加: --remote-debugging-port=9222')
        print('  3. 重启Edge浏览器')
        print("\n方法3: PowerShell启动")
        print('  Start-Process "msedge" -ArgumentList "--remote-debugging-port=9222"')
        return

    print(f"\n✅ 检测到 {len(pages)} 个浏览器标签页")
    print("-" * 60)

    # 查找高考相关页面
    gaokao_pages = find_gaokao_pages(pages)

    # 显示所有页面
    for i, page in enumerate(pages):
        title = page.get('title', '无标题')
        url = page.get('url', '无URL')
        page_id = page.get('id', '')

        # 截断长标题和URL
        if len(title) > 50:
            title = title[:50] + "..."
        if len(url) > 70:
            url = url[:70] + "..."

        is_gaokao = page in gaokao_pages
        marker = "⭐" if is_gaokao else "  "

        print(f"{marker}[{i+1}] {title}")
        print(f"     ID: {page_id}")
        print(f"     URL: {url}")

    if gaokao_pages:
        print("\n" + "=" * 60)
        print(f"找到 {len(gaokao_pages)} 个高考相关页面:")
        for i, page in enumerate(gaokao_pages):
            print(f"  {i+1}. {page.get('title')} - ID: {page.get('id')}")

        # 返回第一个高考页面的信息
        target_page = gaokao_pages[0]
        print("\n" + "=" * 60)
        print(f"\n✅ 可用于抓取数据:")
        print(f"   页面ID: {target_page.get('id')}")
        print(f"   WebSocket: {target_page.get('webSocketDebuggerUrl')}")

        # 保存页面信息到文件
        with open('edge_pages.json', 'w', encoding='utf-8') as f:
            json.dump({
                'pages': pages,
                'gaokao_pages': gaokao_pages,
                'base_url': base_url
            }, f, ensure_ascii=False, indent=2)

        print(f"\n💾 页面信息已保存到 edge_pages.json")

    print("\n" + "=" * 60)

if __name__ == '__main__':
    main()
