import re
import os

sql_file = os.path.join(os.path.dirname(__file__), '..', 'import_tianjin_major_scores.sql')

with open(sql_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    if "INSERT INTO major_scores" in line:
        new_lines.append("INSERT INTO major_scores (school_name, province, year, major_name,\n")
        new_lines.append("                         major_group, min_score, min_rank, person_count,\n")
        new_lines.append("                         batch, subject_requirement)\n")
        i += 3
        continue
    
    if "VALUES" in line:
        new_lines.append(line)
        i += 1
        continue
    
    if line.strip().startswith("(") and line.strip().endswith("),"):
        parts = line.strip().strip("(),").split(",")
        if len(parts) >= 10:
            new_parts = parts[:10]
            new_line = "(" + ",".join(new_parts) + "),\n"
            new_lines.append(new_line)
        else:
            new_lines.append(line)
        i += 1
        continue
    
    new_lines.append(line)
    i += 1

with open(sql_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ 已修复SQL文件")
