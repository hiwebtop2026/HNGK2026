# -*- coding: utf-8 -*-
"""
将schoolData.ts中的海南高考投档分数线数据导入到Supabase数据库
"""

import os
import sys
import re

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client

def parse_school_data(ts_file):
    print(f'正在读取文件: {ts_file}')
    
    if not os.path.exists(ts_file):
        print(f'❌ 文件不存在: {ts_file}')
        return []
    
    with open(ts_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    data_pattern = r'{[^}]*}'
    matches = re.findall(data_pattern, content)
    
    records = []
    
    for match in matches:
        try:
            code_match = re.search(r"code:\s*['\"]([^'\"]+)['\"]", match)
            name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", match)
            subject_match = re.search(r"subject:\s*(\d+)", match)
            province_match = re.search(r"province:\s*['\"]([^'\"]+)['\"]", match)
            level_match = re.search(r"level:\s*['\"]([^'\"]+)['\"]", match)
            nature_match = re.search(r"nature:\s*['\"]([^'\"]+)['\"]", match)
            
            score2025_match = re.search(r"score2025:\s*([\d.]+|null)", match)
            score2024_match = re.search(r"score2024:\s*([\d.]+|null)", match)
            score2023_match = re.search(r"score2023:\s*([\d.]+|null)", match)
            
            if code_match and name_match:
                record = {
                    'code': code_match.group(1),
                    'name': name_match.group(1),
                    'subject': int(subject_match.group(1)) if subject_match else 0,
                    'province': province_match.group(1) if province_match else '其他',
                    'level': level_match.group(1) if level_match else '普通本科',
                    'nature': nature_match.group(1) if nature_match else '公办',
                    'score2025': float(score2025_match.group(1)) if score2025_match and score2025_match.group(1) != 'null' else None,
                    'score2024': float(score2024_match.group(1)) if score2024_match and score2024_match.group(1) != 'null' else None,
                    'score2023': float(score2023_match.group(1)) if score2023_match and score2023_match.group(1) != 'null' else None,
                }
                records.append(record)
        except Exception as e:
            print(f'  ⚠️ 解析失败: {e}')
            continue
    
    print(f'✅ 解析到 {len(records)} 条数据')
    
    return records

def extract_school_info(group_name):
    school_name = group_name
    group_number = None
    school_code = None
    
    group_match = re.search(r'\((\d+)\)$', group_name)
    if group_match:
        group_number = group_match.group(1)
        school_name = group_name[:group_match.start()].strip()
    
    return school_name, group_number, school_code

def import_to_supabase(records):
    print(f'\n连接Supabase数据库...')
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print('✅ 连接成功')
    except Exception as e:
        print(f'❌ 连接失败: {e}')
        return 0
    
    print('\n开始导入数据...')
    
    batch_size = 100
    total_inserted = 0
    total_errors = 0
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        db_records = []
        
        for record in batch:
            school_name, group_number, school_code = extract_school_info(record['name'])
            
            years_data = []
            if record['score2025']:
                years_data.append({
                    'year': 2025,
                    'group_code': record['code'],
                    'group_name': record['name'],
                    'school_name': school_name,
                    'school_code': school_code,
                    'group_number': group_number,
                    'subject_requirement': str(record['subject']),
                    'score': int(record['score2025']),
                    'batch_type': '本科普通批',
                    'province': '海南',
                })
            if record['score2024']:
                years_data.append({
                    'year': 2024,
                    'group_code': record['code'],
                    'group_name': record['name'],
                    'school_name': school_name,
                    'school_code': school_code,
                    'group_number': group_number,
                    'subject_requirement': str(record['subject']),
                    'score': int(record['score2024']),
                    'batch_type': '本科普通批',
                    'province': '海南',
                })
            if record['score2023']:
                years_data.append({
                    'year': 2023,
                    'group_code': record['code'],
                    'group_name': record['name'],
                    'school_name': school_name,
                    'school_code': school_code,
                    'group_number': group_number,
                    'subject_requirement': str(record['subject']),
                    'score': int(record['score2023']),
                    'batch_type': '本科普通批',
                    'province': '海南',
                })
            
            db_records.extend(years_data)
        
        try:
            result = supabase.table('admission_scores').upsert(db_records, on_conflict=['year', 'group_code']).execute()
            inserted = len(result.data) if result.data else 0
            total_inserted += inserted
            progress = min(i + batch_size, len(records)) / len(records) * 100
            print(f'  进度: {min(i + batch_size, len(records))}/{len(records)} ({progress:.1f}%) - 本批插入 {inserted} 条')
        except Exception as e:
            total_errors += 1
            print(f'  ❌ 第 {i//batch_size + 1} 批插入失败: {e}')
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  总记录数: {len(records)} 条')
    print(f'  成功插入: {total_inserted} 条')
    print(f'  失败批次: {total_errors}')
    print('='*60)
    
    return total_inserted

def main():
    print('='*60)
    print('📥 海南高考投档分数线数据导入工具')
    print('='*60)
    
    ts_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'data', 'schoolData.ts')
    
    if not os.path.exists(ts_file):
        print(f'❌ 文件不存在: {ts_file}')
        return
    
    records = parse_school_data(ts_file)
    
    if not records:
        print('❌ 未解析到数据')
        return
    
    print('\n数据预览:')
    for i, record in enumerate(records[:3]):
        print(f'  {i+1}. {record["name"]} - 2025:{record["score2025"]} 2024:{record["score2024"]} 2023:{record["score2023"]}')
    
    import_to_supabase(records)

if __name__ == '__main__':
    main()
