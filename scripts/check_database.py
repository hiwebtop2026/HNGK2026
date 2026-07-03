# -*- coding: utf-8 -*-
"""
检查Supabase数据库表结构和数据状态
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

def check_database():
    print('='*60)
    print('📊 Supabase数据库状态检查')
    print('='*60)
    
    print('\n连接数据库...')
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print('✅ 连接成功')
    except Exception as e:
        print(f'❌ 连接失败: {e}')
        return
    
    print('\n1. 检查表结构...')
    try:
        response = supabase.from_('admission_scores').select('*').limit(1).execute()
        if response.data and len(response.data) > 0:
            columns = list(response.data[0].keys())
            print(f'   表列: {columns}')
            
            if 'province' in columns:
                print('   ✅ province字段已存在')
            else:
                print('   ❌ province字段不存在')
        else:
            print('   ⚠️ 表为空，无法检查列结构')
    except Exception as e:
        print(f'   ❌ 检查表结构失败: {e}')
    
    print('\n2. 检查海南数据...')
    for year in [2023, 2024, 2025]:
        try:
            response = supabase.from_('admission_scores').select('*').eq('year', year).limit(5).execute()
            count = len(response.data) if response.data else 0
            print(f'   {year}年数据: {count}条')
            
            if count > 0:
                print(f'      示例: {response.data[0]["group_name"]} - {response.data[0]["score"]}分')
        except Exception as e:
            print(f'   ❌ {year}年数据查询失败: {e}')
    
    print('\n3. 检查province字段数据分布...')
    try:
        response = supabase.from_('admission_scores').select('province').execute()
        data = response.data if response.data else []
        
        province_counts = {}
        for row in data:
            province = row.get('province', '未知')
            province_counts[province] = province_counts.get(province, 0) + 1
        
        print(f'   数据总数: {len(data)}条')
        print('   省份分布:')
        for province, count in sorted(province_counts.items(), key=lambda x: -x[1]):
            print(f'      {province}: {count}条')
    except Exception as e:
        print(f'   ❌ 查询province分布失败: {e}')
    
    print('\n='*60)
    print('检查完成！')
    print('='*60)

def main():
    check_database()

if __name__ == '__main__':
    main()
