import json

data = json.load(open('data/tianjin_major_scores_all.json', encoding='utf-8'))
print(f'总记录数: {len(data)}')

empty = [d for d in data if not d.get('school_name')]
print(f'school_name为空的记录数: {len(empty)}')

if empty:
    print('空记录示例:')
    for d in empty[:5]:
        print(f'  {d}')

schools = set(d.get('school_name') for d in data if d.get('school_name'))
print(f'学校数: {len(schools)}')
print(f'前20所学校: {list(schools)[:20]}')

by_year = {}
for d in data:
    year = d.get('year')
    if year not in by_year:
        by_year[year] = {'count': 0, 'schools': set()}
    by_year[year]['count'] += 1
    if d.get('school_name'):
        by_year[year]['schools'].add(d.get('school_name'))

for year in sorted(by_year.keys()):
    print(f'{year}年: {by_year[year]["count"]}条记录, {len(by_year[year]["schools"])}所学校')
