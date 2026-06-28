"""
验证数据是否已导入成功
"""

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

from supabase import create_client

supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

print('='*60)
print('🔍 验证数据导入结果')
print('='*60)

print("\n📊 数据统计:")

# 按年份统计（使用较大的limit）
for year in [2023, 2024, 2025]:
    result = supabase.table('admission_scores').select('id').eq('year', year).limit(10000).execute()
    count = len(result.data) if result.data else 0
    print(f"  {year}年: {count}条")

# 查询科目要求表
print("\n📋 科目要求表:")
result = supabase.table('subject_requirements').select('*').execute()
print(f"  共{len(result.data)}条科目要求数据")

# 测试匿名查询
print("\n🔍 测试匿名查询(前端使用):")
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o"
supabase_anon = create_client(SUPABASE_URL, ANON_KEY)

result = supabase_anon.table('admission_scores').select('id').eq('year', 2025).limit(10000).execute()
count = len(result.data) if result.data else 0
print(f"  匿名查询2025年数据: {count}条 - {'✅ 成功' if count > 0 else '❌ 失败'}")

# 查询一条具体数据验证内容
print("\n📋 数据内容验证:")
result = supabase.table('admission_scores').select('*').eq('school_name', '北京大学').limit(5).execute()
if result.data:
    for item in result.data:
        print(f"  {item['school_name']}({item['group_number']}): {item['score']}分")

print('\n' + '='*60)
print('✅ 验证完成！')
print('='*60)