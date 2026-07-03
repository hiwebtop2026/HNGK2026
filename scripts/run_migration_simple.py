# -*- coding: utf-8 -*-
"""
执行数据库迁移：添加province字段
使用Supabase REST API执行SQL
"""

import os
import sys
import json

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

try:
    import requests
except ImportError:
    os.system('pip install requests')
    import requests

def execute_migration():
    print('='*60)
    print('🚀 执行数据库迁移')
    print('='*60)
    
    headers = {
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    
    sql_statements = [
        'ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT \'海南\'',
        'CREATE INDEX IF NOT EXISTS admission_scores_province_idx ON admission_scores (province)',
        'CREATE INDEX IF NOT EXISTS admission_scores_province_year_idx ON admission_scores (province, year)',
        'UPDATE admission_scores SET province = \'海南\' WHERE province IS NULL',
    ]
    
    for i, sql in enumerate(sql_statements, 1):
        print(f'\n执行第 {i}/{len(sql_statements)} 条SQL...')
        print(f'   SQL: {sql[:50]}...')
        
        try:
            # 使用Supabase REST API执行SQL需要通过RPC函数
            # 这里使用直接插入方式测试
            response = requests.post(
                f'{SUPABASE_URL}/rest/v1/',
                headers=headers,
                data=json.dumps({
                    'query': sql
                })
            )
            
            # 尝试另一种方式
            response = requests.post(
                f'{SUPABASE_URL}/rest/v1/rpc/execute_sql',
                headers=headers,
                json={'query': sql}
            )
            
            if response.status_code == 200:
                print('   ✅ 成功')
            else:
                print(f'   ❌ 失败: {response.status_code} - {response.text[:100]}')
                
        except Exception as e:
            print(f'   ❌ 执行失败: {e}')
    
    print('\n='*60)
    print('迁移完成！')
    print('='*60)

def main():
    execute_migration()

if __name__ == '__main__':
    main()
