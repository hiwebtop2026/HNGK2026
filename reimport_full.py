import json
from supabase import create_client, Client

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("天津数据完整重新导入")
print("=" * 80)

print("\n步骤1: 检查数据文件")
input_file = 'data/tianjin_major_scores_all_fixed.json'
with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

valid_data = []
for item in data:
    min_score = item.get("min_score")
    if min_score is not None and min_score >= 100:
        valid_data.append(item)

print(f"文件总记录数: {len(data)}")
print(f"有效记录数(分数>=100): {len(valid_data)}")

file_schools = set(item.get("school_name") for item in valid_data if item.get("school_name"))
print(f"文件中的学校数: {len(file_schools)}")

by_year = {}
for item in valid_data:
    year = item.get("year")
    if year not in by_year:
        by_year[year] = 0
    by_year[year] += 1

print(f"按年份分布: {by_year}")

print("\n步骤2: 删除旧的天津数据")
supabase.table('major_scores').delete().eq('province', '天津').execute()
print("删除完成")

print("\n步骤3: 验证删除结果")
result = supabase.table('major_scores').select('*').eq('province', '天津').execute()
print(f"删除后记录数: {len(result.data)}")

print("\n步骤4: 分批插入数据（每批100条）")
batch_size = 100
total_inserted = 0
success_batches = 0
failed_batches = 0

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
    
    try:
        result = supabase.table('major_scores').insert(rows).execute()
        inserted = len(result.data) if result.data else 0
        total_inserted += inserted
        success_batches += 1
        
        if (i // batch_size + 1) % 5 == 0:
            print(f'  批次 {i//batch_size + 1:2d}: 已插入 {total_inserted:4d} 条')
    except Exception as e:
        failed_batches += 1
        print(f'  批次 {i//batch_size + 1:2d}: 失败 - {e}')

print(f"\n步骤5: 最终验证")
print(f"成功批次: {success_batches}")
print(f"失败批次: {failed_batches}")
print(f"总插入记录数: {total_inserted}")

print("\n验证数据库中的数据:")
all_records = []
page_size = 2000
page = 0

while True:
    result = supabase.table('major_scores').select('*').eq('province', '天津').range(page * page_size, (page + 1) * page_size - 1).execute()
    data = result.data
    
    if not data or len(data) == 0:
        break
    
    all_records.extend(data)
    page += 1

print(f"数据库中实际记录数: {len(all_records)}")

if all_records:
    schools = set(r['school_name'] for r in all_records if r['school_name'])
    print(f"数据库中的学校数: {len(schools)}")
    
    by_year = {}
    for r in all_records:
        year = r.get('year')
        if year not in by_year:
            by_year[year] = 0
        by_year[year] += 1
    
    print(f"按年份分布: {by_year}")

print("\n" + "=" * 80)
print("导入完成！")
print("=" * 80)
