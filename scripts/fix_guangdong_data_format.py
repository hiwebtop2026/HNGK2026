# -*- coding: utf-8 -*-
"""
广东数据文件格式修复工具
修复错误的字段名（如"2023": 2023 → "year": 2023）
"""
import json
import os
import re

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'guangdong_scores')

def detect_wrong_format(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        if '"2023"' in content or '"2024"' in content or '"2025"' in content:
            return True
        if re.search(r'"202[3-5]":\s*202[3-5]', content):
            return True
        
        try:
            data = json.loads(content)
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if '2023' in first_item or '2024' in first_item or '2025' in first_item:
                    return True
                if 'school_name' not in first_item:
                    keys = list(first_item.keys())
                    if len(keys) > 0 and len(keys[0]) > 4 and not keys[0].startswith('min_'):
                        return True
        except:
            pass
        
        return False
    except:
        return False

def fix_data_format(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        fixed_content = content
        
        fixed_content = re.sub(r'"2023":\s*2023', '"year": 2023', fixed_content)
        fixed_content = re.sub(r'"2024":\s*2024', '"year": 2024', fixed_content)
        fixed_content = re.sub(r'"2025":\s*2025', '"year": 2025', fixed_content)
        
        data = json.loads(fixed_content)
        
        if isinstance(data, list):
            for item in data:
                if 'school_name' not in item:
                    for key in list(item.keys()):
                        if len(key) > 2 and not key.startswith('min_') and not key.startswith('major'):
                            item['school_name'] = item.pop(key)
                            break
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return True
    except Exception as e:
        print(f"  ❌ 修复失败: {e}")
        return False

def main():
    print("=" * 70)
    print("广东数据文件格式修复工具")
    print("=" * 70)
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ 数据目录不存在: {DATA_DIR}")
        return
    
    json_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    print(f"\n📁 找到 {len(json_files)} 个JSON文件")
    
    wrong_format_files = []
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        if detect_wrong_format(filepath):
            wrong_format_files.append(filename)
    
    print(f"\n⚠️ 发现 {len(wrong_format_files)} 个格式错误的文件")
    
    if wrong_format_files:
        print(f"\n开始修复...")
        fixed_count = 0
        for filename in wrong_format_files:
            filepath = os.path.join(DATA_DIR, filename)
            print(f"  修复: {filename}")
            if fix_data_format(filepath):
                fixed_count += 1
        
        print(f"\n✅ 修复完成！成功修复 {fixed_count} / {len(wrong_format_files)} 个文件")
    
    else:
        print("✅ 所有文件格式正确")
    
    total_records = 0
    school_count = 0
    schools = set()
    
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            if isinstance(data, list):
                total_records += len(data)
                for item in data:
                    school_name = item.get('school_name', '')
                    if school_name:
                        schools.add(school_name)
        except:
            pass
    
    print(f"\n📊 数据统计:")
    print(f"   总记录数: {total_records}")
    print(f"   院校数: {len(schools)}")
    print(f"   数据目录: {DATA_DIR}")

if __name__ == "__main__":
    main()