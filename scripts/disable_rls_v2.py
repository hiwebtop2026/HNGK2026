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