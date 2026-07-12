# -*- coding: utf-8 -*-
"""
导入admission_scores表数据
使用upsert方式处理重复键
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

def import_admission_scores():
    print("=" * 60)
    print("导入admission_scores表数据")
    print("=" * 60)
    
    print("\n🔄 读取major_scores天津数据...")
    all_major_data = []
    page = 1
    while True:
        result = supabase.table('major_scores').select('*').eq('province', '天津').range((page-1)*10000, page*10000-1).execute()
        records = result.data
        if not records:
            break
        all_major_data.extend(records)
        page += 1
    
    print(f"提取到 {len(all_major_data)} 条记录")
    
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
            group_code = f"TJTJ{group_counter:04d}"
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
    
    print(f"按学校+专业组聚合后: {len(school_groups)} 个组合")
    
    admission_records = []
    
    for key, group in school_groups.items():
        for year, score in group['scores'].items():
            group_name = f"{group['school_name']}"
            if group['major_group']:
                group_name += f"({group['major_group']})"
            
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
    
    print(f"生成 admission_scores 格式记录: {len(admission_records)} 条")
    
    if admission_records:
        batch_size = 50
        total_inserted = 0
        total_updated = 0
        
        for i in range(0, len(admission_records), batch_size):
            batch = admission_records[i:i+batch_size]
            try:
                result = supabase.table('admission_scores').upsert(batch).execute()
                affected = len(result.data) if result.data else 0
                total_inserted += affected
                
                if (i // batch_size + 1) % 5 == 0:
                    print(f"  批次 {i//batch_size + 1:3d}: 已处理 {total_inserted} 条")
            
            except Exception as e:
                print(f"  ❌ 批次 {i//batch_size + 1:3d} 失败: {str(e)[:80]}")
        
        print(f"\n✅ admission_scores表更新完成")
        print(f"   处理记录数: {total_inserted}")
        
        result = supabase.table('admission_scores').select('school_name').eq('province', '天津').execute()
        admission_schools = set(r['school_name'] for r in result.data if r['school_name'])
        print(f"   admission_scores表中天津学校数: {len(admission_schools)}")
    
    print("\n✅ 导入完成！")

if __name__ == "__main__":
    import_admission_scores()