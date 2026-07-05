from dotenv import load_dotenv
load_dotenv()

# -*- coding: utf-8 -*-
"""
直接查询一分一段表数据
"""

import os
import sys
import requests

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

def query_direct(sql):
    """通过PostgREST API直接查询"""
    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    
    # 使用Prefer header禁用缓存
    headers['Accept'] = 'application/json'
    
    try:
        # 查询score_distribution表
        url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=*&limit=10'
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            return f'错误: {response.status_code} - {response.text}'
    except Exception as e:
        return f'异常: {e}'

def main():
    print('='*60)
    print('🔍 直接查询一分一段表数据')
    print('='*60)
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    
    # 1. 查询所有数据（前10条）
    print('\n1. 查询前10条数据...')
    try:
        url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=*&limit=10'
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'   总记录数: {len(data)}')
            if data:
                print(f'   示例: {data[0]}')
        else:
            print(f'   错误: {response.status_code} - {response.text[:200]}')
    except Exception as e:
        print(f'   异常: {e}')
    
    # 2. 查询天津2025年数据
    print('\n2. 查询天津2025年数据...')
    try:
        url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=*&province=eq.天津&year=eq.2025&order=score.desc&limit=5'
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'   天津2025年数据: {len(data)} 条')
            for row in data[:5]:
                print(f'      分数: {row.get("score")}, 同分: {row.get("count")}, 累计: {row.get("cumulative_count")}')
        else:
            print(f'   错误: {response.status_code} - {response.text[:200]}')
    except Exception as e:
        print(f'   异常: {e}')
    
    # 3. 查询统计信息
    print('\n3. 查询统计信息...')
    try:
        url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=province,year,count,score'
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'   总记录数: {len(data)}')
            
            # 按省份和年份统计
            stats = {}
            for row in data:
                province = row.get('province', '未知')
                year = row.get('year', 0)
                key = f'{province}-{year}'
                if key not in stats:
                    stats[key] = {'count': 0, 'total_students': 0}
                stats[key]['count'] += 1
                stats[key]['total_students'] += row.get('count', 0)
            
            for key, value in sorted(stats.items()):
                print(f'   {key}: {value["count"]} 条记录, 总考生: {value["total_students"]}')
        else:
            print(f'   错误: {response.status_code}')
    except Exception as e:
        print(f'   异常: {e}')
    
    print('\n' + '='*60)

if __name__ == '__main__':
    main()
