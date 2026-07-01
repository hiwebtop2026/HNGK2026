import time

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

def connect_supabase():
    return create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

def count_records(supabase, table_name, column='id'):
    count = 0
    offset = 0
    batch_size = 1000
    
    while True:
        try:
            result = supabase.from_(table_name).select(column).range(offset, offset + batch_size - 1).execute()
            data = result.data if result.data else []
            if len(data) == 0:
                break
            count += len(data)
            offset += batch_size
            time.sleep(0.05)
        except Exception as e:
            print(f"  查询失败: {e}")
            break
    
    return count

def count_by_year(supabase):
    year_counts = {}
    for year in [2023, 2024, 2025]:
        count = 0
        offset = 0
        batch_size = 1000
        
        while True:
            try:
                result = supabase.from_('major_scores').select('id').eq('year', year).range(offset, offset + batch_size - 1).execute()
                data = result.data if result.data else []
                if len(data) == 0:
                    break
                count += len(data)
                offset += batch_size
                time.sleep(0.05)
            except Exception as e:
                print(f"  {year}年查询失败: {e}")
                break
        
        year_counts[year] = count
    
    return year_counts

def count_by_school(supabase):
    school_counts = {}
    offset = 0
    batch_size = 1000
    
    while True:
        try:
            result = supabase.from_('major_scores').select('school_name').range(offset, offset + batch_size - 1).execute()
            data = result.data if result.data else []
            if len(data) == 0:
                break
            for item in data:
                school = item.get('school_name', '')
                school_counts[school] = school_counts.get(school, 0) + 1
            offset += batch_size
            time.sleep(0.05)
        except Exception as e:
            print(f"  查询失败: {e}")
            break
    
    return school_counts

def main():
    print('='*60)
    print('🔍 数据导入验证工具')
    print('='*60)
    
    print("\n🔌 连接Supabase...")
    supabase = connect_supabase()
    print("  ✅ 连接成功")
    
    print("\n📊 按年份统计:")
    year_counts = count_by_year(supabase)
    for year, count in sorted(year_counts.items()):
        print(f"  {year}年: {count}条")
    
    total = sum(year_counts.values())
    print(f"\n📊 总计: {total}条")
    
    print("\n📊 按学校统计(前20所):")
    school_counts = count_by_school(supabase)
    sorted_schools = sorted(school_counts.items(), key=lambda x: x[1], reverse=True)[:20]
    for school, count in sorted_schools:
        print(f"  {school}: {count}条")
    
    print(f"\n📊 涉及院校总数: {len(school_counts)}所")
    
    print("\n✅ 验证完成！")

if __name__ == "__main__":
    main()