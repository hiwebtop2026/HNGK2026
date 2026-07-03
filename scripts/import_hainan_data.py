# -*- coding: utf-8 -*-
"""
海南高考数据导入脚本
将本地schoolData.ts中的数据导入到Supabase数据库
"""

import os
import sys
import re

# Supabase配置
SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
# 使用服务端密钥进行数据写入（需要用户提供正确的服务端密钥）
SUPABASE_SERVICE_KEY = ''

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client

def parse_school_data(ts_file_path):
    """解析schoolData.ts文件，逐行提取数据"""
    print(f'解析文件: {ts_file_path}')
    
    with open(ts_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取数组内容
    start = content.find('export const SCHOOL_DATA:')
    end = content.find('];', start)
    
    if start == -1 or end == -1:
        print('❌ 无法找到SCHOOL_DATA定义')
        return []
    
    array_content = content[start:end+2]
    
    # 提取每个对象
    pattern = r'\{\s*([^}]+)\s*\}'
    objects = re.findall(pattern, array_content)
    
    school_data = []
    
    for obj_content in objects:
        try:
            data = {}
            
            # 提取键值对
            # 匹配: key: value 格式，value可以是字符串、数字或null
            pairs = re.findall(r'(\w+)\s*:\s*(\'.*?\'|".*?"|\d+\.?\d*|null)', obj_content)
            
            for key, value in pairs:
                value = value.strip()
                
                # 处理字符串（单引号或双引号）
                if (value.startswith("'") and value.endswith("'")) or (value.startswith('"') and value.endswith('"')):
                    data[key] = value[1:-1]
                # 处理null
                elif value == 'null':
                    data[key] = None
                # 处理数字
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

def import_hainan_data():
    print('='*60)
    print('🚀 海南高考数据导入')
    print('='*60)
    
    # 连接数据库
    print('\n连接数据库...')
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print('✅ 连接成功')
    
    # 解析本地数据
    ts_file_path = os.path.join(os.path.dirname(__file__), '../src/data/schoolData.ts')
    school_data = parse_school_data(ts_file_path)
    
    if not school_data:
        print('❌ 没有数据可导入')
        return
    
    # 准备导入数据
    admission_records = []
    
    for school in school_data:
        group_name = school.get('name', '')
        group_code = str(school.get('code', ''))
        
        if not group_code or not group_name:
            continue
        
        # 创建三年数据记录
        for year in [2023, 2024, 2025]:
            score_key = f'score{year}'
            score = school.get(score_key)
            
            if score and score > 0:
                admission_records.append({
                    'year': year,
                    'group_code': group_code,
                    'group_name': group_name,
                    'school_name': group_name.split('(')[0] if '(' in group_name else group_name,
                    'school_code': '',
                    'group_number': group_code.split('-')[-1] if '-' in group_code else '',
                    'subject_requirement': str(school.get('subject', 0)),
                    'score': int(score),
                    'plan_count': 0,
                    'admission_count': 0,
                    'batch_type': '本科批',
                    'province': '海南'
                })
    
    print(f'\n准备导入 {len(admission_records)} 条录取分数线记录')
    
    # 分批导入
    batch_size = 100
    total_imported = 0
    
    for i in range(0, len(admission_records), batch_size):
        batch = admission_records[i:i+batch_size]
        
        try:
            response = supabase.from_('admission_scores').upsert(batch, on_conflict='group_code,year').execute()
            
            if response.data:
                imported = len(response.data)
                total_imported += imported
                print(f'  批次 {i//batch_size + 1}: 导入 {imported} 条')
            else:
                print(f'  批次 {i//batch_size + 1}: 导入失败')
                
        except Exception as e:
            print(f'  批次 {i//batch_size + 1}: 错误 - {e}')
    
    print(f'\n✅ 总共导入 {total_imported} 条记录')
    
    # 验证数据
    print('\n验证数据...')
    response = supabase.from_('admission_scores').select('*').eq('province', '海南').execute()
    count = len(response.data) if response.data else 0
    print(f'  数据库中海南数据: {count} 条')
    
    # 按年份统计
    for year in [2023, 2024, 2025]:
        response = supabase.from_('admission_scores').select('*').eq('province', '海南').eq('year', year).execute()
        year_count = len(response.data) if response.data else 0
        print(f'  {year}年: {year_count} 条')
    
    print('\n' + '='*60)
    print('✅ 数据导入完成！')
    print('='*60)

def main():
    import_hainan_data()

if __name__ == '__main__':
    main()
