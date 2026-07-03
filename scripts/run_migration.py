# -*- coding: utf-8 -*-
"""
在Supabase数据库中执行SQL迁移脚本
使用psycopg2直接连接数据库执行SQL
"""

import os
import sys

SUPABASE_URL = 'jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_DB = 'postgres'
SUPABASE_USER = 'postgres'
SUPABASE_PASSWORD = 'dXzU4Y3M4J5K6L7N8'
SUPABASE_PORT = 5432

try:
    import psycopg2
except ImportError:
    os.system('pip install psycopg2-binary')
    import psycopg2

def execute_sql(sql_file):
    print(f'正在读取SQL文件: {sql_file}')
    
    if not os.path.exists(sql_file):
        print(f'❌ 文件不存在: {sql_file}')
        return False
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print('\n连接Supabase数据库...')
    
    try:
        conn = psycopg2.connect(
            host=SUPABASE_URL,
            port=SUPABASE_PORT,
            dbname=SUPABASE_DB,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            sslmode='require'
        )
        print('✅ 连接成功')
        
        cur = conn.cursor()
        
        sql_statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        
        print(f'✅ 读取到 {len(sql_statements)} 条SQL语句')
        
        for i, sql in enumerate(sql_statements, 1):
            if not sql:
                continue
            
            print(f'\n执行第 {i}/{len(sql_statements)} 条SQL语句...')
            
            try:
                cur.execute(sql)
                conn.commit()
                print(f'✅ 成功')
            except Exception as e:
                conn.rollback()
                print(f'❌ 失败: {e}')
                cur.close()
                conn.close()
                return False
        
        cur.close()
        conn.close()
        
        print('\n' + '='*60)
        print('✅ SQL迁移完成！')
        print('='*60)
        
        return True
        
    except Exception as e:
        print(f'❌ 连接失败: {e}')
        return False

def main():
    print('='*60)
    print('📋 Supabase SQL迁移工具')
    print('='*60)
    
    sql_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'supabase_add_province.sql')
    
    if not os.path.exists(sql_file):
        print(f'❌ 文件不存在: {sql_file}')
        return
    
    execute_sql(sql_file)

if __name__ == '__main__':
    main()
