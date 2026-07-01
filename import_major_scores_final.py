import json
import os
import time

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

DATA_DIR = r"C:\Users\lhp\Downloads\major_scores"

try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

def connect_supabase():
    return create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

def check_table_exists(supabase, table_name):
    try:
        result = supabase.from_(table_name).select('id').limit(1).execute()
        return True
    except Exception as e:
        if 'relation' in str(e).lower() or 'not found' in str(e).lower():
            return False
        return False

def ensure_table(supabase):
    print("\n📦 检查表结构...")
    
    if check_table_exists(supabase, 'major_scores'):
        print("  ✅ major_scores 表已存在")
        return True
    
    print("\n" + "="*60)
    print("❌ major_scores 表不存在")
    print("="*60)
    print("请手动在 Supabase SQL Editor 中执行以下 SQL:")
    print("="*60)
    print('''
CREATE TABLE IF NOT EXISTS major_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name VARCHAR(200) NOT NULL,
    year INTEGER NOT NULL,
    major_name VARCHAR(200) NOT NULL,
    major_group VARCHAR(100),
    min_score INTEGER,
    min_rank INTEGER,
    person_count INTEGER,
    batch VARCHAR(50),
    major_description TEXT,
    subject_requirement VARCHAR(200),
    province VARCHAR(50) DEFAULT '海南',
    school_code VARCHAR(20),
    level VARCHAR(20),
    avg_score INTEGER,
    batch_line INTEGER,
    batch_line_diff INTEGER,
    source VARCHAR(50) DEFAULT '夸克高考',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_major_scores_school ON major_scores (school_name);
CREATE INDEX IF NOT EXISTS idx_major_scores_year ON major_scores (year);
CREATE INDEX IF NOT EXISTS idx_major_scores_school_year ON major_scores (school_name, year);
CREATE INDEX IF NOT EXISTS idx_major_scores_major ON major_scores (major_name);
CREATE INDEX IF NOT EXISTS idx_major_scores_province ON major_scores (province);

ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;
''')
    print("="*60)
    print("\n请登录 https://supabase.com/dashboard/project/jhcyqhtgtnomqvcdeeuo")
    print("在 SQL Editor 中执行以上SQL，创建完成后按回车键继续...")
    input()
    
    if check_table_exists(supabase, 'major_scores'):
        print("  ✅ 表已创建")
        return True
    else:
        print("  ❌ 表仍不存在，请检查")
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
            'province': item.get('province', '').strip() or '海南'
        }
        
        if cleaned_item['school_name'] and cleaned_item['major_name'] and cleaned_item['year'] > 2000:
            cleaned.append(cleaned_item)
    
    print(f"  清洗后: {len(cleaned)} 条有效数据")
    return cleaned

def truncate_table(supabase):
    print("\n🗑️ 清空表数据...")
    try:
        result = supabase.from_('major_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        print("  ✅ 表已清空")
        return True
    except Exception as e:
        print(f"  ⚠️ 清空失败: {str(e)[:100]}")
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
            print(f"  ❌ 第 {i//batch_size + 1} 批失败: {str(e)[:200]}")
            
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
    for year in [2023, 2024, 2025]:
        try:
            result = supabase.from_('major_scores').select('id').eq('year', year).execute()
            count = len(result.data) if result.data else 0
            print(f"  {year}年: {count}条")
        except Exception as e:
            print(f"  {year}年: 查询失败 - {e}")
    
    print("\n📊 按学校统计(前10所):")
    school_counts = {}
    try:
        result = supabase.from_('major_scores').select('school_name,id').execute()
        if result.data:
            for item in result.data:
                school = item.get('school_name', '')
                school_counts[school] = school_counts.get(school, 0) + 1
            
            sorted_schools = sorted(school_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            for school, count in sorted_schools:
                print(f"  {school}: {count}条")
    except Exception as e:
        print(f"  查询失败 - {e}")
    
    try:
        result = supabase.from_('major_scores').select('id').execute()
        total = len(result.data) if result.data else 0
        print(f"\n  总计: {total}条")
    except Exception as e:
        print(f"\n  查询总数失败: {e}")
        total = 0
    
    print("\n✅ 验证完成！")
    return total

def main():
    print('='*60)
    print('📥 高考专业分数线数据导入工具')
    print('='*60)
    
    print("\n🔌 连接Supabase...")
    supabase = connect_supabase()
    print("  ✅ 连接成功")
    
    if not ensure_table(supabase):
        print("\n❌ 表不存在且无法创建，程序终止")
        return
    
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