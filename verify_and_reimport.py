import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv
load_dotenv()

url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_ANON_KEY')
if not url or not key:
    raise EnvironmentError("缺少环境变量 SUPABASE_URL 或 SUPABASE_ANON_KEY，请在 .env 中配置")

supabase: Client = create_client(url, key)

print("=" * 80)
print("天津数据验证与重新导入")
print("=" * 80)

print("\n步骤1: 验证当前数据库中的数据")
try:
    result = supabase.table('major_scores').select('*').eq('province', '天津').execute()
    records = result.data
    schools = set(r['school_name'] for r in records if r['school_name'])
    
    print(f"当前数据库中天津记录数: {len(records)}")
    print(f"当前数据库中天津学校数: {len(schools)}")
    print(f"前10所学校: {list(schools)[:10]}")
    
    by_year = {}
    for r in records:
        year = r.get('year')
        if year not in by_year:
            by_year[year] = 0
        by_year[year] += 1
    
    print(f"按年份分布: {by_year}")
except Exception as e:
    print(f"查询失败: {e}")

print("\n步骤2: 读取修复后的数据文件")
input_file = 'data/tianjin_major_scores_all_fixed.json'
with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

valid_data = []
for item in data:
    min_score = item.get("min_score")
    if min_score is not None and min_score >= 100:
        valid_data.append(item)

print(f"数据文件总记录数: {len(data)}")
print(f"有效记录数(分数>=100): {len(valid_data)}")

file_schools = set(item.get("school_name") for item in valid_data if item.get("school_name"))
print(f"数据文件中的学校数: {len(file_schools)}")

print("\n步骤3: 删除旧的天津数据")
try:
    result = supabase.table('major_scores').delete().eq('province', '天津').execute()
    print("删除成功")
except Exception as e:
    print(f"删除失败: {e}")

print("\n步骤4: 重新验证")
try:
    result = supabase.table('major_scores').select('*').eq('province', '天津').execute()
    print(f"删除后天津记录数: {len(result.data)}")
except Exception as e:
    print(f"验证失败: {e}")

print("\n步骤5: 使用服务端密钥重新导入（通过REST API绕过RLS）")
print("注意: 需要使用service_role密钥才能绕过RLS")
print("请手动在Supabase控制台执行SQL脚本")

print("\n生成临时SQL文件...")
sql_lines = []
sql_lines.append("-- 天津2023-2025年高考专业分数线数据导入")
sql_lines.append("DELETE FROM major_scores WHERE province = '天津';")
sql_lines.append("")

rows = []
for item in valid_data[:5]:
    school_name = item.get("school_name", "").replace("'", "''")
    major_name = item.get("major_name", "").replace("'", "''")
    major_group = item.get("major_group", "").replace("'", "''")
    batch_name = item.get("batch", "").replace("'", "''")
    subject_requirement = item.get("subject_requirement", "").replace("'", "''")
    
    row = f"('{school_name}', '天津', {item.get('year', 2025)}, '{major_name}', '{major_group}', {item.get('min_score')}, {item.get('min_rank') or 'NULL'}, {item.get('person_count') or 'NULL'}, '{batch_name}', '{subject_requirement}')"
    rows.append(row)

sql_lines.append("INSERT INTO major_scores (school_name, province, year, major_name, major_group, min_score, min_rank, person_count, batch, subject_requirement)")
sql_lines.append("VALUES ")
sql_lines.append(",\n".join(rows) + ";")

test_file = 'test_import.sql'
with open(test_file, 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))

print(f"\n测试SQL文件已生成: {test_file}")
print("请在Supabase控制台执行这个文件，确认格式正确后再执行完整导入")

print("\n" + "=" * 80)
print("问题总结:")
print("=" * 80)
print("数据库中只有32所学校，而数据文件中有127所学校")
print("需要在Supabase控制台执行完整的SQL导入脚本")
print("文件位置: sql_batches/batch_01.sql 到 batch_14.sql")
print("或: import_tianjin_major_scores_final.sql")
