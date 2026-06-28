"""
完整导入数据到Supabase（取消1000条限制）
使用service_role密钥可以绕过RLS和限制
"""

import json
import time
import requests

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',  # 处理重复数据
}

def get_current_count():
    """获取当前数据量"""
    # 使用Range header请求所有数据
    headers_with_range = HEADERS.copy()
    headers_with_range['Range'] = '0-999999'  # 请求所有数据
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/admission_scores",
        headers=headers_with_range
    )
    
    if response.status_code == 200:
        return len(response.json())
    return 0

def import_all_data():
    """导入全部数据"""
    print('='*60)
    print('📥 导入全部数据到Supabase')
    print('='*60)
    
    # 读取本地数据
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"\n本地数据总量: {len(data)}条")
    
    # 获取当前已导入数据量
    current_count = get_current_count()
    print(f"已导入数据量: {current_count}条")
    
    if current_count >= len(data):
        print("\n✅ 数据已全部导入！")
        return
    
    # 找出未导入的数据
    # 先查询已导入的数据
    headers_with_range = HEADERS.copy()
    headers_with_range['Range'] = '0-999999'
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/admission_scores?select=group_code,year",
        headers=headers_with_range
    )
    
    existing_keys = set()
    if response.status_code == 200:
        for item in response.json():
            existing_keys.add(f"{item['year']}_{item['group_code']}")
    
    # 筛选未导入的数据
    new_data = []
    for item in data:
        key = f"{item['year']}_{item['group_code']}"
        if key not in existing_keys:
            new_data.append(item)
    
    print(f"待导入数据量: {len(new_data)}条")
    
    if len(new_data) == 0:
        print("\n✅ 数据已全部导入！")
        return
    
    # 导入新数据
    print("\n开始导入...")
    
    batch_size = 50
    total_inserted = 0
    
    for i in range(0, len(new_data), batch_size):
        batch = new_data[i:i+batch_size]
        
        try:
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/admission_scores",
                headers=HEADERS,
                json=batch
            )
            
            if response.status_code in [200, 201]:
                inserted = len(response.json()) if response.json() else 0
                total_inserted += inserted
                progress = (i + batch_size) / len(new_data) * 100
                print(f'  进度: {i + batch_size}/{len(new_data)} ({progress:.1f}%) - 插入 {inserted} 条')
            else:
                print(f'  ❌ 第 {i//batch_size + 1} 批失败: {response.status_code} - {response.text[:100]}')
                # 逐条插入
                for item in batch:
                    try:
                        r = requests.post(
                            f"{SUPABASE_URL}/rest/v1/admission_scores",
                            headers=HEADERS,
                            json=item
                        )
                        if r.status_code in [200, 201]:
                            total_inserted += 1
                    except:
                        pass
        
        except Exception as e:
            print(f'  ❌ 第 {i//batch_size + 1} 批异常: {e}')
        
        time.sleep(0.5)
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  本次插入: {total_inserted} 条')
    print('='*60)

def verify_full_data():
    """验证全部数据"""
    print("\n🔍 验证数据...")
    
    headers_with_range = HEADERS.copy()
    headers_with_range['Range'] = '0-999999'
    
    for year in [2023, 2024, 2025]:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/admission_scores?year=eq.{year}",
            headers=headers_with_range
        )
        if response.status_code == 200:
            count = len(response.json())
            print(f"  {year}年: {count}条")
    
    # 总数据量
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/admission_scores",
        headers=headers_with_range
    )
    if response.status_code == 200:
        total = len(response.json())
        print(f"  总数据量: {total}条")

def test_anon_query():
    """测试匿名查询（需要关闭RLS）"""
    print("\n🔍 测试匿名查询...")
    
    ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o"
    
    headers_anon = {
        'apikey': ANON_KEY,
        'Authorization': f'Bearer {ANON_KEY}',
        'Content-Type': 'application/json',
        'Range': '0-999999',
    }
    
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/admission_scores?year=eq.2025&limit=1",
        headers=headers_anon
    )
    
    if response.status_code == 200 and len(response.json()) > 0:
        print("  ✅ 匿名查询成功！")
    else:
        print("  ❌ 匿名查询失败（需要关闭RLS）")
        print("     请在Supabase SQL Editor中执行:")
        print("     ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;")

def main():
    import_all_data()
    verify_full_data()
    test_anon_query()

if __name__ == '__main__':
    main()