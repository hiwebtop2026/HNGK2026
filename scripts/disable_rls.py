import psycopg2
import os

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

try:
    conn = psycopg2.connect(
        host='aws-0-ap-southeast-1.pooler.supabase.com',
        port=6543,
        dbname='postgres',
        user='postgres.jhcyqhtgtnomqvcdeeuo',
        password=SUPABASE_KEY
    )
    
    cursor = conn.cursor()
    
    tables = ['score_distribution', 'admission_scores', 'major_scores', 'subject_requirements']
    
    for table in tables:
        try:
            cursor.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;')
            print(f'✅ {table} RLS已禁用')
        except Exception as e:
            print(f'❌ {table} RLS禁用失败: {e}')
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print('\n✅ 所有表的RLS已禁用')
    
except ImportError:
    print('❌ 需要安装psycopg2，请运行: pip install psycopg2-binary')
except Exception as e:
    print(f'❌ 连接失败: {e}')