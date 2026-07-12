# -*- coding: utf-8 -*-
"""
对比天津本地本科院校列表，找出已下载数据中缺失的院校
"""
import os
import json

# 天津本地本科院校完整列表（31所公办本科）
TIANJIN_LOCAL_UNIVERSITIES = [
    "南开大学", "天津大学", "天津科技大学", "天津工业大学", "中国民航大学",
    "天津理工大学", "天津农学院", "天津医科大学", "天津中医药大学", "天津师范大学",
    "天津职业技术师范大学", "天津外国语大学", "天津商业大学", "天津财经大学",
    "天津体育学院", "天津音乐学院", "天津美术学院", "天津城建大学",
    # 以下为民办本科
    "天津天狮学院", "天津外国语大学滨海外事学院", "天津体育学院运动与文化艺术学院",
    "天津商业大学宝德学院", "天津医科大学临床医学院", "南开大学滨海学院",
    "天津师范大学津沽学院", "天津理工大学中环信息学院", "北京科技大学天津学院",
    "天津大学仁爱学院", "天津财经大学珠江学院"
]

OUTPUT_DIR = r"I:\trae_projects\GAOKAO2026\data\tianjin_scores"

def get_downloaded_schools():
    downloaded = set()
    for filename in os.listdir(OUTPUT_DIR):
        if "_专业分数线.json" in filename:
            parts = filename.replace("_专业分数线.json", "").split("_")
            school_name = "_".join(parts[:-1])
            downloaded.add(school_name)
    return downloaded

def main():
    print("=" * 70)
    print("天津本地院校下载情况对比")
    print("=" * 70)
    
    downloaded = get_downloaded_schools()
    
    print(f"\n📊 天津本地本科院校总数: {len(TIANJIN_LOCAL_UNIVERSITIES)} 所")
    print(f"📊 已下载本地院校数: {len([s for s in TIANJIN_LOCAL_UNIVERSITIES if s in downloaded])} 所")
    
    # 找出缺失的本地院校
    missing_local = [s for s in TIANJIN_LOCAL_UNIVERSITIES if s not in downloaded]
    
    print(f"\n❌ 缺失的天津本地院校 ({len(missing_local)} 所):")
    for i, school in enumerate(sorted(missing_local), 1):
        print(f"   {i}. {school}")
    
    # 找出已下载的外地院校
    non_local_downloaded = [s for s in downloaded if s not in TIANJIN_LOCAL_UNIVERSITIES]
    
    print(f"\n📋 已下载的外地院校 ({len(non_local_downloaded)} 所):")
    for i, school in enumerate(sorted(non_local_downloaded), 1):
        if i <= 50:
            print(f"   {i}. {school}")
        else:
            print(f"   ... 还有 {len(non_local_downloaded) - 50} 所未显示")
            break
    
    # 保存缺失院校列表
    missing_list = {
        "missing_local_universities": sorted(missing_local),
        "count": len(missing_local),
        "downloaded_local_count": len([s for s in TIANJIN_LOCAL_UNIVERSITIES if s in downloaded]),
        "total_local_count": len(TIANJIN_LOCAL_UNIVERSITIES)
    }
    
    output_file = os.path.join(os.path.dirname(OUTPUT_DIR), "missing_tianjin_local_schools.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(missing_list, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 缺失院校列表已保存到: {output_file}")
    
    return missing_local

if __name__ == "__main__":
    main()
