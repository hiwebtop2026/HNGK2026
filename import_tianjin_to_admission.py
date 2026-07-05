import json
from supabase import create_client, Client

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("天津数据导入 admission_scores 表")
print("=" * 80)

print("\n步骤1: 检查 admission_scores 表结构")
try:
    result = supabase.table('admission_scores').select('*').limit(1).execute()
    if result.data and len(result.data) > 0:
        sample = result.data[0]
        print(f"表字段: {list(sample.keys())}")
    else:
        print("admission_scores 表为空")
except Exception as e:
    print(f"查询失败: {e}")

print("\n步骤2: 检查 admission_scores 表中现有数据")
try:
    result = supabase.table('admission_scores').select('province', 'year').execute()
    data = result.data
    
    by_province_year = {}
    for r in data:
        province = r.get('province', '未知')
        year = r.get('year', 0)
        key = f"{province}_{year}"
        by_province_year[key] = by_province_year.get(key, 0) + 1
    
    print(f"现有记录数: {len(data)}")
    print(f"按省份和年份分布:")
    for key, count in sorted(by_province_year.items()):
        province, year = key.split('_')
        print(f"  {province} {year}年: {count}条")
except Exception as e:
    print(f"查询失败: {e}")

print("\n步骤3: 从 major_scores 表提取天津数据")
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

print(f"major_scores 表中天津数据: {len(all_major_data)} 条记录")

school_groups = {}
group_counter = 1

for item in all_major_data:
    school_name = item.get('school_name', '')
    major_group = item.get('major_group', '')
    year = item.get('year', 0)
    
    if not school_name:
        continue
    
    key = f"{school_name}_{major_group}"
    if key not in school_groups:
        group_code = f"TJT{group_counter:04d}"
        group_counter += 1
        
        school_groups[key] = {
            'school_name': school_name,
            'major_group': major_group,
            'subject_requirement': item.get('subject_requirement', ''),
            'batch': item.get('batch', ''),
            'scores': {},
            'school_code': item.get('school_code', ''),
            'group_code': group_code,
        }
    
    min_score = item.get('min_score')
    if min_score is not None and min_score >= 100:
        if year not in school_groups[key]['scores'] or min_score < school_groups[key]['scores'][year]:
            school_groups[key]['scores'][year] = min_score

print(f"按学校+专业组聚合后: {len(school_groups)} 个组合")

print("\n步骤4: 转换为 admission_scores 格式")
admission_records = []

for key, group in school_groups.items():
    for year, score in group['scores'].items():
        record = {
            'year': year,
            'group_code': group['group_code'],
            'group_name': group['major_group'][:50] if group['major_group'] else '普通类',
            'school_name': group['school_name'],
            'school_code': group['school_code'][:20] if group['school_code'] else '',
            'group_number': group['major_group'][:10] if group['major_group'] else '',
            'subject_requirement': group['subject_requirement'][:100] if group['subject_requirement'] else '',
            'score': score,
            'batch_type': group['batch'][:20] if group['batch'] else '本科批',
            'province': '天津',
        }
        admission_records.append(record)

print(f"生成 admission_scores 格式记录: {len(admission_records)} 条")

by_year = {}
for r in admission_records:
    year = r['year']
    by_year[year] = by_year.get(year, 0) + 1

print(f"按年份分布: {by_year}")

print("\n步骤5: 删除 admission_scores 表中已有的天津数据")
result = supabase.table('admission_scores').delete().eq('province', '天津').execute()
print("删除完成")

print("\n步骤6: 分批插入数据（每批50条）")
batch_size = 50
total_inserted = 0
success_batches = 0
failed_batches = 0

for i in range(0, len(admission_records), batch_size):
    batch = admission_records[i:i+batch_size]
    
    try:
        result = supabase.table('admission_scores').insert(batch).execute()
        inserted = len(result.data) if result.data else 0
        total_inserted += inserted
        success_batches += 1
        
        if (i // batch_size + 1) % 5 == 0:
            print(f'  批次 {i//batch_size + 1:2d}: 已插入 {total_inserted:4d} 条')
    except Exception as e:
        failed_batches += 1
        print(f'  批次 {i//batch_size + 1:2d}: 失败 - {e}')

print(f"\n步骤7: 验证导入结果")
result = supabase.table('admission_scores').select('*').eq('province', '天津').execute()
print(f"admission_scores 表中天津记录数: {len(result.data)}")

if result.data:
    by_year = {}
    schools = set()
    for r in result.data:
        year = r.get('year', 0)
        by_year[year] = by_year.get(year, 0) + 1
        schools.add(r.get('school_name', ''))
    
    print(f"按年份分布: {by_year}")
    print(f"学校数: {len(schools)}")

print("\n步骤8: 验证合并后的数据")
result = supabase.table('admission_scores').select('province', 'year').execute()
data = result.data

by_province_year = {}
for r in data:
    province = r.get('province', '未知')
    year = r.get('year', 0)
    key = f"{province}_{year}"
    by_province_year[key] = by_province_year.get(key, 0) + 1

print(f"\n合并后 admission_scores 表总记录数: {len(data)}")
print(f"按省份和年份分布:")
for key, count in sorted(by_province_year.items()):
    province, year = key.split('_')
    print(f"  {province} {year}年: {count}条")

print("\n" + "=" * 80)
print("导入完成！")
print(f"成功批次: {success_batches}, 失败批次: {failed_batches}")
print(f"总插入记录数: {total_inserted}")
print("=" * 80)
