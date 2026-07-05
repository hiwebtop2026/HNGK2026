import json
import os

input_file = 'data/tianjin_major_scores_all.json'

with open(input_file, encoding='utf-8') as f:
    data = json.load(f)

print("=" * 80)
print("天津数据全面排查报告")
print("=" * 80)

print(f"\n1. 基本统计")
print(f"   总记录数: {len(data)}")

print("\n2. 格式问题排查")

errors = {
    'missing_school_name': 0,
    'empty_school_name': 0,
    'missing_year': 0,
    'missing_min_score': 0,
    'invalid_min_score': 0,
    'missing_province': 0,
    'wrong_format': 0,
    'duplicate_records': 0,
}

problematic_records = []
seen_keys = set()

for i, item in enumerate(data):
    key = f"{item.get('school_name', '')}|{item.get('year', '')}|{item.get('major_name', '')}|{item.get('min_score', '')}"
    
    if key in seen_keys:
        errors['duplicate_records'] += 1
    seen_keys.add(key)
    
    if 'school_name' not in item:
        errors['missing_school_name'] += 1
        errors['wrong_format'] += 1
        problematic_records.append({'index': i, 'type': 'missing_school_name', 'data': item})
    elif not item['school_name']:
        errors['empty_school_name'] += 1
        problematic_records.append({'index': i, 'type': 'empty_school_name', 'data': item})
    
    if 'year' not in item:
        errors['missing_year'] += 1
        problematic_records.append({'index': i, 'type': 'missing_year', 'data': item})
    
    if 'min_score' not in item:
        errors['missing_min_score'] += 1
        problematic_records.append({'index': i, 'type': 'missing_min_score', 'data': item})
    elif item['min_score'] is None or item['min_score'] < 100:
        errors['invalid_min_score'] += 1
    
    if 'province' not in item:
        errors['missing_province'] += 1

print(f"   school_name字段缺失: {errors['missing_school_name']}")
print(f"   school_name为空: {errors['empty_school_name']}")
print(f"   year字段缺失: {errors['missing_year']}")
print(f"   min_score字段缺失: {errors['missing_min_score']}")
print(f"   min_score无效(<100): {errors['invalid_min_score']}")
print(f"   province字段缺失: {errors['missing_province']}")
print(f"   格式错误(特殊key): {errors['wrong_format']}")
print(f"   重复记录: {errors['duplicate_records']}")

print("\n3. 特殊格式记录分析")
wrong_format_records = [r for r in problematic_records if r['type'] == 'missing_school_name']
if wrong_format_records:
    print(f"   共发现 {len(wrong_format_records)} 条特殊格式记录")
    print("\n   特殊格式记录的key值分析:")
    special_keys = set()
    for r in wrong_format_records[:10]:
        special_keys.update(r['data'].keys())
    print(f"   特殊key值: {special_keys}")
    
    print("\n   前5条特殊格式记录示例:")
    for r in wrong_format_records[:5]:
        print(f"   索引{r['index']}: {json.dumps(r['data'], ensure_ascii=False)[:100]}...")

print("\n4. 数据提取逻辑分析")
print("   特殊格式记录的结构:")
print("   {'年份': 年份值, '学校名称': 学校名称值, 'major_name': ...}")
print("   需要将年份key转换为year字段，学校名称key转换为school_name字段")

print("\n5. 修复方案")
print("   将特殊格式记录转换为标准格式:")
print("   {'school_name': '学校名称', 'year': 年份, 'major_name': ...}")

print("\n" + "=" * 80)
print("开始修复数据...")
print("=" * 80)

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

output_file = 'data/tianjin_major_scores_all_fixed.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(fixed_data, f, ensure_ascii=False, indent=2)

print(f"\n修复完成！")
print(f"原记录数: {len(data)}")
print(f"修复的记录数: {fixed_count}")
print(f"跳过的记录数: {skipped_count}")
print(f"修复后记录数: {len(fixed_data)}")

schools = set(d.get('school_name') for d in fixed_data if d.get('school_name'))
print(f"学校数: {len(schools)}")

by_year = {}
for d in fixed_data:
    year = d.get('year')
    if year not in by_year:
        by_year[year] = {'count': 0, 'schools': set()}
    by_year[year]['count'] += 1
    if d.get('school_name'):
        by_year[year]['schools'].add(d.get('school_name'))

print("\n按年份统计:")
for year in sorted(by_year.keys()):
    print(f"   {year}年: {by_year[year]['count']}条记录, {len(by_year[year]['schools'])}所学校")

print(f"\n修复后的数据已保存到: {output_file}")
