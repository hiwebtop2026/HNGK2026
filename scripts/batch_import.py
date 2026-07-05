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

input_file = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_major_scores_all_fixed.json")

with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

print(f'总记录数: {len(data)}')

print('\n步骤1: 删除旧的天津数据...')
result = supabase.table('major_scores').delete().eq('province', '天津').execute()
print(f'删除结果: OK')

print('\n步骤2: 批量插入新数据...')
batch_size = 50
total_inserted = 0
success_batches = 0
failed_batches = 0

valid_data = []
for item in data:
    min_score = item.get("min_score")
    if min_score is not None and min_score >= 100:
        valid_data.append(item)

print(f'有效记录数: {len(valid_data)}')

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
        print(f'  批次 {i//batch_size + 1:2d}/{(len(valid_data)-1)//batch_size + 1:2d}: 插入 {inserted:3d} 条')
    except Exception as e:
        failed_batches += 1
        print(f'  批次 {i//batch_size + 1:2d}/{(len(valid_data)-1)//batch_size + 1:2d}: 失败 - {e}')

print(f'\n步骤3: 验证数据...')
result = supabase.table('major_scores').select('*').eq('province', '天津').limit(1).execute()
print(f'第一条记录: {result.data[0] if result.data else "无"}')

result = supabase.table('major_scores').select('year, COUNT(*)').eq('province', '天津').group('year').execute()
print(f'按年份统计: {result.data}')

result = supabase.table('major_scores').select('COUNT(DISTINCT school_name)').eq('province', '天津').execute()
count = result.data[0]['COUNT(DISTINCT school_name)'] if result.data else 0
print(f'学校数: {count}')

print(f'\n✅ 导入完成！')
print(f'成功批次: {success_batches}')
print(f'失败批次: {failed_batches}')
print(f'总插入记录数: {total_inserted}')
