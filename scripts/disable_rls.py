from dotenv import load_dotenv
load_dotenv()

import psycopg2
import os

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

try:
    # 从 SUPABASE_URL 派生项目引用
    _ref = SUPABASE_URL.replace('https://', '').replace('http://', '').split('.')[0] if SUPABASE_URL else ''
    conn = psycopg2.connect(
        host='aws-0-ap-southeast-1.pooler.supabase.com',
        port=6543,
        dbname='postgres',
        user=f'postgres.{_ref}',
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