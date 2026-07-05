"""
智能导入数据 - 自动跳过已存在的数据并导入剩余
"""
import os
from dotenv import load_dotenv
load_dotenv()


import json
import time
import requests

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

def get_all_existing_data():
    """获取所有已存在的数据（使用Range header绕过1000限制）"""
    print("获取已存在数据（使用Range header）...")
    
    all_data = []
    offset = 0
    batch_size = 1000
    
    while True:
        headers_with_range = HEADERS.copy()
        headers_with_range['Range'] = f'{offset}-{offset + batch_size - 1}'
        
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/admission_scores?select=year,group_code",
            headers=headers_with_range
        )
        
        if response.status_code != 200:
            break
        
        data = response.json()
        if len(data) == 0:
            break
        
        all_data.extend(data)
        offset += batch_size
        
        print(f"  已获取 {len(all_data)} 条...")
        
        if len(data) < batch_size:
            break
    
    print(f"总共获取 {len(all_data)} 条已存在数据")
    return set(f"{d['year']}_{d['group_code']}" for d in all_data)

def import_new_data():
    """导入新数据"""
    print('='*60)
    print('📥 智能导入数据到Supabase')
    print('='*60)
    
    # 获取已存在的数据
    existing_keys = get_all_existing_data()
    
    # 读取本地数据
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"\n本地数据总量: {len(data)}条")
    print(f"已存在数据量: {len(existing_keys)}条")
    
    # 筛选新数据
    new_data = []
    for item in data:
        key = f"{item['year']}_{item['group_code']}"
        if key not in existing_keys:
            new_data.append(item)
    
    print(f"待导入数据量: {len(new_data)}条")
    
    if len(new_data) == 0:
        print("\n✅ 所有数据已导入！")
        return
    
    # 导入新数据
    print("\n开始导入新数据...")
    
    batch_size = 50
    total_inserted = 0
    total_skipped = 0
    
    for i in range(0, len(new_data), batch_size):
        batch = new_data[i:i+batch_size]
        
        for item in batch:
            try:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/admission_scores",
                    headers=HEADERS,
                    json=item
                )
                
                if response.status_code in [200, 201]:
                    total_inserted += 1
                elif response.status_code == 409:  # Conflict - already exists
                    total_skipped += 1
                else:
                    print(f"    ❌ 插入失败: {item['school_name']} - {response.status_code}")
            except Exception as e:
                print(f"    ❌ 插入异常: {e}")
        
        progress = (i + batch_size) / len(new_data) * 100
        print(f'  进度: {min(i + batch_size, len(new_data))}/{len(new_data)} ({progress:.1f}%) - 已插入 {total_inserted} 条')
        
        time.sleep(0.3)
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  本次插入: {total_inserted} 条')
    print(f'  跳过重复: {total_skipped} 条')
    print('='*60)

def verify_all_data():
    """验证所有数据"""
    print("\n🔍 验证全部数据...")
    
    headers_with_range = HEADERS.copy()
    headers_with_range['Range'] = '0-999999'
    
    total = 0
    for year in [2023, 2024, 2025]:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/admission_scores?year=eq.{year}",
            headers=headers_with_range
        )
        if response.status_code == 200:
            count = len(response.json())
            total += count
            print(f"  {year}年: {count}条")
    
    print(f"  总数据量: {total}条")

def main():
    import_new_data()
    verify_all_data()

if __name__ == '__main__':
    main()