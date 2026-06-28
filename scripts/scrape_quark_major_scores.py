# -*- coding: utf-8 -*-
"""
夸克高考专业分数线数据抓取脚本
使用夸克浏览器远程调试端口自动化抓取数据
"""

import pandas as pd
import json
import time
import re
from datetime import datetime

# Excel文件路径
EXCEL_FILE = r'C:\Users\lhp\Desktop\2023-2025年海南高考本科投档分数线.xlsx'

# 夸克浏览器远程调试地址
QUARK_DEBUG_URL = 'http://localhost:9222'

def read_schools_from_excel():
    """从Excel文件读取所有院校名称（去重）"""
    print("正在读取Excel文件...")

    try:
        dfs = []
        for year in [2023, 2024, 2025]:
            try:
                df = pd.read_excel(EXCEL_FILE, sheet_name=str(year), header=1)
                # 提取院校名称（去掉专业组编号）
                for col in df.columns:
                    if '名称' in col or 'name' in col.lower():
                        schools = df[col].dropna().unique()
                        dfs.extend(schools)
            except Exception as e:
                print(f"读取{year}年数据失败: {e}")

        # 提取唯一院校名称（去掉括号内容）
        unique_schools = set()
        for school in dfs:
            school_str = str(school)
            # 去掉括号及其内容
            school_name = re.sub(r'\([^)]*\)', '', school_str).strip()
            # 去掉末尾的数字
            school_name = re.sub(r'\d+$', '', school_name).strip()
            if school_name and len(school_name) >= 2:
                unique_schools.add(school_name)

        schools_list = sorted(list(unique_schools))
        print(f"共提取 {len(schools_list)} 个唯一院校名称")

        # 保存到文件
        with open('schools_list.json', 'w', encoding='utf-8') as f:
            json.dump(schools_list, f, ensure_ascii=False, indent=2)

        return schools_list

    except Exception as e:
        print(f"读取Excel文件失败: {e}")
        return []

def get_quark_browser_info():
    """获取夸克浏览器远程调试信息"""
    import urllib.request
    import urllib.error

    try:
        # 获取标签页列表
        url = f"{QUARK_DEBUG_URL}/json"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            tabs = json.loads(response.read().decode())
            return tabs
    except Exception as e:
        print(f"无法连接到夸克浏览器远程调试: {e}")
        print("请确保夸克浏览器已开启远程调试模式")
        return []

def extract_school_name(name):
    """从院校专业组名称中提取学校名称"""
    if pd.isna(name):
        return None
    name_str = str(name)
    # 去掉括号及其内容
    school_name = re.sub(r'\([^)]*\)', '', name_str).strip()
    return school_name if len(school_name) >= 2 else None

def main():
    print("=" * 60)
    print("夸克高考专业分数线数据抓取工具")
    print("=" * 60)

    # 步骤1: 读取院校列表
    schools = read_schools_from_excel()

    if not schools:
        print("未找到院校数据，请检查Excel文件")
        return

    # 显示前20个院校
    print("\n前20个院校名称:")
    for i, school in enumerate(schools[:20]):
        print(f"  {i+1}. {school}")
    print("  ...")

    # 步骤2: 检查夸克浏览器连接
    print("\n正在检查夸克浏览器连接...")
    tabs = get_quark_browser_info()

    if tabs:
        print(f"找到 {len(tabs)} 个浏览器标签页")
        for tab in tabs[:5]:
            print(f"  - {tab.get('title', '无标题')} ({tab.get('url', '无URL')[:50]}...)")
    else:
        print("未检测到夸克浏览器远程调试")

    print("\n" + "=" * 60)
    print("下一步操作:")
    print("1. 请在夸克浏览器中打开夸克高考页面")
    print("2. 在夸克浏览器中切换到海南省")
    print("3. 切换年份并查询各院校的专业分数线")
    print("4. 手动将数据导出或复制到文件中")
    print("=" * 60)

if __name__ == '__main__':
    main()
