import re
import os

sql_file = os.path.join(os.path.dirname(__file__), '..', 'import_tianjin_major_scores.sql')

with open(sql_file, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r", '', '天津'", ", '天津'", content)

with open(sql_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ 已移除所有VALUES中的school_code空字符串")
