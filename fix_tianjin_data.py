import json

input_file = 'data/tianjin_major_scores_all.json'
output_file = 'data/tianjin_major_scores_all_fixed.json'

with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

fixed_data = []
fixed_count = 0
skipped_count = 0

for item in data:
    if 'school_name' in item and item['school_name']:
        fixed_data.append(item)
    else:
        year = None
        school_name = None
        
        for key in item.keys():
            if key in ['2023', '2024', '2025']:
                year = int(key)
            elif key not in ['major_name', 'major_group', 'min_score', 'min_rank', 'person_count', 'batch', 'subject_requirement', 'province']:
                school_name = key
        
        if year is not None and school_name is not None:
            fixed_item = {
                'school_name': school_name,
                'year': year,
                'major_name': item.get('major_name', ''),
                'major_group': item.get('major_group', ''),
                'min_score': item.get('min_score'),
                'min_rank': item.get('min_rank'),
                'person_count': item.get('person_count'),
                'batch': item.get('batch', ''),
                'subject_requirement': item.get('subject_requirement', ''),
                'province': item.get('province', '天津'),
            }
            fixed_data.append(fixed_item)
            fixed_count += 1
        else:
            skipped_count += 1

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(fixed_data, f, ensure_ascii=False, indent=2)

print(f'总记录数: {len(data)}')
print(f'格式正确的记录数: {len(data) - 820}')
print(f'修复的记录数: {fixed_count}')
print(f'无法修复跳过的记录数: {skipped_count}')
print(f'修复后总记录数: {len(fixed_data)}')

schools = set(d.get('school_name') for d in fixed_data if d.get('school_name'))
print(f'学校数: {len(schools)}')

by_year = {}
for d in fixed_data:
    year = d.get('year')
    if year not in by_year:
        by_year[year] = {'count': 0, 'schools': set()}
    by_year[year]['count'] += 1
    if d.get('school_name'):
        by_year[year]['schools'].add(d.get('school_name'))

for year in sorted(by_year.keys()):
    print(f'{year}年: {by_year[year]["count"]}条记录, {len(by_year[year]["schools"])}所学校')

print(f'\n修复后的数据已保存到: {output_file}')
