import os
from dotenv import load_dotenv
load_dotenv()

import json
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("验证 major_scores 表实际数据量")
print("=" * 80)

print("\n1. 使用COUNT查询总记录数")
try:
    result = supabase.table('major_scores').select('count', { count: 'exact', head: true }).eq('province', '天津').execute()
    print(f"COUNT查询结果: {result.data}")
    print(f"实际记录数: {result.count}")
except Exception as e:
    print(f"COUNT查询失败: {e}")

print("\n2. 使用分页查询获取所有数据")
all_data = []
page_size = 2000
page = 0

while True:
    result = supabase.table('major_scores').select('*').eq('province', '天津').range(page * page_size, (page + 1) * page_size - 1).execute()
    data = result.data
    
    if not data or len(data) == 0:
        break
    
    all_data.extend(data)
    print(f"  页面 {page + 1}: 获取 {len(data)} 条记录")
    
    if len(data) < page_size:
        break
    
    page += 1

print(f"\n分页查询总记录数: {len(all_data)}")

if all_data:
    schools = set(r['school_name'] for r in all_data if r['school_name'])
    print(f"学校数: {len(schools)}")
    
    by_year = {}
    for r in all_data:
        year = r.get('year')
        if year not in by_year:
            by_year[year] = 0
        by_year[year] += 1
    
    print(f"按年份分布: {by_year}")

print("\n" + "=" * 80)
print("检查RLS策略")
print("=" * 80)

try:
    result = supabase.rpc('pg_stat_user_tables', {}).execute()
    print(f"表统计: {result.data}")
except Exception as e:
    print(f"无法获取表统计: {e}")

print("\n" + "=" * 80)
print("重新导入完整数据")
print("=" * 80)

print("\n步骤1: 删除旧数据")
result = supabase.table('major_scores').delete().eq('province', '天津').execute()
print("删除完成")

print("\n步骤2: 重新验证")
result = supabase.table('major_scores').select('count', { count: 'exact', head: true }).eq('province', '天津').execute()
print(f"删除后记录数: {result.count}")

print("\n步骤3: 读取修复后的数据文件")
input_file = 'data/tianjin_major_scores_all_fixed.json'
with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

valid_data = []
for item in data:
    min_score = item.get("min_score")
    if min_score is not None and min_score >= 100:
        valid_data.append(item)

print(f"有效记录数: {len(valid_data)}")

print("\n步骤4: 分批插入（每批50条）")
batch_size = 50
total_inserted = 0

for i in range(0, len(valid_data), batch_size):
    batch = valid_data[i:i+batch_size]
    
    rows = []
    for item in batch:
        rows.append({
            'school_name': item.get("school_name", ""),
            'province': '天津',
            'year': item.get("year", 2025),
            'major_name': item.get("major_name", ""),
            'major_group': item.get("major_group", ""),
            'min_score': item.get("min_score"),
            'min_rank': item.get("min_rank"),
            'person_count': item.get("person_count"),
            'batch': item.get("batch", ""),
            'subject_requirement': item.get("subject_requirement", ""),
        })
    
    result = supabase.table('major_scores').insert(rows).execute()
    inserted = len(result.data) if result.data else 0
    total_inserted += inserted
    
    if (i // batch_size + 1) % 10 == 0:
        print(f'  批次 {i//batch_size + 1}: 已插入 {total_inserted} 条')

print(f"\n总插入记录数: {total_inserted}")

print("\n步骤5: 最终验证")
result = supabase.table('major_scores').select('count', { count: 'exact', head: true }).eq('province', '天津').execute()
print(f"最终记录数: {result.count}")

result = supabase.table('major_scores').select('*').eq('province', '天津').range(0, 99).execute()
schools = set(r['school_name'] for r in result.data if r['school_name'])
print(f"前100条记录中的学校数: {len(schools)}")
