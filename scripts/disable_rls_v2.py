import requests

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

def execute_sql(sql):
    print(f'执行SQL: {sql}')
    url = f'{SUPABASE_URL}/rest/v1/'
    response = requests.post(url, headers=headers, json={'query': sql})
    print(f'响应: {response.status_code}')
    if response.status_code != 200:
        print(f'错误: {response.text}')
    return response.status_code == 200

tables = ['score_distribution', 'admission_scores', 'major_scores', 'subject_requirements']

for table in tables:
    sql = f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;'
    execute_sql(sql)

print('\n完成！')