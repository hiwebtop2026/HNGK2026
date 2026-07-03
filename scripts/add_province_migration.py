# -*- coding: utf-8 -*-
"""
数据库迁移脚本：在admission_scores表中添加province字段
使用psycopg2直接连接PostgreSQL数据库执行DDL
"""

import os
import sys

# Supabase数据库配置
SUPABASE_HOST = 'jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_DB = 'postgres'
SUPABASE_USER = 'postgres'
# 用户需要提供正确的数据库密码
SUPABASE_PASSWORD = ''
SUPABASE_PORT = 5432

try:
    import psycopg2
except ImportError:
    print('安装psycopg2-binary...')
    os.system('pip install psycopg2-binary')
    import psycopg2

def execute_migration():
    print('='*60)
    print('🚀 执行数据库迁移 - 添加province字段')
    print('='*60)
    
    if not SUPABASE_PASSWORD:
        print('❌ 请在脚本中配置正确的Supabase数据库密码')
        print('密码获取方式：Supabase控制台 -> Settings -> Database -> Password')
        return
    
    print('\n连接数据库...')
    try:
        conn = psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            dbname=SUPABASE_DB,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            sslmode='require'
        )
        print('✅ 连接成功')
        
        cur = conn.cursor()
        
        sql_statements = [
            {
                'name': '添加province字段',
                'sql': "ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT '海南'"
            },
            {
                'name': '创建province索引',
                'sql': 'CREATE INDEX IF NOT EXISTS admission_scores_province_idx ON admission_scores (province)'
            },
            {
                'name': '创建province+year联合索引',
                'sql': 'CREATE INDEX IF NOT EXISTS admission_scores_province_year_idx ON admission_scores (province, year)'
            },
            {
                'name': '更新现有数据的province字段',
                'sql': "UPDATE admission_scores SET province = '海南' WHERE province IS NULL"
            },
            {
                'name': '添加major_scores表province字段',
                'sql': "ALTER TABLE major_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT '海南'"
            },
            {
                'name': '创建major_scores表province索引',
                'sql': 'CREATE INDEX IF NOT EXISTS major_scores_province_idx ON major_scores (province)'
            },
            {
                'name': '更新major_scores表province字段',
                'sql': "UPDATE major_scores SET province = '海南' WHERE province IS NULL"
            },
        ]
        
        for item in sql_statements:
            print(f'\n执行: {item["name"]}')
            
            try:
                cur.execute(item['sql'])
                conn.commit()
                print(f'✅ 成功')
            except Exception as e:
                conn.rollback()
                print(f'❌ 失败: {e}')
                cur.close()
                conn.close()
                return False
        
        print('\n验证province字段...')
        cur.execute("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'admission_scores' AND column_name = 'province'")
        result = cur.fetchone()
        if result:
            print(f'   字段名: {result[0]}')
            print(f'   数据类型: {result[1]}')
            print(f'   默认值: {result[2]}')
            print('✅ province字段验证成功')
        
        print('\n统计province数据分布...')
        cur.execute("SELECT province, COUNT(*) as count FROM admission_scores GROUP BY province")
        results = cur.fetchall()
        print('   省份数据分布:')
        for row in results:
            print(f'      {row[0]}: {row[1]}条')
        
        cur.close()
        conn.close()
        
        print('\n' + '='*60)
        print('✅ 数据库迁移完成！')
        print('='*60)
        
        return True
        
    except Exception as e:
        print(f'❌ 连接失败: {e}')
        return False

def main():
    execute_migration()

if __name__ == '__main__':
    main()
