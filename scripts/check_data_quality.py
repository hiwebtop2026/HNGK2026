from dotenv import load_dotenv
load_dotenv()

# -*- coding: utf-8 -*-
"""
深度检查admission_scores海南数据质量
"""
import os

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    print("=" * 70)
    print("🔍 admission_scores 海南数据深度检查")
    print("=" * 70)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. 按(school_name, year)统计每年每校记录数
    print("\n📊 各年份每校平均记录数:")
    for year in [2023, 2024, 2025]:
        res = supabase.table('admission_scores').select('school_name').eq('province', '海南').eq('year', year).execute()
        schools = [row['school_name'] for row in res.data if row.get('school_name')]
        unique_schools = len(set(schools))
        total = len(schools)
        avg = total / unique_schools if unique_schools > 0 else 0
        print(f"  {year}年: {total}条记录, {unique_schools}所学校, 平均每校{avg:.1f}个专业组")

    # 2. 每校记录数分布
    print("\n📊 2025年每校专业组数量分布:")
    res = supabase.table('admission_scores').select('school_name').eq('province', '海南').eq('year', 2025).execute()
    from collections import Counter
    counts = Counter(row['school_name'] for row in res.data if row.get('school_name'))
    
    distribution = Counter(counts.values())
    for n in sorted(distribution.keys()):
        print(f"  {n}个专业组: {distribution[n]}所学校")

    # 3. 检查专业组最多的学校
    print("\n📊 2025年专业组最多的20所学校:")
    top_schools = counts.most_common(20)
    for i, (name, count) in enumerate(top_schools):
        # 获取这些专业组的分数
        res2 = supabase.table('admission_scores').select('score, subject_requirement').eq('province', '海南').eq('year', 2025).eq('school_name', name).order('score').execute()
        scores = [f"{r['score']}({r.get('subject_requirement','?')})" for r in res2.data]
        print(f"  {i+1}. {name}: {count}个专业组 - 分数: {', '.join(scores[:5])}{'...' if len(scores)>5 else ''}")

    # 4. 检查是否有重复的(school_name, year, score)
    print("\n📊 检查重复数据(同校同年同分):")
    for year in [2023, 2024, 2025]:
        res = supabase.table('admission_scores').select('school_name, score').eq('province', '海南').eq('year', year).execute()
        seen = set()
        duplicates = 0
        for row in res.data:
            key = (row['school_name'], row['score'])
            if key in seen:
                duplicates += 1
            else:
                seen.add(key)
        print(f"  {year}年: {duplicates}条重复记录(school_name+score)")

    # 6. major_scores表学校数
    print("\n📊 major_scores学校数:")
    for year in [2023, 2024, 2025]:
        res = supabase.table('major_scores').select('school_name').eq('province', '海南').eq('year', year).execute()
        schools = set(row['school_name'] for row in res.data if row.get('school_name'))
        print(f"  {year}年: {len(schools)}所学校")

    # 7. 两表学校交集
    print("\n📊 两表学校交集:")
    res_adm = supabase.table('admission_scores').select('school_name').eq('province', '海南').eq('year', 2025).execute()
    res_maj = supabase.table('major_scores').select('school_name').eq('province', '海南').eq('year', 2025).execute()
    
    adm_schools = set(row['school_name'] for row in res_adm.data if row.get('school_name'))
    maj_schools = set(row['school_name'] for row in res_maj.data if row.get('school_name'))
    
    print(f"  admission_scores: {len(adm_schools)}所")
    print(f"  major_scores: {len(maj_schools)}所")
    print(f"  交集: {len(adm_schools & maj_schools)}所")
    print(f"  仅admission_scores: {len(adm_schools - maj_schools)}所")
    print(f"  仅major_scores: {len(maj_schools - adm_schools)}所")

    print("\n" + "=" * 70)
    print("✅ 检查完成")
    print("=" * 70)


if __name__ == '__main__':
    main()
