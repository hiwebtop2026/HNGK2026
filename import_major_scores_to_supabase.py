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

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS major_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name VARCHAR(200) NOT NULL,
    year INTEGER NOT NULL,
    major_name VARCHAR(200) NOT NULL,
    major_group VARCHAR(50),
    min_score INTEGER,
    min_rank INTEGER,
    person_count INTEGER,
    batch VARCHAR(50),
    major_description TEXT,
    subject_requirement VARCHAR(100),
    province VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_major_scores_school ON major_scores (school_name);
CREATE INDEX IF NOT EXISTS idx_major_scores_year ON major_scores (year);
CREATE INDEX IF NOT EXISTS idx_major_scores_school_year ON major_scores (school_name, year);
CREATE INDEX IF NOT EXISTS idx_major_scores_major ON major_scores (major_name);

ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;
"""

def execute_sql_via_client(sql):
    try:
        from supabase import create_client
        supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
        result = supabase.rpc('pg_catalog.pg_execute', {'sql': sql}).execute()
        return True, str(result)
    except Exception as e:
        return False, str(e)

def check_table_exists():
    url = f"{SUPABASE_URL}/rest/v1/major_scores?select=id&limit=1"
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code == 200:
            return True
        return False
    except:
        return False

def create_table():
    print("\n📦 创建表结构...")
    
    if check_table_exists():
        print("  ✅ major_scores 表已存在")
        return True
    
    print("  尝试通过 Supabase 客户端创建表...")
    success, msg = execute_sql_via_client(CREATE_TABLE_SQL)
    if success:
        print("  ✅ 创建成功")
        return True
    
    print(f"  ⚠️ 自动创建失败: {msg[:100]}")
    print("\n" + "="*60)
    print("请手动在 Supabase SQL Editor 中执行以下 SQL:")
    print("="*60)
    print(CREATE_TABLE_SQL)
    print("="*60)
    print("\n执行后按回车键继续...")
    input()
    
    if check_table_exists():
        print("  ✅ 表已创建")
        return True
    else:
        print("  ❌ 表创建失败，请检查")
        return False

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
                    print(f"  ✅ {filename}: {len(data)} 条")
                else:
                    print(f"  ❌ {filename}: 格式错误")
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
    print(f"  重复数据: {len(data) - len(unique_data)} 条")
    
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
            'province': item.get('province', '').strip() or None
        }
        
        if cleaned_item['school_name'] and cleaned_item['major_name'] and cleaned_item['year'] > 2000:
            cleaned.append(cleaned_item)
    
    print(f"  清洗后: {len(cleaned)} 条有效数据")
    return cleaned

def import_data(data):
    print("\n🚀 开始导入数据...")
    
    url = f"{SUPABASE_URL}/rest/v1/major_scores"
    batch_size = 50
    total_inserted = 0
    total_errors = 0
    total_data = len(data)
    
    for i in range(0, total_data, batch_size):
        batch = data[i:i+batch_size]
        
        try:
            response = requests.post(url, headers=HEADERS, json=batch)
            if response.status_code in [200, 201]:
                result = response.json()
                inserted = len(result) if isinstance(result, list) else 0
                total_inserted += inserted
            else:
                total_errors += 1
                print(f"  ❌ 第 {i//batch_size + 1} 批失败: {response.text[:100]}")
                inserted = 0
            
            progress = (i + batch_size) / total_data * 100
            print(f"  进度: {min(i + batch_size, total_data)}/{total_data} ({progress:.1f}%) - 插入 {inserted} 条")
            
            time.sleep(0.1)
        except Exception as e:
            total_errors += 1
            print(f"  ❌ 第 {i//batch_size + 1} 批失败: {str(e)[:100]}")
    
    print('\n' + '='*60)
    print('✅ 导入完成！')
    print(f'  总数据量: {total_data} 条')
    print(f'  成功插入: {total_inserted} 条')
    print(f'  失败批次: {total_errors}')
    print('='*60)
    
    return total_inserted

def verify_import():
    print("\n🔍 验证导入结果...")
    
    url = f"{SUPABASE_URL}/rest/v1/major_scores"
    
    print("\n📊 按年份统计:")
    for year in [2023, 2024, 2025]:
        response = requests.get(f"{url}?year=eq.{year}&select=id", headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else 0
            print(f"  {year}年: {count}条")
    
    response = requests.get(f"{url}?select=id", headers=HEADERS)
    if response.status_code == 200:
        data = response.json()
        total = len(data) if isinstance(data, list) else 0
        print(f"\n  总计: {total}条")
    
    print("\n✅ 验证完成！")
    return total

def main():
    print('='*60)
    print('📥 高考专业分数线数据导入工具')
    print('='*60)
    
    if not create_table():
        return
    
    raw_data = read_all_json_files()
    if not raw_data:
        print("\n❌ 未读取到任何数据，程序终止")
        return
    
    unique_data = deduplicate_data(raw_data)
    cleaned_data = clean_data(unique_data)
    
    if cleaned_data:
        import_data(cleaned_data)
        verify_import()
    
    print("\n🎉 全部完成！")

if __name__ == "__main__":
    main()