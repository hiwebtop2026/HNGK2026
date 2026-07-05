from dotenv import load_dotenv
load_dotenv()

import json
import os
import time

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

DATA_DIR = r"C:\Users\lhp\Downloads\major_scores"

try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

def connect_supabase():
    return create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

def read_all_json_files():
    print(f"\n📂 读取数据目录: {DATA_DIR}")
    
    if not os.path.exists(DATA_DIR):
        print(f"❌ 目录不存在: {DATA_DIR}")
        return []
    
    all_data = []
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    files.sort()
    
    print(f"  找到 {len(files)} 个JSON文件")
    
    for filename in files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_data.extend(data)
        except Exception as e:
            print(f"  ❌ {filename}: {e}")
    
    print(f"\n📊 总计读取 {len(all_data)} 条数据")
    return all_data

def deduplicate_data(data):
    print("\n🔍 去重处理...")
    seen = set()
    unique_data = []
    
    for item in data:
        key = (
            item.get('school_name', ''),
            item.get('year', 0),
            item.get('major_name', ''),
            item.get('major_group', ''),
            item.get('min_score', 0),
            item.get('min_rank', 0)
        )
        if key not in seen:
            seen.add(key)
            unique_data.append(item)
    
    print(f"  去重前: {len(data)} 条")
    print(f"  去重后: {len(unique_data)} 条")
    
    return unique_data

def clean_data(data):
    print("\n🧹 数据清洗...")
    cleaned = []
    
    for item in data:
        cleaned_item = {
            'school_name': item.get('school_name', '').strip(),
            'year': int(item.get('year', 0)),
            'major_name': item.get('major_name', '').strip(),
            'major_group': item.get('major_group', '').strip() or None,
            'min_score': int(item.get('min_score', 0)) if item.get('min_score') else None,
            'min_rank': int(item.get('min_rank', 0)) if item.get('min_rank') else None,
            'person_count': int(item.get('person_count', 0)) if item.get('person_count') else None,
            'batch': item.get('batch', '').strip() or None,
            'major_description': item.get('major_description', '').strip() or None,
            'subject_requirement': item.get('subject_requirement', '').strip() or None,
            'province': item.get('province', '').strip() or '海南'
        }
        
        if cleaned_item['school_name'] and cleaned_item['major_name'] and cleaned_item['year'] > 2000:
            cleaned.append(cleaned_item)
    
    print(f"  清洗后: {len(cleaned)} 条有效数据")
    return cleaned

def truncate_table(supabase):
    print("\n🗑️ 清空表数据...")
    try:
        result = supabase.rpc('pg_execute', {'sql': 'TRUNCATE TABLE major_scores;'}).execute()
        print("  ✅ 使用TRUNCATE清空表成功")
        return True
    except Exception as e:
        print(f"  ⚠️ RPC TRUNCATE失败: {str(e)[:100]}")
    
    try:
        result = supabase.from_('major_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print("  ✅ 使用DELETE清空表成功")
        return True
    except Exception as e:
        print(f"  ⚠️ DELETE清空失败: {str(e)[:100]}")
        return False

def import_data(supabase, data):
    print("\n🚀 开始导入数据...")
    
    batch_size = 50
    total_inserted = 0
    total_errors = 0
    total_data = len(data)
    
    for i in range(0, total_data, batch_size):
        batch = data[i:i+batch_size]
        
        try:
            result = supabase.from_('major_scores').insert(batch).execute()
            inserted = len(result.data) if result.data else 0
            total_inserted += inserted
            
            progress = (i + batch_size) / total_data * 100
            print(f"  进度: {min(i + batch_size, total_data)}/{total_data} ({progress:.1f}%) - 插入 {inserted} 条")
            
            time.sleep(0.1)
        except Exception as e:
            total_errors += 1
            print(f"  ❌ 第 {i//batch_size + 1} 批失败: {str(e)[:150]}")
            
            for item in batch:
                try:
                    result = supabase.from_('major_scores').insert(item).execute()
                    if result.data:
                        total_inserted += 1
                except:
                    pass
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  总数据量: {total_data} 条')
    print(f'  成功插入: {total_inserted} 条')
    print(f'  失败批次: {total_errors}')
    print('='*60)
    
    return total_inserted

def verify_import(supabase):
    print("\n🔍 验证导入结果...")
    
    print("\n📊 按年份统计:")
    year_counts = {}
    for year in [2023, 2024, 2025]:
        try:
            result = supabase.from_('major_scores').select('id').eq('year', year).execute()
            count = len(result.data) if result.data else 0
            year_counts[year] = count
            print(f"  {year}年: {count}条")
        except Exception as e:
            print(f"  {year}年: {e}")
            year_counts[year] = 0
    
    total = sum(year_counts.values())
    print(f"\n📊 总计: {total}条")
    print("\n✅ 验证完成！")
    
    return total

def main():
    print('='*60)
    print('📥 高考专业分数线数据快速导入工具')
    print('='*60)
    
    print("\n🔌 连接Supabase...")
    supabase = connect_supabase()
    print("  ✅ 连接成功")
    
    raw_data = read_all_json_files()
    if not raw_data:
        print("\n❌ 未读取到任何数据，程序终止")
        return
    
    unique_data = deduplicate_data(raw_data)
    cleaned_data = clean_data(unique_data)
    
    if cleaned_data:
        truncate_table(supabase)
        import_data(supabase, cleaned_data)
        verify_import(supabase)
    
    print("\n🎉 全部完成！")

if __name__ == "__main__":
    main()