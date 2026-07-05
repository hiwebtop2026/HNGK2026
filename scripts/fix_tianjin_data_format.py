# -*- coding: utf-8 -*-
"""
修复天津数据文件格式错误
"""
import json
import os
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")

def detect_wrong_format(data):
    if not isinstance(data, list) or len(data) == 0:
        return False
    first_item = data[0]
    keys = list(first_item.keys())
    has_wrong_year = any(str(year) in keys for year in ['2023', '2024', '2025'])
    lacks_correct_fields = 'school_name' not in keys or 'year' not in keys
    return has_wrong_year or lacks_correct_fields

def fix_data_format(data, school_name, year):
    fixed_data = []
    for item in data:
        fixed_item = {}
        for key, value in item.items():
            if str(key) in ['2023', '2024', '2025']:
                fixed_item['year'] = int(key)
            elif key == 'major_name':
                fixed_item['major_name'] = value
            elif key == 'major_group':
                fixed_item['major_group'] = value
            elif key == 'min_score':
                fixed_item['min_score'] = value
            elif key == 'min_rank':
                fixed_item['min_rank'] = value
            elif key == 'person_count':
                fixed_item['person_count'] = value
            elif key == 'batch':
                fixed_item['batch'] = value
            elif key == 'subject_requirement':
                fixed_item['subject_requirement'] = value
            elif key == 'province':
                fixed_item['province'] = value
            elif isinstance(key, str) and key.isalpha() and len(key) > 2:
                fixed_item['school_name'] = value
        if 'school_name' not in fixed_item:
            fixed_item['school_name'] = school_name
        if 'year' not in fixed_item:
            fixed_item['year'] = year
        if 'province' not in fixed_item:
            fixed_item['province'] = '天津'
        fixed_data.append(fixed_item)
    return fixed_data

def fix_all_files():
    json_files = sorted([f for f in os.listdir(DATA_DIR) if f.endswith('.json')])
    print(f"总文件数: {len(json_files)}")
    fixed_count = 0
    skipped_count = 0
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if not isinstance(data, list) or len(data) == 0:
                skipped_count += 1
                continue
            parts = filename.split('_')
            school_name = parts[0]
            year = int(parts[1])
            if detect_wrong_format(data):
                fixed_data = fix_data_format(data, school_name, year)
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(fixed_data, f, ensure_ascii=False, indent=2)
                print(f"✅ 已修复: {filename}")
                fixed_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"❌ 处理文件失败 {filename}: {e}")
            skipped_count += 1
    print(f"\n修复完成！")
    print(f"已修复文件数: {fixed_count}")
    print(f"跳过文件数: {skipped_count}")
    return fixed_count

def verify_fix():
    json_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    all_schools = set()
    all_records = []
    error_files = []
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, list):
                for item in data:
                    if 'school_name' in item:
                        all_schools.add(item['school_name'])
                    if 'min_score' in item and item['min_score'] is not None and item['min_score'] >= 100:
                        all_records.append(item)
                if detect_wrong_format(data):
                    error_files.append(filename)
        except Exception as e:
            error_files.append(filename)
    print(f"\n验证结果:")
    print(f"院校数: {len(all_schools)}")
    print(f"有效记录数(score>=100): {len(all_records)}")
    if error_files:
        print(f"仍有错误格式的文件数: {len(error_files)}")
    else:
        print("✅ 所有文件格式均已正确！")
    return all_records, all_schools

if __name__ == '__main__':
    print("=" * 70)
    print("天津数据文件格式修复工具")
    print("=" * 70)
    print("\n步骤1: 检测并修复错误格式的数据文件...")
    fix_all_files()
    print("\n步骤2: 验证修复结果...")
    verify_fix()
    print("\n" + "=" * 70)