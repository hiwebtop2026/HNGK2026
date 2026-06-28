"""
修复RLS策略，允许匿名读取数据
"""

SUPABASE_URL = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"

import requests

HEADERS = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    'Content-Type': 'application/json',
}

def execute_sql(sql):
    """通过REST API执行SQL"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/execute_sql"
    response = requests.post(url, headers=HEADERS, json={'sql': sql})
    return response.status_code, response.text

print('='*60)
print('🔧 修复RLS策略')
print('='*60)

# 关闭RLS
print("\n尝试关闭RLS...")

sql_commands = [
    'ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;',
]

for sql in sql_commands:
    status, msg = execute_sql(sql)
    if status in [200, 201, 204]:
        print(f"  ✅ 成功执行: {sql[:50]}...")
    else:
        print(f"  ❌ 执行失败: {msg[:200]}")

# 测试匿名查询
print("\n🔍 测试匿名查询...")
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o"

headers_anon = {
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}',
    'Content-Type': 'application/json',
}

response = requests.get(
    f"{SUPABASE_URL}/rest/v1/admission_scores?year=eq.2025&limit=1",
    headers=headers_anon
)

if response.status_code == 200 and len(response.json()) > 0:
    print("  ✅ 匿名查询成功！")
else:
    print(f"  ❌ 匿名查询失败: {response.text[:200]}")
    print("\n请手动在Supabase SQL Editor中执行:")
    print("ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;")
    print("ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;")

print('\n' + '='*60)
print('完成！')
print('='*60)