# -*- coding: utf-8 -*-
"""
将抓取的JSON数据导入到Supabase数据库
"""

import json
import os
import sys

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client

def import_json_file(json_file):
    print(f'正在读取文件: {json_file}')
    
    if not os.path.exists(json_file):
        print(f'❌ 文件不存在: {json_file}')
        return 0
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f'✅ 读取到 {len(data)} 条数据')
    
    if not data:
        print('❌ 数据为空')
        return 0
    
    print('\n数据预览:')
    for i, item in enumerate(data[:3]):
        print(f'  {i+1}. {item.get("school_name", "")} - {item.get("major_name", "")} - {item.get("min_score", "--")}分')
    
    print(f'\n连接Supabase数据库...')
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print('✅ 连接成功')
    except Exception as e:
        print(f'❌ 连接失败: {e}')
        return 0
    
    print('\n开始导入数据...')
    
    batch_size = 100
    total_inserted = 0
    total_errors = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        
        try:
            result = supabase.table('major_scores').insert(batch).execute()
            inserted = len(result.data) if result.data else 0
            total_inserted += inserted
            progress = min(i + batch_size, len(data)) / len(data) * 100
            print(f'  进度: {min(i + batch_size, len(data))}/{len(data)} ({progress:.1f}%) - 本批插入 {inserted} 条')
        except Exception as e:
            total_errors += 1
            print(f'  ❌ 第 {i//batch_size + 1} 批插入失败: {e}')
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  总数据量: {len(data)} 条')
    print(f'  成功插入: {total_inserted} 条')
    print(f'  失败批次: {total_errors}')
    print('='*60)
    
    return total_inserted

def main():
    print('='*60)
    print('📥 Supabase数据导入工具')
    print('='*60)
    
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
    else:
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        json_file = os.path.join(data_dir, '夸克高考专业分数线.json')
        
        if not os.path.exists(json_file):
            files = [f for f in os.listdir(data_dir) if f.endswith('.json') and 'score' in f.lower()]
            if files:
                json_file = os.path.join(data_dir, files[0])
            else:
                print('❌ 未找到JSON文件')
                print('请将抓取的JSON文件放到 data 目录下，或通过参数指定文件路径')
                print('用法: python import_to_supabase.py <json文件路径>')
                return
    
    import_json_file(json_file)

if __name__ == '__main__':
    main()
