import os
from dotenv import load_dotenv
load_dotenv()

import json
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("检查天津数据的分数分布")
print("=" * 80)

print("\n1. admission_scores 表分数分布")
result = supabase.table('admission_scores').select('school_name', 'year', 'score').eq('province', '天津').execute()
data = result.data

scores = [r['score'] for r in data]
print(f"总记录数: {len(data)}")
print(f"分数范围: {min(scores)} - {max(scores)}")

# 按分数区间统计
ranges = [(500, 550), (550, 600), (600, 650), (650, 700), (700, 750)]
for low, high in ranges:
    count = sum(1 for s in scores if low <= s < high)
    print(f"  {low}-{high}分: {count}条")

print("\n2. 600分附近的学校（585-615分）")
near_600 = [r for r in data if 585 <= r['score'] <= 615]
near_600.sort(key=lambda x: x['score'], reverse=True)
print(f"585-615分范围内的学校: {len(near_600)}所")
for r in near_600[:20]:
    print(f"  {r['school_name']}: {r['year']}年 {r['score']}分")

print("\n3. major_scores 表按学校聚合后的最低分")
all_major_data = []
page_size = 500
page = 0

while True:
    result = supabase.table('major_scores').select('*').eq('province', '天津').range(page * page_size, (page + 1) * page_size - 1).execute()
    data = result.data
    
    if not data or len(data) == 0:
        break
    
    all_major_data.extend(data)
    page += 1

school_min_scores = {}
for item in all_major_data:
    school_name = item.get('school_name', '')
    if not school_name:
        continue
    
    min_score = item.get('min_score')
    if min_score is not None and min_score >= 100:
        if school_name not in school_min_scores or min_score < school_min_scores[school_name]:
            school_min_scores[school_name] = min_score

school_scores_list = sorted(school_min_scores.items(), key=lambda x: -x[1])
print(f"按学校聚合后: {len(school_scores_list)}所学校")
print(f"分数范围: {min(school_min_scores.values())} - {max(school_min_scores.values())}")

print("\n600分附近的学校:")
near_600_schools = [s for s in school_scores_list if 585 <= s[1] <= 615]
print(f"585-615分范围内的学校: {len(near_600_schools)}所")
for school, score in near_600_schools:
    print(f"  {school}: {score}分")

print("\n" + "=" * 80)
print("结论")
print("=" * 80)
print(f"admission_scores表中585-615分有 {len([r for r in data if 585 <= r['score'] <= 615])}条记录")
print(f"major_scores按学校聚合后585-615分有 {len(near_600_schools)}所学校")
