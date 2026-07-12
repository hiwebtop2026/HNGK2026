# -*- coding: utf-8 -*-
"""
验证天津数据导入结果（处理分页限制）
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

def verify():
    print("=" * 60)
    print("天津高考数据导入验证")
    print("=" * 60)
    
    print("\n📊 major_scores表天津数据:")
    
    all_records = []
    page = 1
    while True:
        result = supabase.table('major_scores').select('*').eq('province', '天津').range((page-1)*10000, page*10000-1).execute()
        records = result.data
        if not records:
            break
        all_records.extend(records)
        print(f"   读取第 {page} 页: {len(records)} 条")
        page += 1
    
    print(f"\n   总记录数: {len(all_records)}")
    
    schools = set(r['school_name'] for r in all_records if r['school_name'])
    print(f"   院校数: {len(schools)}")
    
    by_year = {}
    for r in all_records:
        year = r.get('year', 0)
        by_year[year] = by_year.get(year, 0) + 1
    print(f"   按年份分布: {by_year}")
    
    print(f"\n📊 admission_scores表天津数据:")
    all_adm_records = []
    page = 1
    while True:
        result2 = supabase.table('admission_scores').select('*').eq('province', '天津').range((page-1)*10000, page*10000-1).execute()
        adm_records = result2.data
        if not adm_records:
            break
        all_adm_records.extend(adm_records)
        page += 1
    
    print(f"   总记录数: {len(all_adm_records)}")
    
    adm_schools = set(r['school_name'] for r in all_adm_records if r['school_name'])
    print(f"   院校数: {len(adm_schools)}")
    
    print(f"\n✅ 验证完成！")
    
    if len(all_records) >= 10076:
        print("   ✅ 所有数据已完整导入")
    else:
        print(f"   ⚠️ 可能还缺少 {10076 - len(all_records)} 条记录")

if __name__ == "__main__":
    verify()