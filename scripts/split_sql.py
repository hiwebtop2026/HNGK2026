import json
import os

input_file = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_major_scores_all_fixed.json")
output_dir = os.path.join(os.path.dirname(__file__), "..", "sql_batches")

os.makedirs(output_dir, exist_ok=True)

with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

valid_data = []
for item in data:
    min_score = item.get("min_score")
    if min_score is not None and min_score >= 100:
        valid_data.append(item)

print(f'总记录数: {len(data)}')
print(f'有效记录数: {len(valid_data)}')

batch_size = 200
total_batches = (len(valid_data) + batch_size - 1) // batch_size
print(f'批次数量: {total_batches}')

for batch_num in range(total_batches):
    start = batch_num * batch_size
    end = min((batch_num + 1) * batch_size, len(valid_data))
    batch = valid_data[start:end]
    
    lines = []
    lines.append(f"-- 天津数据导入 - 批次 {batch_num + 1}/{total_batches}")
    lines.append(f"-- 记录范围: {start + 1} - {end}")
    lines.append(f"-- 记录数: {len(batch)}")
    lines.append("")
    
    if batch_num == 0:
        lines.append("-- 清理旧数据（仅第一个批次执行）")
        lines.append("DELETE FROM major_scores WHERE province = '天津';")
        lines.append("")
    
    lines.append("INSERT INTO major_scores (school_name, province, year, major_name,")
    lines.append("                         major_group, min_score, min_rank, person_count,")
    lines.append("                         batch, subject_requirement)")
    lines.append("VALUES ")
    
    rows = []
    for item in batch:
        school_name = item.get("school_name", "").replace("'", "''")
        major_name = item.get("major_name", "").replace("'", "''")
        major_group = item.get("major_group", "").replace("'", "''")
        batch_name = item.get("batch", "").replace("'", "''")
        subject_requirement = item.get("subject_requirement", "").replace("'", "''")
        
        row = f"""('{school_name}', '天津', {item.get('year', 2025)}, '{major_name}', '{major_group}', 
                 {item.get('min_score')}, {item.get('min_rank') or 'NULL'}, {item.get('person_count') or 'NULL'}, 
                 '{batch_name}', '{subject_requirement}')"""
        rows.append(row)
    
    lines.append(",\n".join(rows) + ";")
    
    if batch_num == total_batches - 1:
        lines.append("")
        lines.append("-- 验证数据")
        lines.append("SELECT province, year, COUNT(*) as records FROM major_scores WHERE province = '天津' GROUP BY province, year;")
        lines.append("SELECT COUNT(DISTINCT school_name) as school_count FROM major_scores WHERE province = '天津';")
    
    output_file = os.path.join(output_dir, f"batch_{batch_num + 1:02d}.sql")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
    
    print(f'生成: {output_file} ({len(batch)}条记录)')

print(f'\n✅ 所有批次SQL文件已生成！')
print(f'目录: {output_dir}')
print(f'总批次: {total_batches}')
print(f'请在Supabase控制台依次执行这些SQL文件')
