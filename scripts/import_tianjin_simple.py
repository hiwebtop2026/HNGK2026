# -*- coding: utf-8 -*-
"""
天津数据简易导入脚本
"""
import json
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client

SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('VITE_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_ANON_KEY or '请填入' in SUPABASE_ANON_KEY:
    print("❌ 请先配置 .env 文件中的 SUPABASE_URL 和 SUPABASE_ANON_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'tianjin_scores')
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'tianjin_major_scores_all.json')

def load_all_local_data():
    all_data = []
    schools_found = set()
    schools_with_valid_data = set()
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ 数据目录不存在: {DATA_DIR}")
        return all_data, schools_found, schools_with_valid_data
    
    json_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    
    print(f"找到 {len(json_files)} 个JSON文件")
    
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, list):
                for item in data:
                    school_name = item.get('school_name', '')
                    if school_name:
                        schools_found.add(school_name)
                    
                    if item.get('min_score') is not None and item.get('min_score') >= 100:
                        item['province'] = 'Tianjin'
                        all_data.append(item)
                        schools_with_valid_data.add(school_name)
            
        except Exception as e:
            print(f"⚠️ 读取文件失败 {filename}: {e}")
    
    print(f"共加载 {len(all_data)} 条记录")
    print(f"涉及院校数: {len(schools_found)}")
    print(f"有有效数据的院校数: {len(schools_with_valid_data)}")
    
    return all_data, schools_found, schools_with_valid_data

def import_data_to_db(data):
    print(f"\n开始导入 {len(data)} 条记录...")
    
    batch_size = 100
    total_inserted = 0
    success_batches = 0
    failed_batches = 0
    
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        
        rows = []
        for item in batch:
            rows.append({
                'school_name': item.get("school_name", ""),
                'province': 'Tianjin',
                'year': item.get("year", 2025),
                'major_name': item.get("major_name", ""),
                'major_group': item.get("major_group", ""),
                'min_score': item.get("min_score"),
                'min_rank': item.get("min_rank"),
                'person_count': item.get("person_count"),
                'batch': item.get("batch", ""),
                'subject_requirement': item.get("subject_requirement", ""),
            })
        
        try:
            result = supabase.table('major_scores').insert(rows).execute()
            inserted = len(result.data) if result.data else 0
            total_inserted += inserted
            success_batches += 1
            
            if (i // batch_size + 1) % 10 == 0:
                print(f'  批次 {i//batch_size + 1:3d}: 已插入 {total_inserted:4d} 条')
        
        except Exception as e:
            failed_batches += 1
            print(f'  批次 {i//batch_size + 1:3d}: 失败 - {str(e)[:100]}')
    
    print(f"\n导入完成！")
    print(f"成功批次: {success_batches}")
    print(f"失败批次: {failed_batches}")
    print(f"总插入记录数: {total_inserted}")
    
    return total_inserted

def verify_import():
    print("\n验证导入结果...")
    
    try:
        result = supabase.table('major_scores').select('*').eq('province', 'Tianjin').execute()
        records = result.data
        
        print(f"数据库中天津记录数: {len(records)}")
        
        db_schools = set(r['school_name'] for r in records if r['school_name'])
        print(f"数据库中天津学校数: {len(db_schools)}")
        
        by_year = {}
        for r in records:
            year = r.get('year', 0)
            by_year[year] = by_year.get(year, 0) + 1
        
        print(f"按年份分布: {by_year}")
        
        return len(db_schools)
    
    except Exception as e:
        print(f"验证失败: {e}")
        return 0

def main():
    print("=" * 70)
    print("天津高考数据简易导入工具")
    print("=" * 70)
    
    print("\n步骤1: 加载本地数据文件...")
    all_data, schools_found, schools_with_valid_data = load_all_local_data()
    
    if not all_data:
        print("❌ 没有数据可导入")
        return
    
    print("\n步骤2: 保存合并后的数据文件...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"✅ 合并数据已保存到: {OUTPUT_FILE}")
    
    print("\n步骤3: 批量导入数据到数据库...")
    total_inserted = import_data_to_db(all_data)
    
    print("\n步骤4: 验证导入结果...")
    db_school_count = verify_import()
    
    print("\n" + "=" * 70)
    print("最终结果汇总:")
    print("=" * 70)
    print(f"本地院校数: {len(schools_found)}")
    print(f"本地记录数: {len(all_data)}")
    print(f"数据库院校数: {db_school_count}")
    print(f"数据库记录数: {total_inserted}")
    
    if len(schools_found) != db_school_count:
        print(f"\n⚠️ 导入不完整！")
    else:
        print("\n✅ 导入完成！")

if __name__ == "__main__":
    main()