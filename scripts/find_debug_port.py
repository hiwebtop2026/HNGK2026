import requests
import json
import time

ports_to_try = [9222, 9223, 9224, 9225, 9128, 9080, 9081, 9901]

print('正在扫描浏览器调试端口...')

for port in ports_to_try:
    try:
        url = f'http://127.0.0.1:{port}/json'
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            pages = response.json()
            print(f'\n✅ 找到调试端口: {port}')
            print(f'   页面数量: {len(pages)}')

            for i, page in enumerate(pages[:10]):
                title = page.get('title', '无标题')[:50]
                url_page = page.get('url', '无URL')[:70]
                print(f'   [{i+1}] {title}')
                print(f'       {url_page}')

            quark_pages = [p for p in pages if 'quark' in p.get('url', '').lower() or '高考' in p.get('title', '')]
            if quark_pages:
                print(f'\n⭐ 找到 {len(quark_pages)} 个夸克高考相关页面:')
                for p in quark_pages[0]:
                    print(f'   - {p.get("title")}')

            break
    except Exception as e:
        print(f'  端口 {port}: 未找到')

print('\n扫描完成')
