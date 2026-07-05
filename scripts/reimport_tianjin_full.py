from dotenv import load_dotenv
load_dotenv()

# -*- coding: utf-8 -*-
"""
天津高考专业分数线完整数据重新导入工具
将本地下载的所有院校数据合并并导入数据库
按实际文件存在的年份处理，不强制要求三年数据
"""
import json
import os
import sys
from supabase import create_client, Client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'tianjin_scores')
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'tianjin_major_scores_all.json')

def analyze_school_data_files():
    """分析每所院校实际有多少年的数据文件"""
    schools = {}
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith("_专业分数线.json"):
            continue
        
        parts = filename.replace("_专业分数线.json", "").split("_")
        if len(parts) >= 2:
            try:
                year = int(parts[-1])
                school_name = "_".join(parts[:-1])
                
                if school_name not in schools:
                    schools[school_name] = {
                        'years': [],
                        'files': [],
                        'has_valid_data': False,
                        'total_records': 0,
                        'valid_records': 0,
                        'years_with_valid_data': []
                    }
                
                schools[school_name]['years'].append(year)
                schools[school_name]['files'].append(filename)
                
                filepath = os.path.join(DATA_DIR, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                schools[school_name]['total_records'] += len(data)
                
                valid = [r for r in data if r.get('min_score') is not None and r['min_score'] >= 100]
                schools[school_name]['valid_records'] += len(valid)
                if len(valid) > 0:
                    schools[school_name]['has_valid_data'] = True
                    schools[school_name]['years_with_valid_data'].append(year)
            except:
                continue
    
    schools_with_1_year = []
    schools_with_2_years = []
    schools_with_3_years = []
    
    for school_name, info in schools.items():
        year_count = len(set(info['years']))
        if year_count == 1:
            schools_with_1_year.append((school_name, sorted(info['years'])))
        elif year_count == 2:
            schools_with_2_years.append((school_name, sorted(info['years'])))
        else:
            schools_with_3_years.append((school_name, sorted(info['years'])))
    
    print(f"📊 数据文件分析结果:")
    print(f"   总院校数: {len(schools)}")
    print(f"   有3年数据的院校: {len(schools_with_3_years)}所")
    print(f"   有2年数据的院校: {len(schools_with_2_years)}所")
    print(f"   有1年数据的院校: {len(schools_with_1_year)}所")
    
    no_valid_data = [s for s in schools if not schools[s]['has_valid_data']]
    partial_data = [s for s in schools if schools[s]['has_valid_data'] and len(schools[s]['years_with_valid_data']) < len(set(schools[s]['years']))]
    full_data = [s for s in schools if schools[s]['has_valid_data'] and len(schools[s]['years_with_valid_data']) == len(set(schools[s]['years']))]
    
    print(f"   完全无有效数据的院校: {len(no_valid_data)}所")
    print(f"   部分年份有有效数据的院校: {len(partial_data)}所")
    print(f"   所有年份都有有效数据的院校: {len(full_data)}所")
    
    if no_valid_data:
        print(f"\n⚠️ 完全无有效数据的院校列表:")
        for school in sorted(no_valid_data):
            info = schools[school]
            print(f"   - {school}: {sorted(info['years'])}年 (文件数:{len(info['files'])})")
    
    return schools

def load_all_local_data():
    """加载本地所有天津数据文件，按实际文件存在的年份处理"""
    all_data = []
    schools_found = set()
    schools_with_valid_data = set()
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ 数据目录不存在: {DATA_DIR}")
        return all_data, schools_found, schools_with_valid_data
    
    json_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    
    print(f"\n📁 找到 {len(json_files)} 个JSON文件")
    
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
                        item['province'] = '天津'
                        all_data.append(item)
                        schools_with_valid_data.add(school_name)
            
        except Exception as e:
            print(f"⚠️ 读取文件失败 {filename}: {e}")
    
    print(f"✅ 共加载 {len(all_data)} 条记录")
    print(f"   文件中涉及的院校数: {len(schools_found)}")
    print(f"   有有效数据的院校数: {len(schools_with_valid_data)}")
    
    return all_data, schools_found, schools_with_valid_data

def save_merged_file(data):
    """保存合并后的完整数据文件"""
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 合并后的数据已保存到: {OUTPUT_FILE}")

def delete_old_data():
    """删除数据库中旧的天津数据"""
    print("\n🔄 删除旧的天津数据...")
    try:
        result = supabase.table('major_scores').delete().eq('province', '天津').execute()
        print("✅ major_scores表删除成功")
    except Exception as e:
        print(f"❌ 删除major_scores失败: {e}")
        return False
    
    try:
        result = supabase.table('admission_scores').delete().eq('province', '天津').execute()
        print("✅ admission_scores表删除成功")
    except Exception as e:
        print(f"❌ 删除admission_scores失败: {e}")
        return False
    
    return True

def import_data_to_db(data):
    """批量导入数据到数据库"""
    print(f"\n🔄 开始导入 {len(data)} 条记录...")
    
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
    
    print(f"\n✅ 导入完成！")
    print(f"成功批次: {success_batches}")
    print(f"失败批次: {failed_batches}")
    print(f"总插入记录数: {total_inserted}")
    
    return total_inserted

def verify_import(schools_found, schools_with_valid_data):
    """验证导入结果"""
    print("\n🔍 验证导入结果...")
    
    try:
        result = supabase.table('major_scores').select('*').eq('province', '天津').execute()
        records = result.data
        
        print(f"\n数据库中天津记录数: {len(records)}")
        
        db_schools = set(r['school_name'] for r in records if r['school_name'])
        print(f"数据库中天津学校数: {len(db_schools)}")
        
        by_year = {}
        for r in records:
            year = r.get('year', 0)
            by_year[year] = by_year.get(year, 0) + 1
        
        print(f"按年份分布: {by_year}")
        
        schools_missing_from_db = schools_found - db_schools
        print(f"\n本地文件存在但数据库缺失的院校: {len(schools_missing_from_db)}所")
        
        if schools_missing_from_db:
            print("缺失院校列表:")
            for school in sorted(schools_missing_from_db):
                print(f"   - {school}")
        
        schools_with_data_not_in_db = schools_with_valid_data - db_schools
        if schools_with_data_not_in_db:
            print(f"\n⚠️ 有有效数据但未导入数据库的院校: {len(schools_with_data_not_in_db)}所")
            for school in sorted(schools_with_data_not_in_db):
                print(f"   - {school}")
        
        return len(db_schools), schools_missing_from_db
    
    except Exception as e:
        print(f"❌ 验证失败: {e}")
        return 0, set()

def update_admission_scores():
    """从major_scores重新生成admission_scores数据"""
    print("\n🔄 更新admission_scores表...")
    
    try:
        result = supabase.table('major_scores').select('*').eq('province', '天津').execute()
        all_major_data = result.data
        
        print(f"从major_scores提取天津数据: {len(all_major_data)} 条记录")
        
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
                }
                admission_records.append(record)
        
        print(f"生成 admission_scores 格式记录: {len(admission_records)} 条")
        
        if admission_records:
            batch_size = 100
            total_inserted = 0
            
            for i in range(0, len(admission_records), batch_size):
                batch = admission_records[i:i+batch_size]
                try:
                    result = supabase.table('admission_scores').insert(batch).execute()
                    total_inserted += len(result.data) if result.data else 0
                except Exception as e:
                    print(f"  ❌ 插入批次失败: {str(e)[:50]}")
            
            print(f"✅ admission_scores表更新完成，共插入 {total_inserted} 条记录")
            
            result = supabase.table('admission_scores').select('school_name').execute()
            admission_schools = set(r['school_name'] for r in result.data if r['school_name'])
            print(f"admission_scores表中学校数: {len(admission_schools)}")
            
            return len(admission_schools)
        else:
            print("⚠️ 没有有效的admission_scores记录可插入")
            return 0
    
    except Exception as e:
        print(f"❌ 更新admission_scores失败: {e}")
        return 0

