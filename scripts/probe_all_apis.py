import requests
import json
import time

BASE_URLS = [
    "https://gk.quark.cn/oapi",
    "https://gk.quark.cn/api",
    "https://api.quark.cn/gk",
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'referer': 'https://www.quark.cn/',
    'origin': 'https://www.quark.cn',
    'Accept': 'application/json, text/plain, */*',
}

ENDPOINTS = [
    # 院校相关
    'school/detail',
    'school/info',
    'school/score',
    'school/majorScore',
    'school/specialScore',
    'school/luquScore',
    'school/majorList',
    'college/detail',
    'college/score',
    'college/majorScore',
    
    # 专业分数线
    'major/score',
    'special/score',
    'luqu/score',
    'admission/score',
    'score/major',
    'score/special',
    
    # gaokao
    'gaokao/schoolScore',
    'gaokao/majorScore',
    'gaokao/luqu',
    'gaokao/fenShuXian',
    
    # general_entity
    'general_entity_college_domestic/getSchoolScore',
    'general_entity_college_domestic/getMajorScore',
    'general_entity_college_domestic/getSpecialScore',
    'general_entity_college_domestic/getLuquScore',
    'general_entity_college_domestic/getCollegeScore',
    'general_entity_college_domestic/scoreLine',
    'general_entity_college_domestic/fenShuXian',
]

PARAMS = [
    {'school_id': 261, 'year': 2025, 'province': 46, 'province_id': 46},
    {'school_name': '北京大学', 'year': 2025, 'province': '海南'},
    {'id': 261, 'year': 2025, 'province': 46},
]

def test_endpoint(base_url, endpoint, params):
    url = f"{base_url}/{endpoint}"
    try:
        response = requests.get(url, headers=HEADERS, params=params, timeout=10)
        status = response.status_code
        content_type = response.headers.get('content-type', '')
        
        if status == 200 and 'json' in content_type:
            try:
                data = response.json()
                code = data.get('code', '')
                msg = data.get('msg', '')
                has_data = 'data' in data
                data_size = len(str(data.get('data', {}))) if has_data else 0
                
                if code == 0 and data_size > 100:
                    return (2, f"✅✅ {base_url}/{endpoint}: {status} - code={code} {msg} - data={data_size}bytes")
                elif code == 0:
                    return (1, f"✅ {base_url}/{endpoint}: {status} - code={code} {msg}")
                else:
                    return (1, f"✅ {base_url}/{endpoint}: {status} - code={code} {msg}")
            except:
                return (0, f"❌ {endpoint}: JSON解析失败")
        elif status == 200:
            return (0, f"❌ {endpoint}: {status} - HTML/text")
        else:
            return (0, f"❌ {endpoint}: {status}")
    except Exception as e:
        return (0, f"❌ {endpoint}: {str(e)[:30]}")

def main():
    print("=" * 70)
    print("夸克高考API端点全面探测")
    print("=" * 70)
    
    found = []
    count = 0
    
    for base_url in BASE_URLS:
        print(f"\n📡 测试域名: {base_url}")
        print("-" * 70)
        
        for endpoint in ENDPOINTS:
            for params in PARAMS:
                count += 1
                level, result = test_endpoint(base_url, endpoint, params)
                if level >= 1:
                    print(result)
                    found.append((base_url, endpoint, params, level))
                    break  # 找到一个参数组合就行
        
        time.sleep(0.3)
    
    print("\n" + "=" * 70)
    print(f"探测完成！共测试 {count} 个组合")
    if found:
        print(f"找到 {len(found)} 个有效API端点:")
        for base_url, endpoint, params, level in found:
            print(f"  {'⭐' if level == 2 else '✅'} {base_url}/{endpoint}")
    else:
        print("未找到有效API端点")
    print("=" * 70)

if __name__ == "__main__":
    main()