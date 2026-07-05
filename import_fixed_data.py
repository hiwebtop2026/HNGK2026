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

input_file = 'data/tianjin_major_scores_all_fixed.json'

with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

print(f'总记录数: {len(data)}')

print('\n步骤1: 删除旧的天津数据...')
result = supabase.table('major_scores').delete().eq('province', '天津').execute()
print(f'删除结果: {result.data}')

print('\n步骤2: 批量插入新数据...')
batch_size = 100
total_inserted = 0

for i in range(0, len(data), batch_size):
    batch = data[i:i+batch_size]
    
    rows = []
    for item in batch:
        school_name = item.get("school_name", "")
        year = item.get("year", 2025)
        major_name = item.get("major_name", "")
        major_group = item.get("major_group", "")
        min_score = item.get("min_score")
        min_rank = item.get("min_rank")
        person_count = item.get("person_count")
        batch_name = item.get("batch", "")
        subject_requirement = item.get("subject_requirement", "")
        
        if min_score is None or min_score < 100:
            continue
        
        rows.append({
            'school_name': school_name,
            'province': '天津',
            'year': year,
            'major_name': major_name,
            'major_group': major_group,
            'min_score': min_score,
            'min_rank': min_rank,
            'person_count': person_count,
            'batch': batch_name,
            'subject_requirement': subject_requirement,
        })
    
    if rows:
        try:
            result = supabase.table('major_scores').insert(rows).execute()
            inserted = len(result.data) if result.data else 0
            total_inserted += inserted
            print(f'  批次 {i//batch_size + 1}: 插入 {inserted} 条')
        except Exception as e:
            print(f'  批次 {i//batch_size + 1}: 失败 - {e}')

print(f'\n步骤3: 验证数据...')
result = supabase.table('major_scores').select('province, year, COUNT(*) as records').eq('province', '天津').group('province, year').execute()
print(f'按年份统计: {result.data}')

result = supabase.table('major_scores').select('COUNT(DISTINCT school_name) as school_count').eq('province', '天津').execute()
print(f'学校数: {result.data}')

print(f'\n✅ 导入完成！')
print(f'总插入记录数: {total_inserted}')
