# -*- coding: utf-8 -*-
"""
海南高考数据合并与导入工具
将采集到的各院校JSON数据合并为统一格式，并生成SQL导入脚本
"""

import json
import os
import re
from typing import List, Dict, Any

INPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_scores")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_major_scores_all.json")
SQL_FILE = os.path.join(os.path.dirname(__file__), "..", "import_hainan_major_scores.sql")

def load_all_json_files() -> List[Dict]:
    """加载所有院校JSON数据文件"""
    all_data = []
    
    if not os.path.exists(INPUT_DIR):
        print(f"❌ 输入目录不存在: {INPUT_DIR}")
        return []
    
    json_files = sorted([f for f in os.listdir(INPUT_DIR) if f.endswith(".json")])
    
    print(f"✅ 找到 {len(json_files)} 个JSON文件")
    
    for filename in json_files[:10]:
        filepath = os.path.join(INPUT_DIR, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
                all_data.extend(data)
                print(f"   加载: {filename} ({len(data)}条)")
        except Exception as e:
            print(f"   ❌ 加载失败: {filename} - {e}")
    
    if len(json_files) > 10:
        remaining = len(json_files) - 10
        for filename in json_files[10:]:
            filepath = os.path.join(INPUT_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    all_data.extend(data)
            except Exception:
                pass
        print(f"   ... 省略 {remaining} 个文件")
    
    return all_data

def remove_duplicates(data: List[Dict]) -> List[Dict]:
    """移除重复数据"""
    seen = {}
    result = []
    
    for item in data:
        key = (
            item.get("school_name", ""),
            item.get("year", 0),
            item.get("major_name", ""),
            item.get("min_score", 0),
            item.get("min_rank", 0)
        )
        if key not in seen:
            seen[key] = True
            result.append(item)
    
    return result

def analyze_data(data: List[Dict]):
    """统计分析数据"""
    year_stats = {}
    
    for item in data:
        year = item.get("year")
        if year is None:
            continue
        
        if year not in year_stats:
            year_stats[year] = {"count": 0, "schools": set()}
        
        year_stats[year]["count"] += 1
        year_stats[year]["schools"].add(item.get("school_name", ""))
    
    print("\n步骤3: 统计分析...")
    for year in sorted(year_stats.keys()):
        stats = year_stats[year]
        print(f"   {year}年: {stats['count']}条记录, {len(stats['schools'])}所院校")

def generate_sql(data: List[Dict]) -> str:
    """生成SQL导入脚本"""
    lines = []
    lines.append("-- ============================================")
    lines.append("-- 海南2023-2025年高考专业分数线数据导入")
    lines.append("-- 数据来源：夸克高考")
    lines.append("-- ============================================")
    lines.append("")
    lines.append("-- 第一步：清理旧的海南专业分数线数据（如有）")
    lines.append("DELETE FROM major_scores WHERE province = '海南';")
    lines.append("")
    lines.append("-- 第二步：批量插入海南专业分数线数据")
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
        
        row = f"""('{school_name_escaped}', '海南', {year}, '{major_name_escaped}', '{major_group_escaped}', 
                 {min_score}, {min_rank or 'NULL'}, {person_count or 'NULL'}, 
                 '{batch_escaped}', '{subject_requirement_escaped}')"""
        rows.append(row)
    
    lines.append(",\n".join(rows) + ";")
    
    lines.append("")
    lines.append("-- 第三步：验证数据")
    lines.append("SELECT province, year, COUNT(*) as records, MIN(min_score) as min_score, ")
    lines.append("MAX(min_score) as max_score FROM major_scores WHERE province = '海南' ")
    lines.append("GROUP BY province, year;")
    
    return "\n".join(lines)

def main():
    print("=" * 70)
    print("海南高考数据合并与导入工具")
    print("=" * 70)
    
    print("\n步骤1: 加载所有院校数据...")
    all_data = load_all_json_files()
    
    if not all_data:
        return
    
    print(f"\n✅ 共加载 {len(all_data)} 条记录")
    
    print("\n步骤2: 数据处理...")
    unique_data = remove_duplicates(all_data)
    print(f"✅ 去重后: {len(unique_data)} 条记录")
    
    analyze_data(unique_data)
    
    print("\n步骤4: 保存合并数据...")
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(unique_data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已保存: {OUTPUT_FILE}")
    
    print("\n步骤5: 生成SQL导入脚本...")
    sql_content = generate_sql(unique_data)
    with open(SQL_FILE, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"✅ 已生成: {SQL_FILE}")
    
    print("\n" + "=" * 70)
    print("完成！")
    print(f"总记录数: {len(unique_data)}")
    print(f"合并文件: {OUTPUT_FILE}")
    print(f"SQL脚本: {SQL_FILE}")
    print("\n下一步操作:")
    print("1. 在Supabase控制台SQL Editor中执行生成的SQL脚本")
    print("2. 验证数据导入结果")
    print("=" * 70)

if __name__ == "__main__":
    main()
