# -*- coding: utf-8 -*-
"""
验证一分一段表数据状态
"""

import os
import sys

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client

def main():
    print('='*60)
    print('🔍 验证一分一段表数据状态')
    print('='*60)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. 检查表是否存在
    print('\n1. 检查score_distribution表...')
    try:
        response = supabase.from_('score_distribution').select('*').limit(1).execute()
        print('   ✅ 表存在')
        if response.data and len(response.data) > 0:
            print(f'   表列: {list(response.data[0].keys())}')
        else:
            print('   ⚠️ 表为空')
    except Exception as e:
        print(f'   ❌ 表不存在或查询失败: {e}')
        return
    
    # 2. 统计所有数据
    print('\n2. 统计所有数据...')
    try:
        response = supabase.from_('score_distribution').select('*').execute()
        data = response.data if response.data else []
        print(f'   总记录数: {len(data)}')
        
        if len(data) == 0:
            print('   ⚠️ 表中没有任何数据')
            print('   请检查是否执行了数据导入SQL文件')
            return
    except Exception as e:
        print(f'   ❌ 查询失败: {e}')
        return
    
    # 3. 按省份和年份统计
    print('\n3. 按省份和年份统计...')
    province_year_counts = {}
    for row in data:
        province = row.get('province', '未知')
        year = row.get('year', 0)
        key = f'{province}-{year}'
        province_year_counts[key] = province_year_counts.get(key, 0) + 1
    
    for key, count in sorted(province_year_counts.items()):
        print(f'   {key}: {count} 条')
    
    # 4. 检查天津2025年数据
    print('\n4. 检查天津2025年数据...')
    try:
        response = supabase.from_('score_distribution').select('*').eq('province', '天津').eq('year', 2025).order('score', desc=True).limit(5).execute()
        tj_data = response.data if response.data else []
        print(f'   天津2025年数据: {len(tj_data)} 条')
        if tj_data:
            print('   示例数据:')
            for row in tj_data[:3]:
                print(f'      分数: {row.get("score")}, 同分人数: {row.get("count")}, 累计: {row.get("cumulative_count")}, 位次: {row.get("min_rank")}~{row.get("max_rank")}')
    except Exception as e:
        print(f'   ❌ 查询失败: {e}')
    
    # 5. 检查海南数据
    print('\n5. 检查海南数据...')
    try:
        response = supabase.from_('score_distribution').select('*').eq('province', '海南').execute()
        hn_data = response.data if response.data else []
        print(f'   海南数据: {len(hn_data)} 条')
    except Exception as e:
        print(f'   ❌ 查询失败: {e}')
    
    print('\n' + '='*60)
    print('验证完成！')
    print('='*60)

if __name__ == '__main__':
    main()
