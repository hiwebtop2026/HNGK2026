# -*- coding: utf-8 -*-
"""
检查所有一分一段表数据状态
"""

import requests

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

def main():
    print('='*60)
    print('📊 一分一段表数据状态检查')
    print('='*60)
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    
    # 1. 查询所有省份统计
    print('\n1. 所有省份一分一段表统计:')
    try:
        url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=province,year,score,count'
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
                    stats[key] = {'count': 0, 'total_students': 0, 'min_score': 999, 'max_score': 0}
                stats[key]['count'] += 1
                stats[key]['total_students'] += row.get('count', 0)
                score = row.get('score', 0)
                if score < stats[key]['min_score']:
                    stats[key]['min_score'] = score
                if score > stats[key]['max_score']:
                    stats[key]['max_score'] = score
            
            print(f'   {"省份-年份":<15} {"记录数":<8} {"最低分":<8} {"最高分":<8} {"总考生":<10}')
            print('   ' + '-'*55)
            for key, value in sorted(stats.items()):
                print(f'   {key:<15} {value["count"]:<8} {value["min_score"]:<8} {value["max_score"]:<8} {value["total_students"]:<10}')
        else:
            print(f'   错误: {response.status_code}')
    except Exception as e:
        print(f'   异常: {e}')
    
    # 2. 检查海南数据
    print('\n2. 海南数据检查:')
    try:
        url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=*&province=eq.海南&year=eq.2025&order=score.desc&limit=5'
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'   海南2025年数据: {len(data)} 条')
            if data:
                for row in data[:3]:
                    print(f'      分数: {row.get("score")}, 同分: {row.get("count")}, 累计: {row.get("cumulative_count")}')
        else:
            print(f'   错误: {response.status_code}')
    except Exception as e:
        print(f'   异常: {e}')
    
    # 3. 检查admission_scores表
    print('\n3. 录取分数线表检查:')
    try:
        url = f'{SUPABASE_URL}/rest/v1/admission_scores?select=province,year,score&limit=1000'
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print(f'   总记录数: {len(data)}')
            
            # 按省份统计
            province_stats = {}
            for row in data:
                province = row.get('province', '未知')
                province_stats[province] = province_stats.get(province, 0) + 1
            
            for province, count in sorted(province_stats.items(), key=lambda x: -x[1]):
                print(f'      {province}: {count} 条')
        else:
            print(f'   错误: {response.status_code}')
    except Exception as e:
        print(f'   异常: {e}')
    
    print('\n' + '='*60)

if __name__ == '__main__':
    main()
