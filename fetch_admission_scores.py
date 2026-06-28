"""
海南高考历年投档分数线数据获取脚本
从海南省考试局官网获取2023-2025年投档分数线数据
先保存到本地JSON文件
"""

import requests
from bs4 import BeautifulSoup
import re
import json
import time

DATA_SOURCES = {
    2025: "https://ea.hainan.gov.cn/ywdt/ptgkyjszsb/202507/t20250722_3901088.html",
    2024: "https://ea.hainan.gov.cn/ywdt/ptgkyjszsb/202407/t20240722_3701972.html",
    2023: "https://ea.hainan.gov.cn/ywdt/ptgkyjszsb/202307/t20230722_3460014.html",
}

def extract_school_name(group_name):
    match = re.match(r'^([^\(\)]+)', group_name)
    if match:
        return match.group(1).strip()
    return group_name.strip()

def extract_group_number(group_name):
    match = re.search(r'\((\d+)\)', group_name)
    if match:
        return f"({match.group(1)})"
    return ""

def fetch_admission_scores(year):
    url = DATA_SOURCES.get(year)
    if not url:
        print(f"未找到{year}年数据来源")
        return []
    
    print(f"正在获取{year}年数据: {url}")
    
    try:
        response = requests.get(url, timeout=30)
        response.encoding = 'utf-8'
        
        if response.status_code != 200:
            print(f"请求失败: {response.status_code}")
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        tables = soup.find_all('table')
        if not tables:
            print("未找到数据表格")
            return []
        
        data_list = []
        
        for table in tables:
            rows = table.find_all('tr')
            
            for row in rows:
                cells = row.find_all('td')
                
                if len(cells) < 4:
                    continue
                
                try:
                    group_code = cells[0].get_text().strip()
                    if not group_code or not group_code.isdigit():
                        continue
                    
                    if year in [2024, 2025]:
                        group_name = cells[1].get_text().strip()
                        subject_req = cells[2].get_text().strip()
                        score = cells[3].get_text().strip()
                        plan_count = None
                        admission_count = None
                    else:
                        group_name = cells[1].get_text().strip()
                        if len(cells) >= 6:
                            plan_count = cells[2].get_text().strip()
                            admission_count = cells[3].get_text().strip()
                            score = cells[4].get_text().strip()
                            subject_req = cells[5].get_text().strip()
                        elif len(cells) >= 4:
                            score = cells[2].get_text().strip()
                            subject_req = cells[3].get_text().strip() if len(cells) > 3 else None
                            plan_count = None
                            admission_count = None
                        else:
                            continue
                    
                    if not score or not score.isdigit():
                        continue
                    
                    score_int = int(score)
                    if score_int < 400 or score_int > 900:
                        continue
                    
                    school_name = extract_school_name(group_name)
                    group_number = extract_group_number(group_name)
                    school_code = group_code[:4] if len(group_code) >= 4 else group_code
                    
                    data_item = {
                        'year': year,
                        'group_code': group_code,
                        'group_name': group_name,
                        'school_name': school_name,
                        'school_code': school_code,
                        'group_number': group_number,
                        'subject_requirement': subject_req,
                        'score': score_int,
                        'plan_count': int(plan_count) if plan_count and plan_count.isdigit() else None,
                        'admission_count': int(admission_count) if admission_count and admission_count.isdigit() else None,
                        'batch_type': '本科普通批',
                    }
                    
                    data_list.append(data_item)
                    
                except Exception as e:
                    continue
        
        print(f"成功获取{year}年数据: {len(data_list)}条")
        return data_list
        
    except Exception as e:
        print(f"获取{year}年数据失败: {e}")
        return []

def main():
    print("=" * 60)
    print("海南高考历年投档分数线数据获取脚本")
    print("=" * 60)
    
    all_data = []
    
    for year in [2023, 2024, 2025]:
        data = fetch_admission_scores(year)
        if data:
            all_data.extend(data)
        time.sleep(1)
    
    print(f"\n总共获取{len(all_data)}条数据")
    
    with open('admission_scores_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"数据已保存到 admission_scores_data.json")
    
    print("\n数据统计:")
    for year in [2023, 2024, 2025]:
        year_data = [d for d in all_data if d['year'] == year]
        if year_data:
            print(f"  {year}年: {len(year_data)}条")
            scores = [d['score'] for d in year_data]
            print(f"    最高分: {max(scores)}")
            print(f"    最低分: {min(scores)}")
            print(f"    平均分: {sum(scores) // len(scores)}")

if __name__ == "__main__":
    main()