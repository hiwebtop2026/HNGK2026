# -*- coding: utf-8 -*-
"""
天津高考数据合并与导入工具
将采集的各院校专业分数线JSON文件合并，并生成SQL导入脚本
同时支持直接通过Supabase API导入数据库
"""

import json
import os
import re
import sys
from typing import Dict, List, Any

INPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_major_scores_all.json")
SQL_FILE = os.path.join(os.path.dirname(__file__), "..", "import_tianjin_major_scores.sql")

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

MAJOR_SCORES_FIELDS = [
    "school_name", "province", "year", "major_name",
    "major_group", "min_score", "min_rank", "person_count",
    "batch", "major_description", "subject_requirement"
]

BATCH_SIZE = 500

def extract_school_name_from_item(item: Dict) -> str:
    if "school_name" in item:
        return str(item["school_name"]).strip()
    
    for key, value in item.items():
        if isinstance(key, str) and len(key) >= 2 and not key.isdigit():
            if key == value and key not in ["major_name", "major_group", "batch", "subject_requirement", "province", "major_description"]:
                return str(key).strip()
    
    return ""

def extract_year_from_item(item: Dict) -> int:
    if "year" in item:
        return int(item["year"])
    
    for key, value in item.items():
        if isinstance(key, str) and key.isdigit() and len(key) == 4:
            return int(key)
    
    return 2025

def sanitize_string(value: Any) -> str:
    if value is None:
        return ""
    result = str(value).strip()
    result = result.replace("'", "''")
    return result

def normalize_school_name(name: str) -> str:
    name = str(name).strip()
    name = re.sub(r'\([^)]*\)', '', name).strip()
    name = re.sub(r'院校$', '', name).strip()
    return name

def load_all_json_files() -> List[Dict]:
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
                count = 0
                for item in data:
                    if isinstance(item, dict):
                        school_name = extract_school_name_from_item(item)
                        year = extract_year_from_item(item)
                        
                        if school_name:
                            item["school_name"] = school_name
                        else:
                            match = re.match(r'^(.+?)_\d{4}_专业分数线\.json$', filename)
                            if match:
                                school_name = match.group(1)
                                item["school_name"] = school_name
                        
                        if "year" not in item or item.get("year") is None:
                            item["year"] = year
                        
                        if "province" not in item:
                            item["province"] = "天津"
                        
                        if "major_description" not in item:
                            item["major_description"] = ""
                        
                        if "major_group" not in item:
                            item["major_group"] = ""
                        
                        if "batch" not in item:
                            item["batch"] = "本科批"
                        
                        if "subject_requirement" not in item:
                            item["subject_requirement"] = ""
                        
                        all_data.append(item)
                        count += 1
                
                print(f"   加载: {filename} ({count}条)")
        except Exception as e:
            print(f"   ❌ 加载失败: {filename} - {e}")
    
    return all_data

def remove_duplicates(data: List[Dict]) -> List[Dict]:
    seen = {}
    result = []
    
    for item in data:
        school_name = item.get("school_name", "")
        year = item.get("year", 0)
        major_name = item.get("major_name", "")
        major_group = item.get("major_group", "")
        min_score = item.get("min_score", 0)
        
        key = (school_name, year, major_name, major_group, min_score)
        if key not in seen:
            seen[key] = True
            result.append(item)
    
    return result

def analyze_data(data: List[Dict]):
    year_stats = {}
    school_set = set()
    field_stats = {}
    
    for item in data:
        year = item.get("year")
        school_name = item.get("school_name", "")
        
        if year is None:
            continue
        
        if year not in year_stats:
            year_stats[year] = {"count": 0, "schools": set()}
        
        year_stats[year]["count"] += 1
        year_stats[year]["schools"].add(school_name)
        school_set.add(school_name)
        
        for field in MAJOR_SCORES_FIELDS:
            if field not in field_stats:
                field_stats[field] = {"has_data": 0, "empty": 0}
            val = item.get(field, "")
            if val and str(val).strip():
                field_stats[field]["has_data"] += 1
            else:
                field_stats[field]["empty"] += 1
    
    print("\n步骤3: 统计分析...")
    for year in sorted(year_stats.keys()):
        stats = year_stats[year]
        print(f"   {year}年: {stats['count']}条记录, {len(stats['schools'])}所院校")
    print(f"   总计: {len(school_set)}所院校")
    
    print("\n字段完整性统计:")
    for field in MAJOR_SCORES_FIELDS:
        stats = field_stats.get(field, {"has_data": 0, "empty": 0})
        total = stats["has_data"] + stats["empty"]
        if total > 0:
            rate = (stats["has_data"] / total) * 100
            print(f"   {field}: {stats['has_data']}条有数据 ({rate:.1f}%)")

