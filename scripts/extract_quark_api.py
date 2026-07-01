import requests
import re
from bs4 import BeautifulSoup

def download_page_and_extract_js(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'referer': 'https://vt.quark.cn/',
    }
    
    print(f"下载页面: {url}")
    response = requests.get(url, headers=headers, timeout=30)
    response.encoding = 'utf-8'
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    js_urls = []
    for script in soup.find_all('script', src=True):
        src = script['src']
        if src and ('js' in src or 'api' in src.lower()):
            if not src.startswith('http'):
                if src.startswith('//'):
                    src = 'https:' + src
                else:
                    src = 'https://vt.quark.cn' + src
            js_urls.append(src)
    
    print(f"找到 {len(js_urls)} 个JS文件")
    
    return js_urls

def download_js_and_search_api(js_urls):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    
    api_patterns = [
        r'getSpecialScore',
        r'getMajorScore',
        r'getScoreLine',
        r'getLuquScore',
        r'getSchoolMajor',
        r'majorScore',
        r'specialScore',
        r'fen_shu_xian',
        r'luqu',
        r'/oapi/',
        r'/api/',
        r'gk\.quark\.cn',
    ]
    
    found_api = []
    
    for url in js_urls[:10]:
        try:
            print(f"\n下载JS: {url[:60]}...")
            response = requests.get(url, headers=headers, timeout=30)
            
            text = response.text
            
            for pattern in api_patterns:
                matches = re.findall(pattern, text)
                if matches:
                    found_api.append({
                        'url': url[:60] + '...',
                        'pattern': pattern,
                        'count': len(set(matches)),
                        'samples': list(set(matches))[:5],
                    })
                    
            # 搜索完整的API调用
            api_calls = re.findall(r'(get|post|fetch)\s*\(\s*["\']([^"\']+score[^"\']*)["\']', text)
            if api_calls:
                found_api.append({
                    'url': url[:60] + '...',
                    'pattern': 'API_CALL',
                    'count': len(api_calls),
                    'samples': [c[1] for c in api_calls[:5]],
                })
                
        except Exception as e:
            print(f"  下载失败: {e}")
    
    return found_api

def main():
    print("=" * 70)
    print("夸克高考API端点提取工具")
    print("=" * 70)
    
    test_urls = [
        'https://vt.quark.cn/blm/gaokao-college-794/tab?app=fen_shu_xian&university_name=北京体育大学&q=北京体育大学',
        'https://www.gaokao.cn/school/261',
    ]
    
    all_js_urls = []
    for url in test_urls:
        js_urls = download_page_and_extract_js(url)
        all_js_urls.extend(js_urls)
    
    # 去重
    all_js_urls = list(set(all_js_urls))
    print(f"\n去重后共 {len(all_js_urls)} 个JS文件")
    
    # 搜索API
    found = download_js_and_search_api(all_js_urls)
    
    print("\n" + "=" * 70)
    if found:
        print("找到以下API相关内容:")
        for item in found:
            print(f"\n[{item['pattern']}] {item['url']}")
            print(f"  匹配数: {item['count']}")
            if item['samples']:
                print(f"  示例: {', '.join(item['samples'])}")
    else:
        print("未找到API相关内容")
    print("=" * 70)

if __name__ == "__main__":
    main()