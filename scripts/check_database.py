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

print('=== 数据库表列表 ===')

print('\n=== 海南一分一段表数据 ===')
url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=*&province=eq.海南&order=score.desc'
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    print(f'海南一分一段表记录数: {len(data)}')
    if len(data) > 0:
        print(f'分数范围: {data[0]["score"]} - {data[-1]["score"]}')
print()

print('=== 603分附近的数据 ===')
url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=*&province=eq.海南&score=gte.598&score=lte.610&order=score.desc'
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    for row in data:
        print(f'分数: {row["score"]}, 位次: {row.get("rank", "")}, 累计人数: {row.get("cumulative_count", "")}, 同分人数: {row.get("count", "")}')
print()

print('=== 900分和480分数据 ===')
url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=*&province=eq.海南&score=in.(900,480)&order=score.desc'
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    for row in data:
        print(f'分数: {row["score"]}, 位次: {row.get("rank", "")}, 累计人数: {row.get("cumulative_count", "")}')
print()

print('=== major_scores 海南数据统计 ===')
url = f'{SUPABASE_URL}/rest/v1/major_scores?select=count(*)&province=eq.海南'
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    print(f'海南专业分数线记录数: {data[0]["count"]}')

url = f'{SUPABASE_URL}/rest/v1/major_scores?select=school_name&province=eq.海南'
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    schools = set()
    for row in data:
        schools.add(row['school_name'])
    print(f'海南院校数量: {len(schools)}')

url = f'{SUPABASE_URL}/rest/v1/major_scores?select=year&province=eq.海南'
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    years = {}
    for row in data:
        y = row['year']
        years[y] = years.get(y, 0) + 1
    print(f'年份分布: {years}')
print()

print('=== 一分一段表年份分布 ===')
url = f'{SUPABASE_URL}/rest/v1/score_distribution?select=year&province=eq.海南'
response = requests.get(url, headers=headers)
if response.status_code == 200:
    data = response.json()
    years = {}
    for row in data:
        y = row['year']
        years[y] = years.get(y, 0) + 1
    print(f'年份分布: {years}')
