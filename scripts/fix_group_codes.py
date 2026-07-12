# -*- coding: utf-8 -*-
"""
修复admission_scores表的group_code
海南: TJxxx → HLxxx
天津: TJTJxxx → TJxxx
"""
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def fix_hainan_group_codes():
    print("🔄 处理海南数据...")
    
    result = supabase.table('admission_scores').select('id', 'group_code').eq('province', '海南').execute()
    records = result.data
    
    print(f"   找到 {len(records)} 条海南记录")
    
    update_count = 0
    for record in records:
        old_code = record.get('group_code', '')
        if old_code.startswith('TJ') and len(old_code) >= 6:
            num_part = old_code[2:]
            new_code = f"HL{num_part}"
            
            try:
                supabase.table('admission_scores').update({'group_code': new_code}).eq('id', record['id']).execute()
                update_count += 1
            except Exception as e:
                print(f"   ❌ 更新失败 {old_code} → {new_code}: {e}")
    
    print(f"   ✅ 已更新 {update_count} 条记录")

def fix_tianjin_group_codes():
    print("🔄 处理天津数据...")
    
    result = supabase.table('admission_scores').select('id', 'group_code').eq('province', '天津').execute()
    records = result.data
    
    print(f"   找到 {len(records)} 条天津记录")
    
    update_count = 0
    for record in records:
        old_code = record.get('group_code', '')
        if old_code.startswith('TJTJ') and len(old_code) >= 8:
            num_part = old_code[4:]
            new_code = f"TJ{num_part}"
            
            try:
                supabase.table('admission_scores').update({'group_code': new_code}).eq('id', record['id']).execute()
                update_count += 1
            except Exception as e:
                print(f"   ❌ 更新失败 {old_code} → {new_code}: {e}")
    
    print(f"   ✅ 已更新 {update_count} 条记录")

def verify():
    print("\n📊 验证结果...")
    
    hainan_result = supabase.table('admission_scores').select('group_code').eq('province', '海南').execute()
    hainan_codes = set(r['group_code'] for r in hainan_result.data if r['group_code'])
    print(f"\n海南 group_code 前缀: {sorted(set(c[:2] for c in hainan_codes))}")
    print(f"海南记录数: {len(hainan_result.data)}")
    
    tianjin_result = supabase.table('admission_scores').select('group_code').eq('province', '天津').execute()
    tianjin_codes = set(r['group_code'] for r in tianjin_result.data if r['group_code'])
    print(f"\n天津 group_code 前缀: {sorted(set(c[:2] for c in tianjin_codes))}")
    print(f"天津记录数: {len(tianjin_result.data)}")
    
    all_codes = supabase.table('admission_scores').select('group_code').execute()
    all_set = set(r['group_code'] for r in all_codes.data if r['group_code'])
    print(f"\n总记录数: {len(all_codes.data)}")
    
    duplicates = []
    seen = {}
    for r in all_codes.data:
        code = r.get('group_code')
        if code in seen:
            duplicates.append(code)
        seen[code] = True
    
    if duplicates:
        print(f"\n⚠️ 发现重复的group_code: {set(duplicates)}")
    else:
        print("\n✅ 所有group_code唯一")

def main():
    print("=" * 60)
    print("修复 admission_scores group_code")
    print("=" * 60)
    
    fix_hainan_group_codes()
    fix_tianjin_group_codes()
    
    verify()
    
    print("\n✅ 修复完成！")

if __name__ == "__main__":
    main()