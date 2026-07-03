# -*- coding: utf-8 -*-
"""
海南高考数据导入脚本（生成SQL语句版本）
生成可在Supabase SQL编辑器中执行的INSERT语句
"""

import os
import sys
import re

def parse_school_data(ts_file_path):
    """解析schoolData.ts文件，逐行提取数据"""
    print(f'解析文件: {ts_file_path}')
    
    with open(ts_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    start = content.find('export const SCHOOL_DATA:')
    end = content.find('];', start)
    
    if start == -1 or end == -1:
        print('❌ 无法找到SCHOOL_DATA定义')
        return []
    
    array_content = content[start:end+2]
    pattern = r'\{\s*([^}]+)\s*\}'
    objects = re.findall(pattern, array_content)
    
    school_data = []
    
    for obj_content in objects:
        try:
            data = {}
            pairs = re.findall(r'(\w+)\s*:\s*(\'.*?\'|".*?"|\d+\.?\d*|null)', obj_content)
            
            for key, value in pairs:
                value = value.strip()
                
                if (value.startswith("'") and value.endswith("'")) or (value.startswith('"') and value.endswith('"')):
                    data[key] = value[1:-1]
                elif value == 'null':
                    data[key] = None
                elif value.replace('.', '').isdigit():
                    if '.' in value:
                        data[key] = float(value)
                    else:
                        data[key] = int(value)
                else:
                    data[key] = value
            
            school_data.append(data)
        except Exception as e:
            print(f'  ⚠️ 解析对象失败: {e}')
    
    print(f'✅ 解析完成，共 {len(school_data)} 条数据')
    return school_data

def generate_sql(school_data):
    """生成SQL INSERT语句"""
    sql_statements = []
    
    for school in school_data:
        group_name = school.get('name', '')
        group_code = str(school.get('code', ''))
        
        if not group_code or not group_name:
            continue
        
        for year in [2023, 2024, 2025]:
            score_key = f'score{year}'
            score = school.get(score_key)
            
            if score and score > 0:
                school_name = group_name.split('(')[0] if '(' in group_name else group_name
                group_number = group_code.split('-')[-1] if '-' in group_code else ''
                subject_requirement = str(school.get('subject', 0))
                
                # 转义单引号
                group_name_escaped = group_name.replace("'", "''")
                school_name_escaped = school_name.replace("'", "''")
                
                sql = f"INSERT INTO admission_scores (year, group_code, group_name, school_name, school_code, group_number, subject_requirement, score, plan_count, admission_count, batch_type, province) VALUES ({year}, '{group_code}', '{group_name_escaped}', '{school_name_escaped}', '', '{group_number}', '{subject_requirement}', {int(score)}, 0, 0, '本科批', '海南') ON CONFLICT (group_code, year) DO UPDATE SET score = EXCLUDED.score, group_name = EXCLUDED.group_name;"
                sql_statements.append(sql)
    
    return sql_statements

def main():
    print('='*60)
    print('🚀 生成海南高考数据SQL导入语句')
    print('='*60)
    
    ts_file_path = os.path.join(os.path.dirname(__file__), '../src/data/schoolData.ts')
    school_data = parse_school_data(ts_file_path)
    
    if not school_data:
        return
    
    sql_statements = generate_sql(school_data)
    print(f'\n生成 {len(sql_statements)} 条SQL语句')
    
    # 分批写入文件
    batch_size = 500
    total_batches = (len(sql_statements) // batch_size) + 1
    
    for i in range(0, len(sql_statements), batch_size):
        batch = sql_statements[i:i+batch_size]
        filename = f'hainan_data_batch_{i//batch_size + 1}.sql'
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write('\n'.join(batch))
        
        print(f'  已生成: {filename} ({len(batch)}条)')
    
    print('\n' + '='*60)
    print('✅ SQL文件生成完成！')
    print('='*60)
    print('\n导入步骤：')
    print('1. 登录 https://supabase.com/dashboard/project/jhcyqhtgtnomqvcdeeuo')
    print('2. 进入 SQL Editor')
    print('3. 逐个打开生成的hainan_data_batch_*.sql文件')
    print('4. 粘贴内容并点击 Run 执行')
    print('5. 执行完成后运行验证SQL：')
    print('   SELECT province, COUNT(*) FROM admission_scores GROUP BY province;')

if __name__ == '__main__':
    main()
