# -*- coding: utf-8 -*-
"""
分析海南数据文件情况
检查每所院校实际有多少年的数据文件，以及数据质量
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_scores")
SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_schools.json")

def analyze_school_data_files():
    schools = {}
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ 数据目录不存在: {DATA_DIR}")
        return schools
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith("_专业分数线.json"):
            continue
        
        parts = filename.replace("_专业分数线.json", "").split("_")
        if len(parts) >= 2:
            try:
                year = int(parts[-1])
                school_name = "_".join(parts[:-1])
                
                if school_name not in schools:
                    schools[school_name] = {
                        'years': [],
                        'files': [],
                        'has_valid_data': False,
                        'total_records': 0,
                        'valid_records': 0,
                        'years_with_valid_data': []
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
                    schools[school_name]['years_with_valid_data'].append(year)
            except:
                continue
    
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
    
    print(f"📊 数据文件分析结果:")
    print(f"   总院校数: {len(schools)}")
    print(f"   有3年数据的院校: {len(schools_with_3_years)}所")
    print(f"   有2年数据的院校: {len(schools_with_2_years)}所")
    print(f"   有1年数据的院校: {len(schools_with_1_year)}所")
    
    no_valid_data = [s for s in schools if not schools[s]['has_valid_data']]
    partial_data = [s for s in schools if schools[s]['has_valid_data'] and len(schools[s]['years_with_valid_data']) < len(set(schools[s]['years']))]
    full_data = [s for s in schools if schools[s]['has_valid_data'] and len(schools[s]['years_with_valid_data']) == len(set(schools[s]['years']))]
    
    print(f"   完全无有效数据的院校: {len(no_valid_data)}所")
    print(f"   部分年份有有效数据的院校: {len(partial_data)}所")
    print(f"   所有年份都有有效数据的院校: {len(full_data)}所")
    
    if no_valid_data:
        print(f"\n⚠️ 完全无有效数据的院校列表:")
        for school in sorted(no_valid_data):
            info = schools[school]
            print(f"   - {school}: {sorted(info['years'])}年 (文件数:{len(info['files'])})")
    
    if partial_data:
        print(f"\n⚠️ 部分年份有有效数据的院校列表:")
        for school in sorted(partial_data):
            info = schools[school]
            print(f"   - {school}: 有数据年份{sorted(info['years_with_valid_data'])}, 无数据年份{[y for y in sorted(info['years']) if y not in info['years_with_valid_data']]}")
    
    print(f"\n📋 各年份文件统计:")
    year_stats = {}
    for school, info in schools.items():
        for year in info['years']:
            if year not in year_stats:
                year_stats[year] = {'files': 0, 'records': 0, 'valid_records': 0}
            year_stats[year]['files'] += 1
            year_stats[year]['records'] += sum(len(json.load(open(os.path.join(DATA_DIR, f), 'r', encoding='utf-8'))) for f in info['files'] if str(year) in f)
    
    for year in sorted(year_stats.keys()):
        print(f"   {year}年: {year_stats[year]['files']}个文件, {year_stats[year]['records']}条记录")
    
    return schools

def check_schools_list():
    """检查院校列表文件"""
    if os.path.exists(SCHOOLS_FILE):
        with open(SCHOOLS_FILE, 'r', encoding='utf-8-sig') as f:
            schools = json.load(f)
        print(f"\n📋 院校列表文件: {len(schools)}所院校")
        return schools
    else:
        print(f"\n❌ 院校列表文件不存在: {SCHOOLS_FILE}")
        return []

def check_file_format():
    """检查文件格式是否一致"""
    if not os.path.exists(DATA_DIR):
        return
    
    sample_files = []
    for filename in os.listdir(DATA_DIR):
        if filename.endswith("_专业分数线.json"):
            sample_files.append(filename)
            if len(sample_files) >= 5:
                break
    
    print("\n🔍 文件格式检查:")
    for filename in sample_files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, list) and len(data) > 0:
                first = data[0]
                print(f"\n   {filename}:")
                print(f"     记录数: {len(data)}")
                print(f"     字段: {list(first.keys())}")
                print(f"     min_score值示例: {first.get('min_score')}")
                print(f"     school_name值示例: {first.get('school_name')}")
                print(f"     province值示例: {first.get('province')}")
        except Exception as e:
            print(f"\n   ❌ {filename}: 读取失败 - {e}")

def main():
    print("=" * 70)
    print("分析海南数据文件情况")
    print("=" * 70)
    
    print("\n步骤1: 分析数据文件...")
    schools_info = analyze_school_data_files()
    
    print("\n步骤2: 检查院校列表...")
    check_schools_list()
    
    print("\n步骤3: 检查文件格式...")
    check_file_format()
    
    print("\n" + "=" * 70)

if __name__ == '__main__':
    main()