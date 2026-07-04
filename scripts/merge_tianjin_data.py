# -*- coding: utf-8 -*-
"""
天津高考数据合并与导入工具
将采集的各院校专业分数线JSON文件合并，并生成SQL导入脚本
"""

import json
import os
import re
from typing import Dict, List, Any

INPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_major_scores_all.json")
SQL_FILE = os.path.join(os.path.dirname(__file__), "..", "import_tianjin_major_scores.sql")

SUBJECT_CODE_MAP = {
    "物理": 5,
    "化学": 6,
    "生物": 7,
    "历史": 8,
    "思想政治": 9,
    "政治": 9,
    "地理": 10,
}

def load_all_json_files() -> List[Dict]:
    """加载所有院校的JSON文件"""
    all_data = []
    
    if not os.path.exists(INPUT_DIR):
        print(f"❌ 输入目录不存在: {INPUT_DIR}")
        return []
    
    files = [f for f in os.listdir(INPUT_DIR) if f.endswith(".json")]
    
    if not files:
        print(f"❌ 未找到任何JSON文件")
        return []
    
    print(f"✅ 找到 {len(files)} 个JSON文件")
    
    for filename in sorted(files):
        filepath = os.path.join(INPUT_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    all_data.extend(data)
                    print(f"   加载: {filename} ({len(data)}条)")
        except Exception as e:
            print(f"   ❌ 加载失败: {filename} - {e}")
    
    return all_data

def normalize_school_name(name: str) -> str:
    """标准化院校名称"""
    name = str(name).strip()
    name = re.sub(r'\([^)]*\)', '', name).strip()
    name = re.sub(r'院校$', '', name).strip()
    return name

def parse_subject_requirement(requirement: str) -> int:
    """解析选科要求，转换为科目代码"""
    if not requirement or requirement.strip() == "":
        return 0
    
    req = requirement.strip()
    
    if "物理必选" in req or "首选物理" in req:
        return 54
    elif "历史必选" in req or "首选历史" in req:
        return 654
    
    has_physics = "物理" in req
    has_chemistry = "化学" in req
    has_biology = "生物" in req
    has_history = "历史" in req
    has_politics = "政治" in req or "思想政治" in req
    has_geography = "地理" in req
    
    code = 0
    if has_physics:
        code += 5
    if has_chemistry:
        code += 6
    if has_biology:
        code += 7
    if has_history:
        code += 8
    if has_politics:
        code += 9
    if has_geography:
        code += 10
    
    return code

def generate_sql(data: List[Dict]) -> str:
    """生成SQL导入脚本"""
    lines = []
    lines.append("-- ============================================")
    lines.append("-- 天津2023-2025年高考专业分数线数据导入")
    lines.append("-- 数据来源：夸克高考")
    lines.append("-- ============================================")
    lines.append("")
    lines.append("-- 第一步：清理旧的天津专业分数线数据（如有）")
    lines.append("DELETE FROM major_scores WHERE province = '天津';")
    lines.append("")
    lines.append("-- 第二步：批量插入天津专业分数线数据")
    lines.append("INSERT INTO major_scores (school_name, school_code, province, year, major_name,")
    lines.append("                         major_group, min_score, min_rank, person_count,")
    lines.append("                         batch, subject_requirement, level)")
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
        
        level = "普通本科"
        if "985" in school_name or "清华" in school_name or "北大" in school_name:
            level = "985"
        elif "211" in school_name or "双一流" in school_name:
            level = "211"
        
        row = f"""('{school_name_escaped}', '', '天津', {year}, '{major_name_escaped}', '{major_group_escaped}', 
                 {min_score}, {min_rank or 'NULL'}, {person_count or 'NULL'}, 
                 '{batch_escaped}', '{subject_requirement_escaped}', '{level}')"""
        rows.append(row)
    
    lines.append(",\n".join(rows) + ";")
    
    lines.append("")
    lines.append("-- 第三步：验证数据")
    lines.append("SELECT province, year, COUNT(*) as records, MIN(min_score) as min_score, ")
    lines.append("MAX(min_score) as max_score FROM major_scores WHERE province = '天津' ")
    lines.append("GROUP BY province, year;")
    
    return "\n".join(lines)

def main():
    print("=" * 70)
    print("天津高考数据合并与导入工具")
    print("=" * 70)
    
    print("\n步骤1: 加载所有院校数据...")
    all_data = load_all_json_files()
    
    if not all_data:
        return
    
    print(f"\n✅ 共加载 {len(all_data)} 条记录")
    
    print("\n步骤2: 数据处理...")
    
    seen_keys = set()
    cleaned_data = []
    
    for item in all_data:
        key = f"{item.get('school_name')}|{item.get('year')}|{item.get('major_name')}|{item.get('min_score')}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        
        cleaned_data.append(item)
    
    print(f"✅ 去重后: {len(cleaned_data)} 条记录")
    
    print("\n步骤3: 统计分析...")
    
    year_stats = {}
    for item in cleaned_data:
        year = item.get("year")
        if year is None:
            continue
        if year not in year_stats:
            year_stats[year] = {"count": 0, "schools": set()}
        year_stats[year]["count"] += 1
        year_stats[year]["schools"].add(item.get("school_name"))
    
    for year in sorted(year_stats.keys()):
        stats = year_stats[year]
        print(f"   {year}年: {stats['count']}条记录, {len(stats['schools'])}所院校")
    
    print("\n步骤4: 保存合并数据...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已保存: {OUTPUT_FILE}")
    
    print("\n步骤5: 生成SQL导入脚本...")
    sql_content = generate_sql(cleaned_data)
    with open(SQL_FILE, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"✅ 已生成: {SQL_FILE}")
    
    print("\n" + "=" * 70)
    print("完成！")
    print(f"总记录数: {len(cleaned_data)}")
    print(f"合并文件: {OUTPUT_FILE}")
    print(f"SQL脚本: {SQL_FILE}")
    print("\n下一步操作:")
    print("1. 在Supabase控制台SQL Editor中执行生成的SQL脚本")
    print("2. 验证数据导入结果")
    print("=" * 70)

if __name__ == "__main__":
    main()
