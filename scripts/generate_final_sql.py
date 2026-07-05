import json
import os

input_file = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_major_scores_all_fixed.json")
sql_file = os.path.join(os.path.dirname(__file__), "..", "import_tianjin_major_scores_final.sql")

with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

lines = []
lines.append("-- ============================================")
lines.append("-- 天津2023-2025年高考专业分数线数据导入（最终版）")
lines.append("-- 修复内容：修复820条特殊格式记录")
lines.append(f"-- 总记录数: {len(data)}条")
lines.append("-- ============================================")
lines.append("")
lines.append("-- 第一步：清理旧的天津专业分数线数据")
lines.append("DELETE FROM major_scores WHERE province = '天津';")
lines.append("")
lines.append("-- 第二步：批量插入天津专业分数线数据")
lines.append("INSERT INTO major_scores (school_name, province, year, major_name,")
lines.append("                         major_group, min_score, min_rank, person_count,")
lines.append("                         batch, subject_requirement)")
lines.append("VALUES ")

rows = []
for item in data:
    school_name = item.get("school_name", "")
    year = item.get("year", 2025)
    major_name = item.get("major_name", "")
    major_group = item.get("major_group", "")
    min_score = item.get("min_score")
    min_rank = item.get("min_rank")
    person_count = item.get("person_count")
    batch = item.get("batch", "")
    subject_requirement = item.get("subject_requirement", "")
    
    if min_score is None or min_score < 100:
        continue
    
    school_name_escaped = school_name.replace("'", "''")
    major_name_escaped = major_name.replace("'", "''")
    major_group_escaped = major_group.replace("'", "''")
    batch_escaped = batch.replace("'", "''")
    subject_requirement_escaped = subject_requirement.replace("'", "''")
    
    row = f"""('{school_name_escaped}', '天津', {year}, '{major_name_escaped}', '{major_group_escaped}', 
                 {min_score}, {min_rank or 'NULL'}, {person_count or 'NULL'}, 
                 '{batch_escaped}', '{subject_requirement_escaped}')"""
    rows.append(row)

lines.append(",\n".join(rows) + ";")

lines.append("")
lines.append("-- 第三步：验证数据")
lines.append("SELECT province, year, COUNT(*) as records, MIN(min_score) as min_score, ")
lines.append("MAX(min_score) as max_score FROM major_scores WHERE province = '天津' ")
lines.append("GROUP BY province, year;")

lines.append("")
lines.append("-- 第四步：统计学校数")
lines.append("SELECT COUNT(DISTINCT school_name) as school_count FROM major_scores WHERE province = '天津';")

lines.append("")
lines.append("-- 第五步：查看前10所学校")
lines.append("SELECT DISTINCT school_name FROM major_scores WHERE province = '天津' ORDER BY school_name LIMIT 10;")

with open(sql_file, 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print(f"✅ SQL脚本已生成: {sql_file}")
print(f"总记录数: {len(rows)}")

schools = set(item.get("school_name") for item in data if item.get("school_name"))
print(f"学校数: {len(schools)}")

by_year = {}
for d in data:
    year = d.get("year")
    if year not in by_year:
        by_year[year] = {"count": 0, "schools": set()}
    by_year[year]["count"] += 1
    if d.get("school_name"):
        by_year[year]["schools"].add(d.get("school_name"))

for year in sorted(by_year.keys()):
    print(f"{year}年: {by_year[year]['count']}条记录, {len(by_year[year]['schools'])}所学校")
