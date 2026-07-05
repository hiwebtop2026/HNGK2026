# -*- coding: utf-8 -*-
"""
全面检查海南数据库记录数
"""
import os

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    print("=" * 70)
    print("📊 海南数据库记录数全面检查")
    print("=" * 70)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. admission_scores表
    print("\n" + "=" * 70)
    print("📋 admission_scores 表（投档分数线）")
    print("=" * 70)

    # 总记录数
    result = supabase.table('admission_scores').select('*', count='exact').eq('province', '海南').execute()
    print(f"  海南总记录数: {result.count}")

    # 按年份统计
    for year in [2023, 2024, 2025]:
        res = supabase.table('admission_scores').select('*', count='exact').eq('province', '海南').eq('year', year).execute()
        print(f"  {year}年: {res.count} 条")

    # 有school_name的记录数
    res = supabase.table('admission_scores').select('*', count='exact').eq('province', '海南').neq('school_name', None).execute()
    print(f"  有school_name的记录数: {res.count}")

    # 学校数量（去重）
    res = supabase.table('admission_scores').select('school_name').eq('province', '海南').execute()
    schools = set()
    for row in res.data:
        if row.get('school_name'):
            schools.add(row['school_name'])
    print(f"  学校数量(去重school_name): {len(schools)}")

    # 2. major_scores表
    print("\n" + "=" * 70)
    print("📋 major_scores 表（专业分数线）")
    print("=" * 70)

    result = supabase.table('major_scores').select('*', count='exact').eq('province', '海南').execute()
    print(f"  海南总记录数: {result.count}")

    for year in [2023, 2024, 2025]:
        res = supabase.table('major_scores').select('*', count='exact').eq('province', '海南').eq('year', year).execute()
        print(f"  {year}年: {res.count} 条")

    # 有school_name的记录数
    res = supabase.table('major_scores').select('*', count='exact').eq('province', '海南').neq('school_name', None).execute()
    print(f"  有school_name的记录数: {res.count}")

    # 学校数量（去重）
    res = supabase.table('major_scores').select('school_name').eq('province', '海南').execute()
    schools = set()
    for row in res.data:
        if row.get('school_name'):
            schools.add(row['school_name'])
    print(f"  学校数量(去重school_name): {len(schools)}")

    # 3. 验证：admission_scores前10条记录
    print("\n" + "=" * 70)
    print("📋 admission_scores 前10条记录（2025年）")
    print("=" * 70)
    res = supabase.table('admission_scores').select('*').eq('province', '海南').eq('year', 2025).limit(10).execute()
    for i, row in enumerate(res.data):
        print(f"  {i+1}. {row.get('school_name', 'NULL')} - {row.get('score', 'NULL')}分 - subject_req={row.get('subject_requirement', 'NULL')}")

    # 4. 验证：major_scores前10条记录
    print("\n" + "=" * 70)
    print("📋 major_scores 前10条记录（2025年）")
    print("=" * 70)
    res = supabase.table('major_scores').select('*').eq('province', '海南').eq('year', 2025).limit(10).execute()
    for i, row in enumerate(res.data):
        print(f"  {i+1}. {row.get('school_name', 'NULL')} - {row.get('major_name', 'NULL')} - {row.get('min_score', 'NULL')}分")

    print("\n" + "=" * 70)
    print("✅ 检查完成")
    print("=" * 70)


if __name__ == '__main__':
    main()
