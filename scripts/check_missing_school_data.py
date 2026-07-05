# -*- coding: utf-8 -*-
"""
检查缺失院校的数据情况
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")

MISSING_SCHOOLS = [
    '中南大学', '中南财经政法大学', '中国地质大学', '中山大学', '兰州大学',
    '北京交通大学', '北京化工大学', '北京协和医学院', '北京林业大学', '北京科技大学',
    '北京语言大学', '北京邮电大学', '华中农业大学', '华中师范大学', '华中科技大学',
    '南开大学', '四川农业大学', '四川大学', '天津中医药大学', '天津医科大学',
    '天津大学', '天津工业大学', '天津师范大学', '天津理工大学', '天津科技大学',
    '天津财经大学', '暨南大学', '武汉大学', '武汉理工大学', '河北工业大学',
    '湖南大学', '电子科技大学', '西北农林科技大学', '西北工业大学', '西南交通大学',
    '西南大学', '西南财经大学', '西安交通大学', '西安电子科技大学', '重庆大学', '长安大学'
]

def check_school_data():
    schools_with_some_data = []
    schools_with_no_data = []
    
    for school in MISSING_SCHOOLS:
        has_valid_data = False
        years_with_data = []
        
        for year in [2023, 2024, 2025]:
            filename = f"{school}_{year}_专业分数线.json"
            filepath = os.path.join(DATA_DIR, filename)
            
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    if isinstance(data, list):
                        valid_records = [r for r in data if r.get('min_score') is not None and r['min_score'] >= 100]
                        if len(valid_records) > 0:
                            has_valid_data = True
                            years_with_data.append(year)
                except Exception as e:
                    pass
        
        if has_valid_data:
            schools_with_some_data.append((school, years_with_data))
        else:
            schools_with_no_data.append(school)
    
    print(f"有部分有效数据的院校: {len(schools_with_some_data)}所")
    if schools_with_some_data:
        for school, years in schools_with_some_data:
            print(f"  {school}: {years}年有数据")
    
    print(f"\n完全无有效数据的院校: {len(schools_with_no_data)}所")
    if schools_with_no_data:
        for school in schools_with_no_data:
            print(f"  {school}")
    
    return schools_with_some_data, schools_with_no_data

def check_file_format():
    """检查文件格式是否一致"""
    for school in MISSING_SCHOOLS[:3]:
        for year in [2023, 2024, 2025]:
            filename = f"{school}_{year}_专业分数线.json"
            filepath = os.path.join(DATA_DIR, filename)
            
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if isinstance(data, list) and len(data) > 0:
                    first = data[0]
                    print(f"\n{school} {year}年文件结构:")
                    print(f"  记录数: {len(data)}")
                    print(f"  字段: {list(first.keys())}")
                    print(f"  min_score值示例: {first.get('min_score')}")
                    print(f"  person_count值示例: {first.get('person_count')}")
                break

if __name__ == '__main__':
    print("=" * 70)
    print("检查缺失院校数据情况")
    print("=" * 70)
    
    print("\n步骤1: 检查哪些院校有部分数据...")
    schools_with_data, schools_no_data = check_school_data()
    
    print("\n步骤2: 检查文件格式...")
    check_file_format()
    
    print("\n" + "=" * 70)