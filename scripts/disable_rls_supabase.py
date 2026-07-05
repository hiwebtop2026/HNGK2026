import os
from dotenv import load_dotenv
load_dotenv()

import requests

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

def execute_rpc(function_name, params):
    url = f'{SUPABASE_URL}/rest/v1/rpc/{function_name}'
    response = requests.post(url, headers=headers, json=params)
    return response.status_code, response.text

print('尝试通过rpc禁用RLS...')

tables = ['score_distribution', 'major_scores', 'admission_scores']

for table in tables:
    print(f'\n禁用 {table} 的RLS...')
    
    status, text = execute_rpc('disable_rls', {'table_name': table})
    print(f'  disable_rls RPC: {status} - {text[:200]}')
    
    status, text = execute_rpc('alter_table', {'sql': f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;'})
    print(f'  alter_table RPC: {status} - {text[:200]}')

print('\n尝试直接执行SQL...')
url = f'{SUPABASE_URL}/rest/v1/'
response = requests.post(url, headers=headers, json={'query': 'ALTER TABLE score_distribution DISABLE ROW LEVEL SECURITY;'})
print(f'直接SQL执行: {response.status_code} - {response.text[:200]}')

print('\n检查score_distribution表的RLS状态...')
response = requests.get(f'{SUPABASE_URL}/rest/v1/score_distribution?select=id&limit=1', headers=headers)
print(f'读取测试: {response.status_code}')
if response.status_code == 200:
    print(f'  可以读取数据')
else:
    print(f'  读取失败: {response.text[:200]}')

print('\n尝试插入测试数据...')
test_data = {
    'province': '海南',
    'year': 2026,
    'score': 999,
    'count': 1,
    'cumulative_count': 1,
    'min_rank': 1,
    'max_rank': 1,
    'category': '测试'
}
response = requests.post(f'{SUPABASE_URL}/rest/v1/score_distribution', headers=headers, json=test_data)
print(f'插入测试: {response.status_code}')
if response.status_code in [200, 201]:
    print(f'  ✅ 插入成功！')
else:
    print(f'  ❌ 插入失败: {response.text[:300]}')

print('\n清理测试数据...')
response = requests.delete(f'{SUPABASE_URL}/rest/v1/score_distribution?province=eq.海南&year=eq.2026&score=eq.999&category=eq.测试', headers=headers)
print(f'删除测试: {response.status_code}')
