import requests
import time

BASE_URL = "https://gk.quark.cn/oapi/general_entity_college_domestic"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'referer': 'https://vt.quark.cn/',
    'origin': 'https://vt.quark.cn',
}

API_PATHS = [
    'getSpecialScore',
    'getMajorScore',
    'getScoreLine',
    'getLuquScore',
    'getSchoolMajor',
    'majorScore',
    'specialScore',
    'getGaokaoMajor',
    'getScoreDetail',
    'getSchoolScore',
    'getMajorList',
    'getAdmissionScore',
]

PARAMS_LIST = [
    {'school_id': 261, 'year': 2025, 'province': 46},
    {'school_id': 261, 'year': 2025, 'province': '海南'},
    {'school_id': 261, 'year': 2024, 'province': 46},
    {'school_id': 1, 'year': 2025, 'province': 46},
]

def test_api(path, params):
    url = f"{BASE_URL}/{path}"
    try:
        response = requests.get(url, headers=HEADERS, params=params, timeout=15)
        status = response.status_code
        content = response.text[:200]
        
        is_json = 'application/json' in response.headers.get('content-type', '')
        
        if status == 200 and is_json:
            try:
                json_data = response.json()
                code = json_data.get('code', '')
                msg = json_data.get('msg', '')
                data_len = len(str(json_data.get('data', {})))
                return (True, f"✅ {path}: {status} - {code} {msg} - {data_len} bytes")
            except:
                return (True, f"✅ {path}: {status} - JSON但解析失败 - {content[:100]}")
        elif status == 200:
            return (True, f"✅ {path}: {status} - HTML/text - {content[:100]}")
        elif status == 404:
            return (False, f"❌ {path}: {status}")
        else:
            return (False, f"❌ {path}: {status} - {content[:100]}")
    except Exception as e:
        return (False, f"❌ {path}: {str(e)[:50]}")

def main():
    print("=" * 70)
    print("夸克高考API端点探测工具")
    print("=" * 70)
    
    found = []
    
    for path in API_PATHS:
        for params in PARAMS_LIST:
            success, result = test_api(path, params)
            print(result)
            
            if success:
                found.append((path, params))
            
            time.sleep(0.5)
    
    print("\n" + "=" * 70)
    if found:
        print(f"找到 {len(found)} 个有效API:")
        for path, params in found:
            print(f"  - {path} ({params})")
    else:
        print("未找到有效API端点")
    print("=" * 70)

if __name__ == "__main__":
    main()