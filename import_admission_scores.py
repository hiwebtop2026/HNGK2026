"""
将数据导入到Supabase数据库
请先在Supabase SQL Editor中执行 supabase_admission_scores.sql 创建表结构
"""
import os
from dotenv import load_dotenv
load_dotenv()


import json
import time

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

def main():
    print('='*60)
    print('📥 Supabase数据导入工具')
    print('='*60)
    
    print("\n⚠️ 请先在Supabase中创建表结构：")
    print("   1. 登录您的 Supabase 项目控制台")
    print("   2. 进入 SQL Editor")
    print("   3. 执行 supabase_admission_scores.sql 文件")
    print("\n按Enter继续...")
    input()
    
    print("\n连接Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("连接成功")
    
    print("\n验证表是否存在...")
    try:
        result = supabase.table('admission_scores').select('id').limit(1).execute()
        print("  ✅ admission_scores 表已就绪")
    except Exception as e:
        print(f"  ❌ 表不存在: {e}")
        print("  请先在Supabase SQL Editor中创建表")
        return
    
    print("\n读取本地数据...")
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"  读取到 {len(data)} 条数据")
    
    print("\n开始导入数据...")
    
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
            print(f'  ❌ 第 {i//batch_size + 1} 批失败，尝试逐条...')
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
    
    print("\n验证数据...")
    for year in [2023, 2024, 2025]:
        try:
            result = supabase.table('admission_scores').select('count(*)').eq('year', year).execute()
            count = result.data[0]['count'] if result.data else 0
            print(f"  {year}年: {count}条")
        except Exception as e:
            print(f"  {year}年: {e}")

if __name__ == '__main__':
    main()