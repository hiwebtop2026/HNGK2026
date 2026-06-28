# -*- coding: utf-8 -*-
"""
夸克浏览器CDP连接工具 - 简化版
使用Chrome DevTools Protocol连接夸克浏览器
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

def get_debug_pages():
    """获取所有调试页面"""
    import urllib.request

    try:
        url = 'http://localhost:9222/json'
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            pages = json.loads(response.read().decode())
            return pages
    except Exception as e:
        print(f"无法连接到夸克浏览器: {e}")
        return []

def main():
    print("=" * 60)
    print("夸克浏览器CDP连接工具")
    print("=" * 60)

    pages = get_debug_pages()

    if not pages:
        print("\n❌ 未检测到夸克浏览器")
        print("\n请先启动夸克浏览器并开启远程调试:")
        print("1. 关闭夸克浏览器")
        print("2. 右键夸克浏览器快捷方式 → 属性")
        print("3. 在'目标'后添加: --remote-debugging-port=9222")
        print("4. 重启夸克浏览器")
        print("5. 访问夸克高考页面")
        print("6. 重新运行此脚本")
        return

    print(f"\n✅ 检测到 {len(pages)} 个浏览器标签页:")
    print("-" * 60)

    for i, page in enumerate(pages):
        title = page.get('title', '无标题')
        url = page.get('url', '无URL')
        page_id = page.get('id', '')

        # 截断长标题和URL
        if len(title) > 40:
            title = title[:40] + "..."
        if len(url) > 60:
            url = url[:60] + "..."

        print(f"\n[{i+1}] {title}")
        print(f"    ID: {page_id}")
        print(f"    URL: {url}")

    # 查找夸克相关页面
    quark_pages = [p for p in pages if 'quark' in p.get('url', '').lower() or '高考' in p.get('title', '')]
    gaokao_pages = [p for p in pages if 'gaokao' in p.get('url', '').lower()]

    if quark_pages:
        print("\n" + "=" * 60)
        print("夸克相关页面:")
        for i, page in enumerate(quark_pages):
            print(f"  {i+1}. {page.get('title')} - {page.get('id')}")

    if gaokao_pages:
        print("\n高考相关页面:")
        for i, page in enumerate(gaokao_pages):
            print(f"  {i+1}. {page.get('title')} - {page.get('id')}")

    print("\n" + "=" * 60)
    print("\n可用操作:")
    print("1. 获取页面截图")
    print("2. 执行JavaScript")
    print("3. 导出页面数据")
    print("\n请选择一个页面进行操作...")

if __name__ == '__main__':
    main()
