"""
使用supabase客户端修复RLS并导入数据
"""

import json
import time

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

def main():
    print('='*60)
    print('🔧 使用service_role密钥导入数据')
    print('='*60)
    
    print("\n连接Supabase...")
    supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    print("连接成功")
    
    print("\n🔧 修复RLS策略...")
    
    try:
        result = supabase.rpc('pg_catalog.pg_execute', {'sql': 'ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;'}).execute()
        print("  ✅ 关闭admission_scores表RLS成功")
    except Exception as e:
        print(f"  ⚠️ 关闭RLS失败: {e}")
    
    try:
        result = supabase.rpc('pg_catalog.pg_execute', {'sql': 'ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;'}).execute()
        print("  ✅ 关闭subject_requirements表RLS成功")
    except Exception as e:
        print(f"  ⚠️ 关闭RLS失败: {e}")
    
    print("\n📥 开始导入数据...")
    
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"读取到 {len(data)} 条数据")
    
    batch_size = 100
    total_inserted = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        
        try:
            result = supabase.table('admission_scores').insert(batch).execute()
            inserted = len(result.data) if result.data else 0
            total_inserted += inserted
            progress = min(i + batch_size, len(data)) / len(data) * 100
            print(f'  进度: {min(i + batch_size, len(data))}/{len(data)} ({progress:.1f}%)')
        except Exception as e:
            print(f'  ❌ 第 {i//batch_size + 1} 批失败: {e}')
            for item in batch:
                try:
                    result = supabase.table('admission_scores').insert(item).execute()
                    if result.data:
                        total_inserted += 1
                except:
                    pass
        
        time.sleep(0.3)
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  成功插入: {total_inserted} 条')
    print('='*60)
    
    print("\n🔍 验证数据...")
    
    for year in [2023, 2024, 2025]:
        try:
            result = supabase.table('admission_scores').select('count(*)').eq('year', year).execute()
            count = result.data[0]['count'] if result.data else 0
            print(f"  {year}年: {count}条")
        except Exception as e:
            print(f"  {year}年: 查询失败 - {e}")

if __name__ == '__main__':
    main()