"""
⚠️ 安全告警：本脚本使用 execute_sql RPC，该 RPC 可执行任意 SQL，存在 SQL 注入风险。
请在使用后于 Supabase Dashboard → Database → Functions 删除 execute_sql 函数。
"""

"""
完整的数据导入解决方案
需要service_role密钥来修改RLS策略
"""
import os
import json
import time
import requests
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    raise EnvironmentError("缺少环境变量 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请在 .env 中配置")

HEADERS_ANON = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    'Content-Type': 'application/json',
}

def get_service_role_headers():
    if SERVICE_ROLE_KEY:
        return {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
            'Content-Type': 'application/json',
        }
    return None

def show_manual_instructions():
    """显示手动配置RLS的步骤"""
    print("""
📋 手动配置RLS步骤（推荐）：

1. 登录 Supabase Dashboard:
   <your-supabase-project>.supabase.co

2. 进入 SQL Editor（左侧菜单）

3. 执行以下SQL：

-- 关闭 admission_scores 表的RLS
ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;

-- 关闭 subject_requirements 表的RLS
ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;

-- 或者添加RLS策略（推荐）
-- CREATE POLICY "Allow anonymous select" ON admission_scores FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON admission_scores FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anonymous select" ON subject_requirements FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON subject_requirements FOR INSERT WITH CHECK (true);

4. 执行后回到本脚本，按Enter继续导入数据
""")
    input("按Enter继续...")

def try_fix_rls_with_service_role():
    """尝试使用service_role密钥修复RLS"""
    headers = get_service_role_headers()
    if not headers:
        return False
    
    url = f"{SUPABASE_URL}/rest/v1/rpc/execute_sql"
    
    sql_commands = [
        'ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;',
        'ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;',
    ]
    
    print("\n🔧 使用service_role密钥修复RLS...")
    
    for sql in sql_commands:
        try:
            response = requests.post(url, headers=headers, json={'sql': sql})
            if response.status_code in [200, 201, 204]:
                print(f"  ✅ 成功执行: {sql[:40]}...")
            else:
                print(f"  ❌ 执行失败: {response.text[:100]}")
                return False
        except Exception as e:
            print(f"  ❌ 执行异常: {e}")
            return False
    
    return True

def test_insert():
    """测试插入"""
    print("\n🔍 测试插入...")
    
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    first_item = data[0]
    url = f"{SUPABASE_URL}/rest/v1/admission_scores"
    
    response = requests.post(url, headers=HEADERS_ANON, json=first_item)
    
    if response.status_code in [200, 201]:
        print(f"✅ 测试插入成功")
        return True
    else:
        print(f"❌ 测试插入失败: {response.status_code}")
        print(f"   错误: {response.text[:200]}")
        return False

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
            response = requests.post(url, headers=HEADERS_ANON, json=batch)
            
            if response.status_code in [200, 201]:
                inserted = len(response.json()) if response.json() else 0
                total_inserted += inserted
                progress = min(i + batch_size, len(data)) / len(data) * 100
                print(f'  进度: {min(i + batch_size, len(data))}/{len(data)} ({progress:.1f}%)')
            else:
                print(f'  ❌ 第 {i//batch_size + 1} 批失败: {response.status_code}')
                for item in batch:
                    try:
                        r = requests.post(url, headers=HEADERS_ANON, json=item)
                        if r.status_code in [200, 201]:
                            total_inserted += 1
                    except:
                        pass
        
        except Exception as e:
            print(f'  ❌ 第 {i//batch_size + 1} 批异常: {e}')
        
        time.sleep(0.3)
    
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
            response = requests.get(url, headers=HEADERS_ANON, params=params)
            if response.status_code == 200:
                count = response.json()[0]['count'] if response.json() else 0
                print(f"  {year}年: {count}条")
            else:
                print(f"  {year}年: 查询失败 - {response.status_code}")
        except Exception as e:
            print(f"  {year}年: {e}")

def main():
    print('='*60)
    print('🔧 数据导入修复工具')
    print('='*60)
    
    print("\n检测到问题：RLS（行级安全）策略阻止了数据写入")
    print("需要先配置RLS策略才能导入数据")
    
    # 尝试使用service_role密钥
    if SERVICE_ROLE_KEY:
        if try_fix_rls_with_service_role():
            print("\n✅ RLS修复成功！")
        else:
            show_manual_instructions()
    else:
        print("\n⚠️ 未找到SERVICE_ROLE_KEY环境变量")
        show_manual_instructions()
    
    # 测试插入
    if not test_insert():
        print("\n❌ 插入仍然失败，请检查RLS配置")
        return
    
    # 导入数据
    import_data()
    
    # 验证数据
    verify_data()

if __name__ == '__main__':
    main()