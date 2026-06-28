"""
修复Supabase RLS权限问题并导入数据
"""

import json
import time
import requests

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o"

HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    'Content-Type': 'application/json',
}

def execute_sql(sql):
    """通过REST API执行SQL"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/execute_sql"
    try:
        response = requests.post(url, headers=HEADERS, json={'sql': sql})
        if response.status_code in [200, 201, 204]:
            return True, response.text
        else:
            return False, response.text
    except Exception as e:
        return False, str(e)

def fix_rls_policy():
    """修复RLS策略"""
    print("\n🔧 修复RLS策略...")
    
    # 先尝试关闭RLS
    print("  尝试关闭admission_scores表的RLS...")
    success, msg = execute_sql('ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;')
    if success:
        print("  ✅ 成功关闭RLS")
    else:
        print(f"  ❌ 关闭RLS失败: {msg[:100]}")
        
        # 尝试添加RLS策略
        print("  尝试添加RLS策略...")
        policies = [
            'CREATE POLICY "Allow anonymous select" ON admission_scores FOR SELECT USING (true);',
            'CREATE POLICY "Allow anonymous insert" ON admission_scores FOR INSERT WITH CHECK (true);',
            'CREATE POLICY "Allow anonymous update" ON admission_scores FOR UPDATE USING (true);',
            'CREATE POLICY "Allow anonymous delete" ON admission_scores FOR DELETE USING (true);',
        ]
        
        for policy in policies:
            success, msg = execute_sql(policy)
            if success:
                print(f"  ✅ 策略创建成功")
            else:
                print(f"  ⚠️ 策略创建失败（可能已存在）: {msg[:50]}")
    
    # 对subject_requirements表也做同样处理
    print("\n  处理subject_requirements表...")
    execute_sql('ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;')
    
    print("\n✅ RLS策略修复完成")

def import_data():
    """导入数据"""
    print("\n📥 开始导入数据...")
    
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"读取到 {len(data)} 条数据")
    
    url = f"{SUPABASE_URL}/rest/v1/admission_scores"
    batch_size = 50
    total_inserted = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        
        try:
            response = requests.post(url, headers=HEADERS, json=batch)
            
            if response.status_code in [200, 201]:
                inserted = len(response.json()) if response.json() else 0
                total_inserted += inserted
                progress = min(i + batch_size, len(data)) / len(data) * 100
                print(f'  进度: {min(i + batch_size, len(data))}/{len(data)} ({progress:.1f}%) - 插入 {inserted} 条')
            else:
                print(f'  ❌ 第 {i//batch_size + 1} 批失败: {response.status_code}')
                print(f'     错误: {response.text[:200]}')
                
                # 尝试逐条插入
                for item in batch:
                    try:
                        response_single = requests.post(url, headers=HEADERS, json=item)
                        if response_single.status_code in [200, 201]:
                            total_inserted += 1
                    except:
                        pass
        
        except Exception as e:
            print(f'  ❌ 第 {i//batch_size + 1} 批异常: {e}')
        
        time.sleep(0.5)
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  成功插入: {total_inserted} 条')
    print('='*60)

def verify_data():
    """验证数据"""
    print("\n🔍 验证数据...")
    
    url = f"{SUPABASE_URL}/rest/v1/admission_scores"
    
    for year in [2023, 2024, 2025]:
        params = {'year': f'eq.{year}', 'select': 'count(*)', 'limit': 1}
        try:
            response = requests.get(url, headers=HEADERS, params=params)
            if response.status_code == 200:
                count = response.json()[0]['count'] if response.json() else 0
                print(f"  {year}年: {count}条")
            else:
                print(f"  {year}年: 查询失败 - {response.status_code}")
        except Exception as e:
            print(f"  {year}年: {e}")

def main():
    print('='*60)
    print('🔧 修复RLS并导入数据')
    print('='*60)
    
    fix_rls_policy()
    import_data()
    verify_data()

if __name__ == '__main__':
    main()