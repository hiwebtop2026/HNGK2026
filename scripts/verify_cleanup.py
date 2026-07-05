# -*- coding: utf-8 -*-
"""
验证清理后的数据质量
"""
import os
from collections import Counter

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    print("=" * 70)
    print("✅ 海南数据清理后验证报告")
    print("=" * 70)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. admission_scores 概览
    print("\n📊 一、admission_scores 投档线表")
    print("-" * 50)
    total = 0
    for year in [2023, 2024, 2025]:
        res = supabase.table('admission_scores').select('*', count='exact').eq('province', '海南').eq('year', year).execute()
        res2 = supabase.table('admission_scores').select('school_name').eq('province', '海南').eq('year', year).execute()
        schools = set(r['school_name'] for r in res2.data if r.get('school_name'))
        print(f"  {year}年: {res.count:>5}条记录, {len(schools):>4}所学校")
        total += res.count
    print(f"  合计: {total:>5}条记录")

    # 2. 检查是否还有重复
    print("\n📊 二、重复数据检查")
    print("-" * 50)
    for year in [2023, 2024, 2025]:
        res = supabase.table('admission_scores').select('school_name, score, subject_requirement').eq('province', '海南').eq('year', year).execute()
        keys = set()
        duplicates = 0
        for row in res.data:
            subj = row.get('subject_requirement') or ''
            if subj in ('000', '0'):
                subj = '0'
            key = (row['school_name'], row['score'], subj)
            if key in keys:
                duplicates += 1
            else:
                keys.add(key)
        print(f"  {year}年: {duplicates}条重复记录 (school_name+score+subject_requirement)")

    # 3. major_scores 概览
    print("\n📊 三、major_scores 专业分数线表")
    print("-" * 50)
    total = 0
    for year in [2023, 2024, 2025]:
        res = supabase.table('major_scores').select('*', count='exact').eq('province', '海南').eq('year', year).execute()
        res2 = supabase.table('major_scores').select('school_name').eq('province', '海南').eq('year', year).execute()
        schools = set(r['school_name'] for r in res2.data if r.get('school_name'))
        print(f"  {year}年: {res.count:>5}条记录, {len(schools):>4}所学校")
        total += res.count
    print(f"  合计: {total:>5}条记录")

    # 4. score_distribution 一分一段表
    print("\n📊 四、score_distribution 一分一段表")
    print("-" * 50)
    res = supabase.table('score_distribution').select('*', count='exact').eq('province', '海南').eq('year', 2026).execute()
    print(f"  2026年: {res.count}条记录")
    # 各分类数量
    res2 = supabase.table('score_distribution').select('category').eq('province', '海南').eq('year', 2026).execute()
    cats = Counter(r['category'] for r in res2.data)
    print(f"  分类分布: {dict(cats)}")

    # 5. 数据质量：选科要求完整性
    print("\n📊 五、数据质量检查")
    print("-" * 50)
    for year in [2023, 2024, 2025]:
        res = supabase.table('admission_scores').select('subject_requirement').eq('province', '海南').eq('year', year).execute()
        has_subj = sum(1 for r in res.data if r.get('subject_requirement'))
        print(f"  {year}年选科要求覆盖率: {has_subj}/{len(res.data)} = {has_subj/len(res.data)*100:.1f}%")

    print("\n" + "=" * 70)
    print("🎉 验证完成")
    print("=" * 70)


if __name__ == '__main__':
    main()
