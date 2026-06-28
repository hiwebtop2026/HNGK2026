# -*- coding: utf-8 -*-
"""
夸克高考API测试脚本
测试夸克高考的API接口是否可以调用
"""

import requests
import json
from urllib.parse import urlencode

# 夸克高考API基础URL
BASE_URL = 'https://blm-api.quark.cn/blm/pc-gaokao/api'

# 请求头
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://vt.quark.cn/blm/pc-gaokao-1089/index',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Origin': 'https://vt.quark.cn',
}

def test_school_major_score_api(school_name, year=2025, province='海南'):
    """测试院校专业分数线API"""
    url = f'{BASE_URL}/schoolMajorScore/getSchoolMajorScore'

    params = {
        'school_name': school_name,
        'year': str(year),
        'province': province,
        'batch': '',
        'major_name': '',
    }

    try:
        print(f"\n请求参数:")
        print(f"  院校: {school_name}")
        print(f"  年份: {year}")
        print(f"  省份: {province}")

        response = requests.get(url, params=params, headers=HEADERS, timeout=10)
        print(f"  状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"  响应数据: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}")

            # 检查数据结构
            if data.get('code') == 0 or data.get('status') == 0:
                return data.get('data', {})
            else:
                print(f"  API错误: {data.get('message', '未知错误')}")
                return None
        else:
            print(f"  HTTP错误: {response.text[:200]}")
            return None

    except Exception as e:
        print(f"  请求失败: {e}")
        return None

def test_search_school_api(keyword):
    """测试搜索院校API"""
    url = f'{BASE_URL}/school/getSchoolList'

    params = {
        'keyword': keyword,
        'page': 1,
        'size': 10,
        'province': '海南',
    }

    try:
        print(f"\n搜索院校: {keyword}")

        response = requests.get(url, params=params, headers=HEADERS, timeout=10)
        print(f"  状态码: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"  响应数据: {json.dumps(data, ensure_ascii=False, indent=2)[:500]}")
            return data
        else:
            print(f"  HTTP错误: {response.text[:200]}")
            return None

    except Exception as e:
        print(f"  请求失败: {e}")
        return None

def batch_fetch_major_scores(school_name):
    """批量获取院校专业分数线（2023-2025年）"""
    results = []

    for year in [2023, 2024, 2025]:
        data = test_school_major_score_api(school_name, year, '海南')
        if data:
            results.append({
                'year': year,
                'data': data
            })
        time.sleep(1)  # 避免请求过快

    return results

def main():
    print("=" * 60)
    print("夸克高考API测试工具")
    print("=" * 60)

    # 测试1: 搜索院校
    print("\n【测试1】搜索院校")
    test_search_school_api('清华大学')

    # 测试2: 获取专业分数线
    print("\n【测试2】获取专业分数线")
    test_school_major_score_api('清华大学', 2025, '海南')

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == '__main__':
    main()
