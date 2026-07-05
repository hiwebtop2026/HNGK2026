# -*- coding: utf-8 -*-
"""
分析每所院校实际有多少年的数据文件
"""
import os
import json

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")

def analyze_school_data_files():
    schools = {}
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith("_专业分数线.json"):
            continue
        
        parts = filename.replace("_专业分数线.json", "").split("_")
        if len(parts) >= 2:
            year = int(parts[-1])
            school_name = "_".join(parts[:-1])
            
            if school_name not in schools:
                schools[school_name] = {
                    'years': [],
                    'files': [],
                    'has_valid_data': False,
                    'total_records': 0,
                    'valid_records': 0
                }
            
            schools[school_name]['years'].append(year)
            schools[school_name]['files'].append(filename)
            
            filepath = os.path.join(DATA_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            schools[school_name]['total_records'] += len(data)
            
            valid = [r for r in data if r.get('min_score') is not None and r['min_score'] >= 100]
            schools[school_name]['valid_records'] += len(valid)
            if len(valid) > 0:
                schools[school_name]['has_valid_data'] = True
    
    schools_with_1_year = []
    schools_with_2_years = []
    schools_with_3_years = []
    
    for school_name, info in schools.items():
        year_count = len(set(info['years']))
        if year_count == 1:
            schools_with_1_year.append((school_name, sorted(info['years'])))
        elif year_count == 2:
            schools_with_2_years.append((school_name, sorted(info['years'])))
        else:
            schools_with_3_years.append((school_name, sorted(info['years'])))
    
    print(f"总院校数: {len(schools)}")
    print(f"有3年数据的院校: {len(schools_with_3_years)}所")
    print(f"有2年数据的院校: {len(schools_with_2_years)}所")
    print(f"有1年数据的院校: {len(schools_with_1_year)}所")
    
    print(f"\n=== 有3年数据的院校 ===")
    for school, years in sorted(schools_with_3_years):
        info = schools[school]
        status = "✅" if info['has_valid_data'] else "❌"
        print(f"  {status} {school}: {years}年 (记录:{info['total_records']},有效:{info['valid_records']})")
    
    print(f"\n=== 有2年数据的院校 ===")
    for school, years in sorted(schools_with_2_years):
        info = schools[school]
        status = "✅" if info['has_valid_data'] else "❌"
        print(f"  {status} {school}: {years}年 (记录:{info['total_records']},有效:{info['valid_records']})")
    
    print(f"\n=== 有1年数据的院校 ===")
    for school, years in sorted(schools_with_1_year):
        info = schools[school]
        status = "✅" if info['has_valid_data'] else "❌"
        print(f"  {status} {school}: {years}年 (记录:{info['total_records']},有效:{info['valid_records']})")
    
    no_valid_data = [s for s in schools if not schools[s]['has_valid_data']]
    print(f"\n=== 完全无有效数据的院校 ({len(no_valid_data)}所) ===")
    for school in sorted(no_valid_data):
        info = schools[school]
        print(f"  {school}: {sorted(info['years'])}年 (文件数:{len(info['files'])})")
    
    return schools

if __name__ == '__main__':
    print("=" * 70)
    print("分析每所院校的数据文件情况")
    print("=" * 70)
    analyze_school_data_files()
    print("\n" + "=" * 70)