def generate_sql(data: List[Dict]) -> str:
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
    lines.append("INSERT INTO major_scores (school_name, province, year, major_name,")
    lines.append("                         major_group, min_score, min_rank, person_count,")
    lines.append("                         batch, major_description, subject_requirement)")
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
        major_description = item.get("major_description", "")
        subject_requirement = item.get("subject_requirement", "")
        
        if not school_name:
            continue
        
        if min_score is None or min_score < 100:
            continue
        
        school_name_escaped = sanitize_string(school_name)
        major_name_escaped = sanitize_string(major_name)
        major_group_escaped = sanitize_string(major_group)
        batch_escaped = sanitize_string(batch)
        major_description_escaped = sanitize_string(major_description)
        subject_requirement_escaped = sanitize_string(subject_requirement)
        
        row = f"""('{school_name_escaped}', '天津', {year}, '{major_name_escaped}', 
                 '{major_group_escaped}', {min_score}, {min_rank or 'NULL'}, 
                 {person_count or 'NULL'}, '{batch_escaped}', 
                 '{major_description_escaped}', '{subject_requirement_escaped}')"""
        rows.append(row)
    
    lines.append(",\n".join(rows) + ";")
    
    lines.append("")
    lines.append("-- 第三步：验证数据")
    lines.append("SELECT province, year, COUNT(*) as records, MIN(min_score) as min_score, ")
    lines.append("MAX(min_score) as max_score FROM major_scores WHERE province = '天津' ")
    lines.append("GROUP BY province, year;")
    
    lines.append("")
    lines.append("-- 第四步：按学校统计")
    lines.append("SELECT school_name, COUNT(*) as majors FROM major_scores WHERE province = '天津' ")
    lines.append("GROUP BY school_name ORDER BY school_name LIMIT 20;")
    
    lines.append("")
    lines.append("-- 第五步：验证major_description字段")
    lines.append("SELECT COUNT(*) as total_with_description FROM major_scores ")
    lines.append("WHERE province = '天津' AND major_description IS NOT NULL AND major_description != '';")
    
    return "\n".join(lines)

def import_to_supabase(data: List[Dict]) -> bool:
    try:
        from supabase import create_client, Client
    except ImportError:
        print("⏳ 正在安装supabase客户端...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "supabase", "-q"])
        from supabase import create_client, Client
    
    print("\n⏳ 连接Supabase数据库...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    try:
        result = supabase.table('major_scores').select('id').limit(1).execute()
        print("✅ Supabase连接成功")
    except Exception as e:
        print(f"❌ Supabase连接失败: {e}")
        return False
    
    print("\n⏳ 清理旧的天津数据...")
    try:
        supabase.table('major_scores').delete().eq('province', '天津').execute()
        print("✅ 旧数据清理完成")
    except Exception as e:
        print(f"❌ 清理失败: {e}")
        return False
    
    print(f"\n⏳ 分批导入数据 ({BATCH_SIZE}条/批)...")
    total_imported = 0
    total_batches = (len(data) + BATCH_SIZE - 1) // BATCH_SIZE
    
    for i in range(total_batches):
        start = i * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(data))
        batch_data = data[start:end]
        
        rows_to_insert = []
        for item in batch_data:
            school_name = item.get("school_name", "")
            year = item.get("year", 2025)
            major_name = item.get("major_name", "")
            major_group = item.get("major_group", "")
            min_score = item.get("min_score")
            min_rank = item.get("min_rank")
            person_count = item.get("person_count")
            batch = item.get("batch", "")
            major_description = item.get("major_description", "")
            subject_requirement = item.get("subject_requirement", "")
            
            if not school_name or min_score is None or min_score < 100:
                continue
            
            row = {
                "school_name": school_name,
                "province": "天津",
                "year": year,
                "major_name": major_name,
                "major_group": major_group,
                "min_score": min_score,
                "min_rank": min_rank,
                "person_count": person_count,
                "batch": batch,
                "major_description": major_description,
                "subject_requirement": subject_requirement
            }
            rows_to_insert.append(row)
        
        if rows_to_insert:
            try:
                result = supabase.table('major_scores').insert(rows_to_insert).execute()
                imported = len(result.data) if result.data else len(rows_to_insert)
                total_imported += imported
                print(f"   批{i+1}/{total_batches}: 导入 {imported} 条")
            except Exception as e:
                print(f"   ❌ 批{i+1}导入失败: {e}")
                return False
    
    print(f"\n✅ 数据导入完成，共导入 {total_imported} 条记录")
    
    print("\n⏳ 验证导入结果...")
    result = supabase.table('major_scores').select('province', 'year').eq('province', '天津').execute()
    if result.data:
        year_counts = {}
        for row in result.data:
            year = row['year']
            year_counts[year] = year_counts.get(year, 0) + 1
        print("验证结果:")
        for year in sorted(year_counts.keys()):
            print(f"   天津 {year}年: {year_counts[year]}条")
        
        print(f"   school_name非空记录: {len(result.data)}条")
    
    return True

def main():
    print("=" * 70)
    print("天津高考数据合并与导入工具")
    print("=" * 70)
    
    print("\n步骤1: 加载所有院校数据...")
    all_data = load_all_json_files()
    
    if not all_data:
        return
    
    print(f"\n✅ 共加载 {len(all_data)} 条记录")
    
    print("\n步骤2: 数据去重...")
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
    
    print("\n步骤6: 直接导入Supabase数据库...")
    if import_to_supabase(unique_data):
        print("\n✅ 数据库导入成功！")
    else:
        print("\n❌ 数据库导入失败，请手动执行SQL脚本")
    
    print("\n" + "=" * 70)
    print("完成！")
    print(f"总记录数: {len(unique_data)}")
    print(f"合并文件: {OUTPUT_FILE}")
    print(f"SQL脚本: {SQL_FILE}")
    print("=" * 70)

if __name__ == "__main__":
    main()