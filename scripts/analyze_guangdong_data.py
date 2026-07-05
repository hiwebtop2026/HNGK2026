# -*- coding: utf-8 -*-
"""
广东数据文件分析工具
检查每所院校实际有多少年的数据文件以及数据质量
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'guangdong_scores')

def analyze_school_data_files():
    schools = {}
    
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
            print(f"   - {school}: 文件年份{set(info['years'])}，有效年份{set(info['years_with_valid_data'])}")
    
    total_valid_records = sum(schools[s]['valid_records'] for s in schools)
    total_files = sum(len(schools[s]['files']) for s in schools)
    
    print(f"\n📈 总体数据质量:")
    print(f"   总文件数: {total_files}")
    print(f"   总记录数: {sum(schools[s]['total_records'] for s in schools)}")
    print(f"   有效记录数: {total_valid_records}")
    
    return schools

def main():
    print("=" * 70)
    print("广东高考数据文件分析工具")
    print("=" * 70)
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ 数据目录不存在: {DATA_DIR}")
        print("请先运行采集脚本生成数据")
        return
    
    analyze_school_data_files()
    
    print(f"\n📁 数据目录: {DATA_DIR}")

if __name__ == "__main__":
    main()