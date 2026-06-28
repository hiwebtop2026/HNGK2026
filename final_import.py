"""
数据导入脚本 - 请先在Supabase中配置RLS策略

步骤：
1. 登录 https://jhcyqhtgtnomqvcdeeuo.supabase.co
2. 进入 SQL Editor
3. 执行：ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;
4. 执行：ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;
5. 运行本脚本
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

def main():
    print('='*60)
    print('📥 海南高考投档分数线数据导入工具')
    print('='*60)
    
    print("""
⚠️ 请先在Supabase中关闭RLS：

1. 登录 https://jhcyqhtgtnomqvcdeeuo.supabase.co
2. 进入 SQL Editor（左侧菜单）
3. 执行以下SQL命令：

   ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;
   ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;

4. 执行完成后按Enter继续
""")
    input("按Enter继续...")
    
    print("\n🔍 验证RLS配置...")
    url = f"{SUPABASE_URL}/rest/v1/admission_scores"
    
    # 读取测试数据
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 测试插入
    test_item = data[0]
    response = requests.post(url, headers=HEADERS, json=test_item)
    
    if response.status_code not in [200, 201]:
        print(f"❌ RLS配置失败！错误: {response.text[:200]}")
        print("\n请确保已在Supabase中执行了关闭RLS的SQL命令")
        return
    
    print("✅ RLS配置成功！")
    
    # 删除测试数据（避免重复）
    try:
        result_id = response.json()[0]['id']
        requests.delete(f"{url}/{result_id}", headers=HEADERS)
    except:
        pass
    
    print(f"\n📥 开始导入 {len(data)} 条数据...")
    
    batch_size = 100
    total_inserted = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        
        try:
            response = requests.post(url, headers=HEADERS, json=batch)
            
            if response.status_code in [200, 201]:
                inserted = len(response.json()) if response.json() else 0
                total_inserted += inserted
                progress = min(i + batch_size, len(data)) / len(data) * 100
                print(f'  进度: {min(i + batch_size, len(data))}/{len(data)} ({progress:.1f}%)')
            else:
                print(f'  ❌ 第 {i//batch_size + 1} 批失败，尝试逐条...')
                for item in batch:
                    try:
                        r = requests.post(url, headers=HEADERS, json=item)
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
    
    print("\n🔍 验证数据...")
    for year in [2023, 2024, 2025]:
        params = {'year': f'eq.{year}', 'select': 'count(*)', 'limit': 1}
        response = requests.get(url, headers=HEADERS, params=params)
        if response.status_code == 200:
            count = response.json()[0]['count'] if response.json() else 0
            print(f"  {year}年: {count}条")
        else:
            print(f"  {year}年: 查询失败")

if __name__ == '__main__':
    main()