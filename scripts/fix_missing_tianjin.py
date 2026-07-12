# -*- coding: utf-8 -*-
"""
修复天津数据缺失的院校
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

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'tianjin_scores')

missing_schools = ['青海大学', '黑龙江大学']

def import_missing_schools():
    all_data = []
    
    for school_name in missing_schools:
        files = [f for f in os.listdir(DATA_DIR) if school_name in f and f.endswith('.json')]
        print(f"\n处理 {school_name}: 找到 {len(files)} 个文件")
        
        for filename in files:
            filepath = os.path.join(DATA_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if isinstance(data, list):
                    for item in data:
                        if item.get('min_score') is not None and item.get('min_score') >= 100:
                            all_data.append({
                                'school_name': item.get("school_name", ""),
                                'province': '天津',
                                'year': item.get("year", 2025),
                                'major_name': item.get("major_name", ""),
                                'major_group': item.get("major_group", ""),
                                'min_score': item.get("min_score"),
                                'min_rank': item.get("min_rank"),
                                'person_count': item.get("person_count"),
                                'batch': item.get("batch", ""),
                                'subject_requirement': item.get("subject_requirement", ""),
                            })
            except Exception as e:
                print(f"  ⚠️ 读取文件失败 {filename}: {e}")
    
    print(f"\n共收集 {len(all_data)} 条缺失数据")
    
    if all_data:
        result = supabase.table('major_scores').insert(all_data).execute()
        inserted = len(result.data) if result.data else 0
        print(f"✅ 成功插入 {inserted} 条记录")
    
    return all_data

def verify():
    print("\n验证修复结果...")
    
    for school_name in missing_schools:
        result = supabase.table('major_scores').select('*').eq('province', '天津').eq('school_name', school_name).execute()
        count = len(result.data)
        print(f"{school_name}: {count} 条记录")
        
        by_year = {}
        for r in result.data:
            year = r.get('year', 0)
            by_year[year] = by_year.get(year, 0) + 1
        print(f"   按年份分布: {by_year}")

def main():
    print("=" * 60)
    print("修复天津数据缺失院校")
    print("=" * 60)
    
    import_missing_schools()
    verify()
    
    print("\n✅ 修复完成！")

if __name__ == "__main__":
    main()