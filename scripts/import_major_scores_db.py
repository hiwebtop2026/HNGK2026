# -*- coding: utf-8 -*-
"""
夸克高考专业分数线数据导入到Supabase数据库
"""

import json
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

try:
    import psycopg2
except ImportError:
    print("正在安装 psycopg2...")
    os.system('pip install psycopg2-binary')
    import psycopg2

# Supabase 数据库配置（从环境变量派生）
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
_PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('http://', '').split('.')[0] if SUPABASE_URL else ''
SUPABASE_HOST = f'db.{_PROJECT_REF}.supabase.co' if _PROJECT_REF else os.environ.get('SUPABASE_DB_HOST', '')
SUPABASE_PORT = 5432
SUPABASE_DB = 'postgres'
SUPABASE_USER = 'postgres'
SUPABASE_PASSWORD = os.environ.get('SUPABASE_DB_PASSWORD', '')  # 需在 .env 中配置数据库密码

def get_db_connection():
    """获取数据库连接"""
    try:
        conn = psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            database=SUPABASE_DB,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            sslmode='require'
        )
        return conn
    except Exception as e:
        print(f"数据库连接失败: {e}")
        return None

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
        data = json_data.get('data', {})
        if isinstance(data, dict):
            items = data.get('list', [])
        elif isinstance(data, list):
            items = data
        else:
            items = []

        for item in items:
            record = (
                item.get('school_name', ''),
                item.get('school_code', ''),
                item.get('province_name', '海南'),
                item.get('school_type', ''),
                item.get('major_name', ''),
                item.get('major_group_name', ''),
                item.get('subject_requirement', ''),
                year,
                item.get('min_score'),
                item.get('min_rank'),
                item.get('avg_score'),
                item.get('batch_name', ''),
                item.get('batch_line'),
                item.get('batch_line_diff'),
                item.get('person_count'),
                '夸克高考'
            )
            records.append(record)

    except Exception as e:
        print(f"解析数据失败: {e}")

    return records

def insert_records(conn, records):
    """批量插入数据到数据库"""
    if not records:
        return 0

    cursor = conn.cursor()

    insert_query = """
    INSERT INTO major_scores (
        school_name, school_code, province, level, major_name,
        major_group, subject_requirement, year, min_score, min_rank,
        avg_score, batch, batch_line, batch_line_diff, person_count, source
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
    )
    ON CONFLICT DO NOTHING;
    """

    try:
        cursor.executemany(insert_query, records)
        conn.commit()
        inserted = cursor.rowcount
        return inserted
    except Exception as e:
        conn.rollback()
        print(f"插入数据失败: {e}")
        return 0
    finally:
        cursor.close()

def main():
    print("=" * 70)
    print("夸克高考专业分数线数据导入工具")
    print("=" * 70)

    # 检查密码
    if not SUPABASE_PASSWORD:
        print("\n⚠️ 请先设置数据库密码")
        print("\n方法1: 直接在脚本中修改 SUPABASE_PASSWORD 变量")
        print("方法2: 在环境变量中设置 SUPABASE_PASSWORD")
        print("方法3: 使用 Supabase Dashboard 获取连接字符串")
        return

    # 连接数据库
    print("\n正在连接数据库...")
    conn = get_db_connection()
    if not conn:
        return

    print("✅ 数据库连接成功")

    # 数据目录
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    os.makedirs(data_dir, exist_ok=True)

    # 查找JSON文件
    json_files = []
    for year in [2023, 2024, 2025]:
        for pattern in [f'major_scores_{year}.json', f'major_scores_{year}_hainan.json', f'major_scores_all.json']:
            file_path = os.path.join(data_dir, pattern)
            if os.path.exists(file_path):
                json_files.append((file_path, year))
                break

    if not json_files:
        print("\n❌ 未找到数据文件")
        print("\n请先将导出的JSON文件放到以下位置:")
        print(f"  {data_dir}")
        print("\n文件命名格式:")
        print("  - major_scores_2025.json")
        print("  - major_scores_2024.json")
        print("  - major_scores_2023.json")
        conn.close()
        return

    # 处理每个文件
    total_inserted = 0
    for file_path, year in json_files:
        print(f"\n📁 处理文件: {os.path.basename(file_path)}")

        json_data = load_json_file(file_path)
        if not json_data:
            continue

        records = parse_major_scores_data(json_data, year)
        print(f"  解析到 {len(records)} 条记录")

        if records:
            inserted = insert_records(conn, records)
            print(f"  ✅ 成功插入 {inserted} 条记录")
            total_inserted += inserted

    conn.close()

    print("\n" + "=" * 70)
    print(f"✅ 数据导入完成！共插入 {total_inserted} 条记录")
    print("=" * 70)

if __name__ == '__main__':
    main()
