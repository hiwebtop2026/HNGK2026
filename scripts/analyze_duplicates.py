# -*- coding: utf-8 -*-
"""
分析admission_scores中的重复记录，找出原因
"""
import os
from collections import defaultdict

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    print("=" * 70)
    print("🔍 分析 admission_scores 重复记录原因")
    print("=" * 70)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 获取2025年所有海南数据
    print("\n📖 获取2025年海南数据...")
    res = supabase.table('admission_scores').select('*').eq('province', '海南').eq('year', 2025).execute()
    print(f"  共 {len(res.data)} 条记录")

    # 按(school_name, score)分组，找出重复
    groups = defaultdict(list)
    for row in res.data:
        key = (row['school_name'], row['score'])
        groups[key].append(row)

    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"  重复组数量: {len(duplicates)}")
    print(f"  涉及重复记录数: {sum(len(v) for v in duplicates.values())}")

    # 查看重复记录的差异
    print("\n📊 前20组重复记录详细对比:")
    for i, ((school, score), rows) in enumerate(list(duplicates.items())[:20]):
        print(f"\n  {i+1}. {school} - {score}分 ({len(rows)}条重复)")
        for j, row in enumerate(rows):
            print(f"     [{j}] subject_requirement={row.get('subject_requirement')}, subject={row.get('subject')}, "
                  f"major_group_code={row.get('major_group_code', 'N/A')}, "
                  f"major_group_name={row.get('major_group_name', 'N/A')[:20] if row.get('major_group_name') else 'N/A'}")

    # 统计重复的原因
    print("\n" + "=" * 70)
    print("📊 重复原因统计")
    print("=" * 70)
    
    reasons = defaultdict(int)
    for (school, score), rows in duplicates.items():
        subj_reqs = set()
        for r in rows:
            subj_req = r.get('subject_requirement') or ''
            subj_reqs.add(subj_req)
        
        if len(subj_reqs) == 1:
            # 选科要求完全相同，可能是完全重复
            reasons['完全重复(选科相同)'] += 1
        else:
            # 选科要求不同
            reasons['选科要求不同'] += 1
    
    for reason, count in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f"  {reason}: {count}组")

    # 查看完全重复的例子
    exact_dupes = [(k, v) for k, v in duplicates.items() 
                   if len(set(r.get('subject_requirement') or '' for r in v)) == 1]
    print(f"\n📊 完全重复示例（前10组，共{len(exact_dupes)}组）:")
    for i, ((school, score), rows) in enumerate(exact_dupes[:10]):
        # 检查所有字段是否相同
        keys = set()
        for r in rows:
            key_tuple = tuple(sorted((k, str(v)) for k, v in r.items() if k not in ['id', 'created_at', 'updated_at']))
            keys.add(key_tuple)
        is_identical = len(keys) == 1
        print(f"  {i+1}. {school} - {score}分 ({len(rows)}条) - 完全相同: {is_identical}")
        if not is_identical:
            # 找出不同字段
            for j in range(min(3, len(rows))):
                print(f"     [{j}]: { {k: v for k, v in rows[j].items() if k not in ['id','created_at','updated_at']} }")

    print("\n" + "=" * 70)
    print("✅ 分析完成")
    print("=" * 70)


if __name__ == '__main__':
    main()
