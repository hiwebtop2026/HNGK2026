import json
import os
import time
import requests

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'apikey': SERVICE_ROLE_KEY
}

DATA_DIR = r"C:\Users\lhp\Downloads\major_scores"

try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

def connect_supabase():
    return create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

def clear_table(supabase):
    print("\n🗑️ 清空表数据...")
    
    while True:
        try:
            result = supabase.from_('major_scores').select('id').limit(1000).execute()
            ids = [item['id'] for item in (result.data or [])]
            
            if not ids:
                print("  ✅ 表已清空")
                break
            
            for id_val in ids:
                try:
                    supabase.from_('major_scores').delete().eq('id', id_val).execute()
                except:
                    pass
            
            print(f"  删除了 {len(ids)} 条记录")
            time.sleep(0.1)
        except Exception as e:
            print(f"  删除失败: {e}")
            break

def read_all_json_files():
    print(f"\n📂 读取数据目录: {DATA_DIR}")
    
    all_data = []
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    files.sort()
    
    for filename in files:
        filepath = os.path.join(DATA_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_data.extend(data)
        except:
            pass
    
    print(f"  读取完成: {len(all_data)} 条")
    return all_data

def deduplicate_data(data):
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
    
    return unique_data

def clean_data(data):
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
    
    return cleaned

def import_data(supabase, data):
    print("\n🚀 开始导入数据...")
    
    batch_size = 50
    total_inserted = 0
    total_data = len(data)
    
    for i in range(0, total_data, batch_size):
        batch = data[i:i+batch_size]
        
        try:
            result = supabase.from_('major_scores').insert(batch).execute()
            inserted = len(result.data) if result.data else 0
            total_inserted += inserted
        except:
            for item in batch:
                try:
                    result = supabase.from_('major_scores').insert(item).execute()
                    if result.data:
                        total_inserted += 1
                except:
                    pass
        
        progress = (i + batch_size) / total_data * 100
        print(f"  进度: {min(i + batch_size, total_data)}/{total_data} ({progress:.1f}%)")
        time.sleep(0.05)
    
    print(f"  成功插入: {total_inserted} 条")
    return total_inserted

def count_records(supabase):
    count = 0
    offset = 0
    batch_size = 1000
    
    while True:
        try:
            result = supabase.from_('major_scores').select('id').range(offset, offset + batch_size - 1).execute()
            data = result.data if result.data else []
            if len(data) == 0:
                break
            count += len(data)
            offset += batch_size
        except:
            break
    
    return count

def main():
    print('='*60)
    print('📥 清空并重新导入数据')
    print('='*60)
    
    supabase = connect_supabase()
    print("  ✅ 连接成功")
    
    clear_table(supabase)
    
    raw_data = read_all_json_files()
    unique_data = deduplicate_data(raw_data)
    cleaned_data = clean_data(unique_data)
    
    print(f"\n📊 数据统计:")
    print(f"  原始数据: {len(raw_data)} 条")
    print(f"  去重后: {len(unique_data)} 条")
    print(f"  清洗后: {len(cleaned_data)} 条")
    
    import_data(supabase, cleaned_data)
    
    total = count_records(supabase)
    print(f"\n✅ 验证完成！数据库总计: {total}条")

if __name__ == "__main__":
    main()