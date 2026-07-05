from dotenv import load_dotenv
load_dotenv()

import json
import os
import time
import requests

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'apikey': SERVICE_ROLE_KEY
}

DATA_DIR = r"C:\Users\lhp\Downloads\major_scores"

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

def import_data(data):
    print("\n🚀 开始导入数据...")
    
    url = f"{SUPABASE_URL}/rest/v1/major_scores"
    batch_size = 50
    total_inserted = 0
    total_data = len(data)
    
    for i in range(0, total_data, batch_size):
        batch = data[i:i+batch_size]
        
        try:
            response = requests.post(url, headers=HEADERS, json=batch)
            if response.status_code in [200, 201]:
                result = response.json()
                inserted = len(result) if isinstance(result, list) else 0
                total_inserted += inserted
        except:
            for item in batch:
                try:
                    resp = requests.post(url, headers=HEADERS, json=[item])
                    if resp.status_code in [200, 201]:
                        total_inserted += 1
                except:
                    pass
        
        progress = (i + batch_size) / total_data * 100
        print(f"  进度: {min(i + batch_size, total_data)}/{total_data} ({progress:.1f}%)")
        time.sleep(0.05)
    
    print(f"  成功插入: {total_inserted} 条")
    return total_inserted

def count_records():
    count = 0
    offset = 0
    batch_size = 1000
    
    while True:
        url = f"{SUPABASE_URL}/rest/v1/major_scores?select=id&offset={offset}&limit={batch_size}"
        try:
            response = requests.get(url, headers=HEADERS)
            if response.status_code == 200:
                data = response.json()
                if not data:
                    break
                count += len(data)
                offset += batch_size
                time.sleep(0.05)
            else:
                break
        except:
            break
    
    return count

def main():
    print('='*60)
    print('📥 数据导入工具')
    print('='*60)
    
    print("\n⚠️ 请先手动清空数据库表！")
    print("登录: https://supabase.com/dashboard/project/<your-project-ref>")
    print("在 SQL Editor 中执行:")
    print("  TRUNCATE TABLE major_scores;")
    input("\n执行完成后按回车键继续...")
    
    raw_data = read_all_json_files()
    unique_data = deduplicate_data(raw_data)
    cleaned_data = clean_data(unique_data)
    
    print(f"\n📊 数据统计:")
    print(f"  原始数据: {len(raw_data)} 条")
    print(f"  去重后: {len(unique_data)} 条")
    print(f"  清洗后: {len(cleaned_data)} 条")
    
    import_data(cleaned_data)
    
    total = count_records()
    print(f"\n✅ 验证完成！数据库总计: {total}条")

if __name__ == "__main__":
    main()