# -*- coding: utf-8 -*-
"""
检查admission_scores数据中的重复记录
"""
import json
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def check_duplicates():
    print("=" * 60)
    print("检查admission_scores数据中的重复")
    print("=" * 60)
    
    all_major_data = []
    page = 1
    while True:
        result = supabase.table('major_scores').select('*').eq('province', '天津').range((page-1)*10000, page*10000-1).execute()
        records = result.data
        if not records:
            break
        all_major_data.extend(records)
        page += 1
    
    print(f"\n读取到 {len(all_major_data)} 条记录")
    
    school_groups = {}
    group_counter = 1
    
    for item in all_major_data:
        school_name = item.get('school_name', '')
        major_group = item.get('major_group', '')
        year = item.get('year', 0)
        
        if not school_name:
            continue
        
        key = f"{school_name}_{major_group}"
        if key not in school_groups:
            group_code = f"TJ{group_counter:04d}"
            group_counter += 1
            
            school_groups[key] = {
                'school_name': school_name,
                'major_group': major_group,
                'subject_requirement': item.get('subject_requirement', ''),
                'batch': item.get('batch', ''),
                'scores': {},
                'school_code': item.get('school_code', ''),
                'group_code': group_code,
            }
        
        min_score = item.get('min_score')
        if min_score is not None and min_score >= 100:
            if year not in school_groups[key]['scores'] or min_score < school_groups[key]['scores'][year]:
                school_groups[key]['scores'][year] = min_score
    
    admission_records = []
    seen_keys = {}
    
    for key, group in school_groups.items():
        for year, score in group['scores'].items():
            group_name = f"{group['school_name']}"
            if group['major_group']:
                group_name += f"({group['major_group']})"
            
            record_key = f"{group['school_name']}_{year}_{group['major_group']}"
            
            if record_key in seen_keys:
                print(f"⚠️ 重复记录: {record_key}")
                print(f"   已有: {seen_keys[record_key]}")
                print(f"   当前: score={score}, batch={group['batch']}")
            else:
                seen_keys[record_key] = f"score={score}, batch={group['batch']}"
            
            record = {
                'year': year,
                'group_code': group['group_code'],
                'group_name': group_name,
                'school_name': group['school_name'],
                'school_code': group['school_code'],
                'group_number': group['major_group'],
                'subject_requirement': group['subject_requirement'],
                'score': score,
                'plan_count': None,
                'admission_count': None,
                'batch_type': group['batch'] if group['batch'] else '本科批',
                'province': '天津',
            }
            admission_records.append(record)
    
    print(f"\n总记录数: {len(admission_records)}")
    print(f"唯一键数: {len(seen_keys)}")
    
    if len(admission_records) != len(seen_keys):
        print(f"\n❌ 发现 {len(admission_records) - len(seen_keys)} 条重复记录！")
    else:
        print("\n✅ 没有发现重复记录")

if __name__ == "__main__":
    check_duplicates()