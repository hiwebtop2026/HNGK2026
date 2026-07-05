import json
from supabase import create_client, Client

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("检查天津数据的选科要求")
print("=" * 80)

print("\n1. 检查 admission_scores 表中的选科要求")
result = supabase.table('admission_scores').select('school_name', 'subject_requirement', 'score').eq('province', '天津').execute()
data = result.data

subject_dist = {}
for r in data:
    req = r.get('subject_requirement', '') or '空'
    subject_dist[req] = subject_dist.get(req, 0) + 1

print(f"\n选科要求分布 ({len(data)}条记录):")
for req, count in sorted(subject_dist.items(), key=lambda x: -x[1]):
    print(f"  '{req}': {count}条")

print("\n2. 检查 major_scores 表中的选科要求")
all_major_data = []
page_size = 500
page = 0

while True:
    result = supabase.table('major_scores').select('school_name', 'subject_requirement', 'min_score').eq('province', '天津').range(page * page_size, (page + 1) * page_size - 1).execute()
    data = result.data
    
    if not data or len(data) == 0:
        break
    
    all_major_data.extend(data)
    page += 1

subject_dist_major = {}
for r in all_major_data:
    req = r.get('subject_requirement', '') or '空'
    subject_dist_major[req] = subject_dist_major.get(req, 0) + 1

print(f"\n选科要求分布 ({len(all_major_data)}条记录):")
for req, count in sorted(subject_dist_major.items(), key=lambda x: -x[1])[:15]:
    print(f"  '{req}': {count}条")

print("\n3. 查看典型选科要求示例")
print("\n物理+化学相关:")
count = 0
for r in all_major_data:
    req = r.get('subject_requirement', '')
    if '物+化' in req or '物理+化学' in req:
        print(f"  {r.get('school_name')}: {req}, 分数: {r.get('min_score')}")
        count += 1
        if count >= 3:
            break

print("\n不限相关:")
count = 0
for r in all_major_data:
    req = r.get('subject_requirement', '')
    if not req or '不限' in req or '0' == req:
        print(f"  {r.get('school_name')}: {req}, 分数: {r.get('min_score')}")
        count += 1
        if count >= 3:
            break

print("\n其他类型:")
count = 0
for r in all_major_data:
    req = r.get('subject_requirement', '')
    if req and '物+化' not in req and '不限' not in req and '物理+化学' not in req:
        print(f"  {r.get('school_name')}: {req}, 分数: {r.get('min_score')}")
        count += 1
        if count >= 5:
            break

print("\n" + "=" * 80)
print("结论")
print("=" * 80)
print("需要检查前端选科匹配逻辑是否正确处理天津的选科要求格式")
