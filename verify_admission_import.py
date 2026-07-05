import os
from dotenv import load_dotenv
load_dotenv()

import json
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("验证 admission_scores 表数据")
print("=" * 80)

print("\n1. 使用分页查询获取所有数据")
all_data = []
page_size = 500
page = 0

while True:
    result = supabase.table('admission_scores').select('province', 'year', 'school_name').range(page * page_size, (page + 1) * page_size - 1).execute()
    data = result.data
    
    if not data or len(data) == 0:
        break
    
    all_data.extend(data)
    print(f"  页面 {page + 1}: 获取 {len(data)} 条记录")
    
    if len(data) < page_size:
        break
    
    page += 1

print(f"\n总记录数: {len(all_data)}")

by_province_year = {}
schools_by_province = {}

for r in all_data:
    province = r.get('province', '未知')
    year = r.get('year', 0)
    
    key = f"{province}_{year}"
    by_province_year[key] = by_province_year.get(key, 0) + 1
    
    if province not in schools_by_province:
        schools_by_province[province] = set()
    schools_by_province[province].add(r.get('school_name', ''))

print("\n按省份和年份分布:")
for key, count in sorted(by_province_year.items()):
    province, year = key.split('_')
    print(f"  {province} {year}年: {count}条")

print("\n各省份学校数:")
for province, schools in sorted(schools_by_province.items()):
    print(f"  {province}: {len(schools)}所")

print("\n2. 验证天津数据样本")
result = supabase.table('admission_scores').select('*').eq('province', '天津').limit(3).execute()
if result.data:
    for r in result.data:
        print(f"\n学校: {r.get('school_name')}")
        print(f"  年份: {r.get('year')}")
        print(f"  专业组: {r.get('group_name')}")
        print(f"  分数: {r.get('score')}")
        print(f"  选科要求: {r.get('subject_requirement')}")

print("\n3. 验证海南数据样本")
result = supabase.table('admission_scores').select('*').eq('province', '海南').limit(3).execute()
if result.data:
    for r in result.data:
        print(f"\n学校: {r.get('school_name')}")
        print(f"  年份: {r.get('year')}")
        print(f"  专业组: {r.get('group_name')}")
        print(f"  分数: {r.get('score')}")
        print(f"  选科要求: {r.get('subject_requirement')}")

print("\n" + "=" * 80)
print("验证完成！")
print("=" * 80)
