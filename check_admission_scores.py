import json
from supabase import create_client, Client

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print("=" * 80)
print("检查 admission_scores 表")
print("=" * 80)

print("\n1. 查询天津数据")
try:
    result = supabase.table('admission_scores').select('*').eq('province', '天津').execute()
    records = result.data
    
    print(f"天津记录数: {len(records)}")
    
    if records:
        schools = set(r['school_name'] for r in records if r['school_name'])
        print(f"天津学校数: {len(schools)}")
        print(f"前10所学校: {list(schools)[:10]}")
        
        by_year = {}
        for r in records:
            year = r.get('year')
            if year not in by_year:
                by_year[year] = {'count': 0, 'schools': set()}
            by_year[year]['count'] += 1
            if r.get('school_name'):
                by_year[year]['schools'].add(r.get('school_name'))
        
        print("\n按年份分布:")
        for year in sorted(by_year.keys()):
            print(f"  {year}年: {by_year[year]['count']}条记录, {len(by_year[year]['schools'])}所学校")
        
        print("\n第一条记录示例:")
        print(f"  {json.dumps(records[0], ensure_ascii=False, indent=2)}")
    else:
        print("⚠️ admission_scores 表中没有天津数据")
except Exception as e:
    print(f"查询失败: {e}")

print("\n" + "=" * 80)
print("检查 major_scores 表")
print("=" * 80)

print("\n1. 查询天津数据")
try:
    result = supabase.table('major_scores').select('*').eq('province', '天津').execute()
    records = result.data
    
    print(f"天津记录数: {len(records)}")
    
    if records:
        schools = set(r['school_name'] for r in records if r['school_name'])
        print(f"天津学校数: {len(schools)}")
        print(f"前10所学校: {list(schools)[:10]}")
        
        by_year = {}
        for r in records:
            year = r.get('year')
            if year not in by_year:
                by_year[year] = {'count': 0, 'schools': set()}
            by_year[year]['count'] += 1
            if r.get('school_name'):
                by_year[year]['schools'].add(r.get('school_name'))
        
        print("\n按年份分布:")
        for year in sorted(by_year.keys()):
            print(f"  {year}年: {by_year[year]['count']}条记录, {len(by_year[year]['schools'])}所学校")
except Exception as e:
    print(f"查询失败: {e}")

print("\n" + "=" * 80)
print("结论")
print("=" * 80)
print("1. admission_scores 表 - 存储学校投档分数线（按学校+专业组）")
print("2. major_scores 表 - 存储专业分数线（按学校+专业）")
print("\n当前数据加载逻辑:")
print("  - 先从 admission_scores 加载")
print("  - 再从 major_scores 补充")
print("\n如果 admission_scores 表中有天津数据但未被加载，")
print("可能是查询条件或缓存问题")