def main():
    print("=" * 70)
    print("天津高考专业分数线完整数据重新导入工具")
    print("=" * 70)
    
    print("\n步骤1: 分析本地数据文件...")
    schools_info = analyze_school_data_files()
    
    print("\n步骤2: 加载本地所有数据文件...")
    all_data, schools_found, schools_with_valid_data = load_all_local_data()
    
    print("\n步骤3: 保存合并后的数据文件...")
    save_merged_file(all_data)
    
    print("\n步骤4: 删除数据库中旧的天津数据...")
    if not delete_old_data():
        print("❌ 删除旧数据失败，退出")
        return
    
    print("\n步骤5: 批量导入新数据到major_scores表...")
    total_inserted = import_data_to_db(all_data)
    
    print("\n步骤6: 验证导入结果...")
    db_school_count, missing_schools = verify_import(schools_found, schools_with_valid_data)
    
    print("\n步骤7: 更新admission_scores表...")
    admission_school_count = update_admission_scores()
    
    print("\n" + "=" * 70)
    print("最终结果汇总:")
    print("=" * 70)
    print(f"本地文件院校数: {len(schools_found)}")
    print(f"本地文件记录数: {len(all_data)}")
    print(f"有有效数据的院校数: {len(schools_with_valid_data)}")
    print(f"major_scores表院校数: {db_school_count}")
    print(f"major_scores表记录数: {total_inserted}")
    print(f"admission_scores表院校数: {admission_school_count}")
    
    if len(schools_found) != db_school_count:
        print(f"\n⚠️ 导入不完整！本地有{len(schools_found)}所院校，数据库只有{db_school_count}所")
        print(f"   缺失的院校数: {len(missing_schools)}")
        if missing_schools:
            print("   建议重新采集以下院校的数据:")
            for school in sorted(missing_schools):
                print(f"     - {school}")
    else:
        print("\n✅ 导入完成！所有院校数据已成功导入数据库")

if __name__ == "__main__":
    main()