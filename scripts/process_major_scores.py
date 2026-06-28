# -*- coding: utf-8 -*-
"""
夸克高考专业分数线数据导入工具
将导出的JSON数据导入到Supabase数据库
"""

import json
import os
import sys
from datetime import datetime

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def load_json_file(file_path):
    """加载JSON文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"读取文件失败 {file_path}: {e}")
        return None

def parse_major_scores_data(json_data, year):
    """解析夸克高考API返回的数据"""
    records = []

    try:
        # 夸克API返回格式
        data = json_data.get('data', {})
        if isinstance(data, dict):
            items = data.get('list', [])
        elif isinstance(data, list):
            items = data
        else:
            items = []

        for item in items:
            record = {
                'school_name': item.get('school_name', ''),
                'school_code': item.get('school_code', ''),
                'province': item.get('province_name', '海南'),
                'level': item.get('school_type', ''),
                'major_name': item.get('major_name', ''),
                'major_group': item.get('major_group_name', ''),
                'subject_requirement': item.get('subject_requirement', ''),
                'year': year,
                'min_score': item.get('min_score'),
                'min_rank': item.get('min_rank'),
                'avg_score': item.get('avg_score'),
                'batch': item.get('batch_name', ''),
                'batch_line': item.get('batch_line'),
                'batch_line_diff': item.get('batch_line_diff'),
                'person_count': item.get('person_count'),
                'source': '夸克高考',
            }
            records.append(record)

    except Exception as e:
        print(f"解析数据失败: {e}")

    return records

def print_data_preview(records, max_items=10):
    """打印数据预览"""
    if not records:
        print("  没有找到数据")
        return

    print(f"\n共解析到 {len(records)} 条记录")
    print("\n前10条数据预览:")
    print("-" * 80)

    for i, record in enumerate(records[:max_items]):
        print(f"{i+1}. {record['school_name']} - {record['major_name']}")
        print(f"   年份: {record['year']} | 最低分: {record['min_score']} | 批次: {record['batch']}")
        print(f"   专业组: {record['major_group']} | 科目要求: {record['subject_requirement']}")

    if len(records) > max_items:
        print(f"\n... 还有 {len(records) - max_items} 条记录")

def main():
    print("=" * 70)
    print("夸克高考专业分数线数据导入工具")
    print("=" * 70)

    # 数据目录
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    os.makedirs(data_dir, exist_ok=True)

    # 查找JSON文件
    json_files = []
    for year in [2023, 2024, 2025]:
        for pattern in [f'major_scores_{year}.json', f'major_scores_{year}_hainan.json']:
            file_path = os.path.join(data_dir, pattern)
            if os.path.exists(file_path):
                json_files.append((file_path, year))
                break

    if not json_files:
        # 检查scripts目录
        scripts_dir = os.path.dirname(os.path.abspath(__file__))
        for year in [2023, 2024, 2025]:
            for pattern in [f'major_scores_{year}.json', f'major_scores_{year}_hainan.json']:
                file_path = os.path.join(scripts_dir, pattern)
                if os.path.exists(file_path):
                    json_files.append((file_path, year))
                    break

    if not json_files:
        print("\n❌ 未找到数据文件")
        print("\n请将导出的JSON文件放到以下位置之一:")
        print(f"  1. {data_dir}")
        print(f"  2. {os.path.dirname(os.path.abspath(__file__))}")
        print("\n文件命名格式:")
        print("  - major_scores_2025.json")
        print("  - major_scores_2024.json")
        print("  - major_scores_2023.json")
        return

    # 处理每个文件
    all_records = []
    for file_path, year in json_files:
        print(f"\n📁 处理文件: {os.path.basename(file_path)}")

        json_data = load_json_file(file_path)
        if not json_data:
            continue

        records = parse_major_scores_data(json_data, year)
        print_data_preview(records)
        all_records.extend(records)

    if all_records:
        print("\n" + "=" * 70)
        print(f"✅ 共解析到 {len(all_records)} 条专业分数线数据")
        print("\n下一步:")
        print("1. 请先在 Supabase SQL Editor 中执行 supabase_major_scores.sql 创建表")
        print("2. 然后运行 import_major_scores.py 将数据导入到数据库")
        print("=" * 70)

        # 保存合并后的数据
        output_file = os.path.join(data_dir, 'major_scores_all.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_records, f, ensure_ascii=False, indent=2)
        print(f"\n💾 已保存到: {output_file}")
    else:
        print("\n⚠️ 未能解析到任何数据，请检查JSON文件格式")

if __name__ == '__main__':
    main()
