import json
from supabase import create_client, Client

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("使用更小分页验证所有数据")
print("=" * 80)

print("\n1. 使用page_size=500分页查询")
all_data = []
page_size = 500
page = 0

while True:
    start = page * page_size
    end = (page + 1) * page_size - 1
    
    result = supabase.table('major_scores').select('*').eq('province', '天津').order('id').range(start, end).execute()
    data = result.data
    
    if not data or len(data) == 0:
        break
    
    all_data.extend(data)
    print(f"  页面 {page + 1}: 范围 [{start}-{end}], 获取 {len(data)} 条记录")
    
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

print("\n2. 检查是否有重复记录")
seen = set()
duplicates = []
for r in all_data:
    key = f"{r['school_name']}|{r['year']}|{r['major_name']}|{r['min_score']}"
    if key in seen:
        duplicates.append(r)
    seen.add(key)

print(f"重复记录数: {len(duplicates)}")

print("\n3. 检查数据文件和数据库的差异")
input_file = 'data/tianjin_major_scores_all_fixed.json'
with open(input_file, encoding='utf-8') as f:
    file_data = json.load(f)

valid_file_data = []
for item in file_data:
    min_score = item.get("min_score")
    if min_score is not None and min_score >= 100:
        valid_file_data.append(item)

file_schools = set(item.get("school_name") for item in valid_file_data if item.get("school_name"))
db_schools = set(r['school_name'] for r in all_data if r['school_name'])

print(f"\n文件中的学校: {len(file_schools)}")
print(f"数据库中的学校: {len(db_schools)}")

missing_in_db = file_schools - db_schools
print(f"\n文件中有但数据库中没有的学校: {len(missing_in_db)}")
if missing_in_db:
    print(f"  {sorted(missing_in_db)[:20]}")

extra_in_db = db_schools - file_schools
print(f"\n数据库中有但文件中没有的学校: {len(extra_in_db)}")
if extra_in_db:
    print(f"  {sorted(extra_in_db)[:20]}")

print("\n" + "=" * 80)
print("结论")
print("=" * 80)
print(f"数据库中实际有 {len(all_data)} 条记录, {len(db_schools)} 所学校")
print(f"数据文件中有 {len(valid_file_data)} 条记录, {len(file_schools)} 所学校")
print(f"缺失 {len(missing_in_db)} 所学校")
