import os
from dotenv import load_dotenv
load_dotenv()

import json
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("检查天津数据的字段分布")
print("=" * 80)

print("\n1. 检查 admission_scores 表中的 level 和 nature 字段")
result = supabase.table('admission_scores').select('school_name', 'level', 'nature', 'score').eq('province', '天津').execute()
data = result.data

level_dist = {}
nature_dist = {}
for r in data:
    level = r.get('level', '') or '空'
    nature = r.get('nature', '') or '空'
    level_dist[level] = level_dist.get(level, 0) + 1
    nature_dist[nature] = nature_dist.get(nature, 0) + 1

print(f"\nlevel 分布 ({len(data)}条记录):")
for level, count in sorted(level_dist.items(), key=lambda x: -x[1]):
    print(f"  '{level}': {count}条")

print(f"\nnature 分布:")
for nature, count in sorted(nature_dist.items(), key=lambda x: -x[1]):
    print(f"  '{nature}': {count}条")

print("\n2. 检查 major_scores 表中的 level 和 nature 字段")
all_major_data = []
page_size = 500
page = 0

while True:
    result = supabase.table('major_scores').select('school_name', 'level', 'nature', 'min_score').eq('province', '天津').range(page * page_size, (page + 1) * page_size - 1).execute()
    data = result.data
    
    if not data or len(data) == 0:
        break
    
    all_major_data.extend(data)
    page += 1

level_dist_major = {}
nature_dist_major = {}
for r in all_major_data:
    level = r.get('level', '') or '空'
    nature = r.get('nature', '') or '空'
    level_dist_major[level] = level_dist_major.get(level, 0) + 1
    nature_dist_major[nature] = nature_dist_major.get(nature, 0) + 1

print(f"\nlevel 分布 ({len(all_major_data)}条记录):")
for level, count in sorted(level_dist_major.items(), key=lambda x: -x[1]):
    print(f"  '{level}': {count}条")

print(f"\nnature 分布:")
for nature, count in sorted(nature_dist_major.items(), key=lambda x: -x[1]):
    print(f"  '{nature}': {count}条")

print("\n3. 检查部分学校的分数和level")
print("\n600分附近的学校:")
count = 0
for r in all_major_data:
    score = r.get('min_score')
    if score is not None and 585 <= score <= 615:
        print(f"  {r.get('school_name')}: level={r.get('level')}, nature={r.get('nature')}, score={score}")
        count += 1
        if count >= 10:
            break

print("\n" + "=" * 80)
print("结论")
print("=" * 80)
print("需要检查前端筛选逻辑中的 level 和 nature 字段是否与数据库匹配")
