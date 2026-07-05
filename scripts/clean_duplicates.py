from dotenv import load_dotenv
load_dotenv()

# -*- coding: utf-8 -*-
"""
清理admission_scores表中的重复数据
策略：按(province, year, school_name, score, subject_requirement)去重，保留group_code更长、数据更完整的版本
"""
import os
from collections import defaultdict

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def calculate_quality_score(row):
    """计算数据质量分数，分数高的保留"""
    score = 0
    # group_code长度（4位院校码+2位专业组码=6位更完整）
    if row.get('group_code') and len(row['group_code']) >= 6:
        score += 10
    elif row.get('group_code'):
        score += 5
    # school_code有值更好
    if row.get('school_code') and len(row['school_code']) >= 4:
        score += 5
    # group_name有值更好
    if row.get('group_name'):
        score += 3
    # batch_type为"本科普通批"比"本科批"更具体
    if row.get('batch_type') and '普通批' in row['batch_type']:
        score += 2
    # plan_count/admission_count有具体数字更好（非0非null）
    if row.get('plan_count') and row['plan_count'] > 0:
        score += 2
    if row.get('admission_count') and row['admission_count'] > 0:
        score += 2
    return score


def main():
    print("=" * 70)
    print("🧹 清理 admission_scores 海南重复数据")
    print("=" * 70)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    total_deleted = 0

    for year in [2023, 2024, 2025]:
        print(f"\n📅 处理 {year} 年...")

        # 获取所有数据
        res = supabase.table('admission_scores').select('*').eq('province', '海南').eq('year', year).execute()
        all_rows = res.data
        print(f"  原始记录数: {len(all_rows)}")

        # 按(school_name, score, subject_requirement)分组
        groups = defaultdict(list)
        for row in all_rows:
            subj_req = row.get('subject_requirement') or ''
            # 规范化subject_requirement："000"和"0"视为相同
            if subj_req == '000' or subj_req == '0':
                norm_subj = '0'
            else:
                norm_subj = subj_req
            key = (row['school_name'], row['score'], norm_subj)
            groups[key].append(row)

        # 找出重复组
        duplicates = {k: v for k, v in groups.items() if len(v) > 1}
        print(f"  重复组: {len(duplicates)} 组")

        # 确定要删除的ID
        ids_to_delete = []
        for key, rows in duplicates.items():
            # 按质量分数排序，最高的保留
            rows_sorted = sorted(rows, key=lambda r: calculate_quality_score(r), reverse=True)
            # 保留第一条，删除其余的
            for row in rows_sorted[1:]:
                ids_to_delete.append(row['id'])

        print(f"  将删除: {len(ids_to_delete)} 条重复记录")

        # 批量删除
        if ids_to_delete:
            batch_size = 500
            for i in range(0, len(ids_to_delete), batch_size):
                batch = ids_to_delete[i:i + batch_size]
                res = supabase.table('admission_scores').delete().in_('id', batch).execute()
                print(f"    删除进度: {min(i + batch_size, len(ids_to_delete))}/{len(ids_to_delete)}")

        total_deleted += len(ids_to_delete)

        # 验证
        res = supabase.table('admission_scores').select('*', count='exact').eq('province', '海南').eq('year', year).execute()
        print(f"  清理后记录数: {res.count}")

    # 总体验证
    print("\n" + "=" * 70)
    res = supabase.table('admission_scores').select('*', count='exact').eq('province', '海南').execute()
    print(f"✅ 清理完成")
    print(f"   总共删除: {total_deleted} 条重复记录")
    print(f"   剩余总记录数: {res.count}")

    for year in [2023, 2024, 2025]:
        res = supabase.table('admission_scores').select('*', count='exact').eq('province', '海南').eq('year', year).execute()
        # 学校数
        res2 = supabase.table('admission_scores').select('school_name').eq('province', '海南').eq('year', year).execute()
        schools = set(r['school_name'] for r in res2.data if r.get('school_name'))
        print(f"   {year}年: {res.count}条记录, {len(schools)}所学校")

    print("=" * 70)


if __name__ == '__main__':
    main()
