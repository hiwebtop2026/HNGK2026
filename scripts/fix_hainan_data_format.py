# -*- coding: utf-8 -*-
"""
修复海南数据文件格式错误
将错误的字段名（如"2023": 2023）修正为正确的字段名（如"year": 2023）
"""
import json
import os
import re

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "hainan_scores")

def detect_wrong_format(data):
    """检测数据是否有错误格式"""
    if not isinstance(data, list) or len(data) == 0:
        return False
    
    first = data[0]
    keys = list(first.keys())
    
    if 'year' not in keys and ('2023' in keys or '2024' in keys or '2025' in keys):
        return True
    
    if 'school_name' not in keys:
        for key in keys:
            if not key.startswith('_') and key.isdigit():
                continue
            if key not in ['major_name', 'major_group', 'min_score', 'min_rank', 'person_count', 'batch', 'subject_requirement', 'province']:
                return True
    
    return False

def fix_data_format(data, school_name, year):
    """修复数据格式"""
    fixed = []
    
    for item in data:
        if not isinstance(item, dict):
            continue
        
        new_item = {}
        
        for key, value in item.items():
            if key in ['2023', '2024', '2025']:
                new_item['year'] = int(key)
            elif key in ['major_name', 'major_group', 'min_score', 'min_rank', 'person_count', 'batch', 'subject_requirement', 'province']:
                new_item[key] = value
            elif key.isdigit():
                continue
            elif key not in ['year', 'school_name']:
                if key == school_name:
                    new_item['school_name'] = value
                else:
                    if 'school_name' not in new_item:
                        new_item['school_name'] = school_name
        
        if 'year' not in new_item:
            new_item['year'] = year
        
        if 'school_name' not in new_item:
            new_item['school_name'] = school_name
        
        if 'province' not in new_item:
            new_item['province'] = '海南'
        
        fixed.append(new_item)
    
    return fixed

def fix_all_files():
    """修复所有文件"""
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith("_专业分数线.json"):
            continue
        
        filepath = os.path.join(DATA_DIR, filename)
        
        parts = filename.replace("_专业分数线.json", "").split("_")
        if len(parts) >= 2:
            try:
                year = int(parts[-1])
                school_name = "_".join(parts[:-1])
            except:
                continue
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if detect_wrong_format(data):
                fixed_data = fix_data_format(data, school_name, year)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(fixed_data, f, ensure_ascii=False, indent=2)
                
                print(f"✅ 已修复: {filename}")
                fixed_count += 1
            else:
                skipped_count += 1
                
        except Exception as e:
            print(f"❌ 处理失败 {filename}: {e}")
            error_count += 1
    
    return fixed_count, skipped_count, error_count

def verify_fix():
    """验证修复结果"""
    schools = set()
    valid_records = 0
    total_records = 0
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith("_专业分数线.json"):
            continue
        
        filepath = os.path.join(DATA_DIR, filename)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, list):
                for item in data:
                    school_name = item.get('school_name', '')
                    if school_name:
                        schools.add(school_name)
                    
                    total_records += 1
                    
                    if item.get('min_score') is not None and item.get('min_score') >= 100:
                        valid_records += 1
                        
        except Exception as e:
            print(f"❌ 验证失败 {filename}: {e}")
    
    print(f"\n验证结果:")
    print(f"院校数: {len(schools)}")
    print(f"有效记录数(score>=100): {valid_records}")
    print(f"总记录数: {total_records}")
    
    return len(schools), valid_records

def main():
    print("=" * 70)
    print("海南数据文件格式修复工具")
    print("=" * 70)
    
    print("\n步骤1: 检测并修复错误格式的数据文件...")
    total_files = len([f for f in os.listdir(DATA_DIR) if f.endswith("_专业分数线.json")])
    print(f"总文件数: {total_files}")
    
    fixed_count, skipped_count, error_count = fix_all_files()
    
    print(f"\n修复完成！")
    print(f"已修复文件数: {fixed_count}")
    print(f"跳过文件数: {skipped_count}")
    print(f"错误文件数: {error_count}")
    
    print("\n步骤2: 验证修复结果...")
    verify_fix()
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()