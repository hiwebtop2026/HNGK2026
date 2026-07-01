"""
海南高考各院校专业录取分数线爬取脚本
从掌上高考(gaokao.cn)获取近三年(2023-2025)的专业录取数据
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re

# 基础URL
BASE_URL = "https://www.gaokao.cn"

# 海南省各高校列表（部分重点高校，后续可扩展）
SCHOOL_IDS = {
    # 海南高校
    '261': '海南大学',
    '262': '海南师范大学',
    '263': '海南医科大学',
    '264': '海南热带海洋学院',
    '265': '海口经济学院',
    '266': '琼台师范学院',
    '267': '三亚学院',
    '268': '海南医学院',
    '269': '海南外国语职业学院',
    '270': '海南科技职业大学',
    
    # 北京高校（部分在海南招生）
    '1': '北京大学',
    '2': '清华大学',
    '3': '中国人民大学',
    '4': '北京师范大学',
    '5': '北京航空航天大学',
    '6': '北京理工大学',
    '7': '中国农业大学',
    '8': '北京邮电大学',
    '9': '中央财经大学',
    '10': '对外经济贸易大学',
    
    # 上海高校
    '101': '复旦大学',
    '102': '上海交通大学',
    '103': '同济大学',
    '104': '华东师范大学',
    '105': '上海财经大学',
    
    # 广东高校
    '201': '中山大学',
    '202': '华南理工大学',
    '203': '暨南大学',
    '204': '华南师范大学',
    '205': '深圳大学',
    '206': '南方医科大学',
}

def fetch_school_major_scores(school_id, school_name, year=2025):
    """获取某学校某年的专业录取分数线"""
    url = f"{BASE_URL}/gk-mb/{school_id}/{year}-46"
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        
        if response.status_code != 200:
            print(f"  ❌ {school_name}: HTTP {response.status_code}")
            return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找表格
        tables = soup.find_all('table')
        if not tables:
            # 尝试查找其他格式的数据
            return parse_alt_format(soup, school_id, school_name, year)
        
        data_list = []
        
        for table in tables:
            rows = table.find_all('tr')
            
            for row in rows:
                cells = row.find_all('td')
                
                # 跳过表头
                if len(cells) < 4:
                    continue
                
                try:
                    # 解析表格行
                    # 格式: 年份 | 专业名称 | 录取批次 | 最低分 | 最低位次 | 专业组 | 选科要求
                    year_text = cells[0].get_text().strip()
                    major_name = cells[1].get_text().strip()
                    batch = cells[2].get_text().strip()
                    min_score = cells[3].get_text().strip()
                    min_rank = cells[4].get_text().strip() if len(cells) > 4 else ''
                    group_num = cells[5].get_text().strip() if len(cells) > 5 else ''
                    subject_req = cells[6].get_text().strip() if len(cells) > 6 else ''
                    
                    if not major_name or not min_score:
                        continue
                    
                    # 解析分数和位次
                    try:
                        score = int(re.sub(r'[^\d]', '', str(min_score)))
                    except:
                        continue
                    
                    rank = None
                    if min_rank:
                        try:
                            rank = int(re.sub(r'[^\d]', '', str(min_rank)))
                        except:
                            pass
                    
                    # 解析选科要求
                    subject_code = parse_subject_requirement(subject_req)
                    
                    data_item = {
                        'school_id': school_id,
                        'school_name': school_name,
                        'year': int(year_text) if year_text.isdigit() else year,
                        'major_name': major_name,
                        'batch': batch,
                        'min_score': score,
                        'min_rank': rank,
                        'group_number': group_num,
                        'subject_requirement': subject_code,
                        'subject_requirement_text': subject_req,
                        'province': '海南',
                    }
                    
                    data_list.append(data_item)
                    
                except Exception as e:
                    continue
        
        if data_list:
            print(f"  ✅ {school_name}({year}): 获取{len(data_list)}条专业数据")
        else:
            print(f"  ⚠️ {school_name}({year}): 未找到数据")
        
        return data_list
        
    except Exception as e:
        print(f"  ❌ {school_name}({year}): {e}")
        return []

def parse_alt_format(soup, school_id, school_name, year):
    """解析替代格式的数据"""
    # 尝试从页面内容中提取数据
    data_list = []
    
    # 查找包含专业分数的表格
    for tr in soup.find_all('tr'):
        cells = tr.find_all('td')
        if len(cells) >= 4:
            try:
                text = cells[0].get_text().strip()
                if text.isdigit() and 2020 <= int(text) <= 2026:
                    year_text = text
                    major_name = cells[1].get_text().strip()
                    batch = cells[2].get_text().strip()
                    min_score_text = cells[3].get_text().strip()
                    
                    if major_name and min_score_text:
                        try:
                            score = int(re.sub(r'[^\d]', '', min_score_text))
                            data_list.append({
                                'school_id': school_id,
                                'school_name': school_name,
                                'year': int(year_text),
                                'major_name': major_name,
                                'batch': batch,
                                'min_score': score,
                                'min_rank': None,
                                'group_number': '',
                                'subject_requirement': '000',
                                'subject_requirement_text': '',
                                'province': '海南',
                            })
                        except:
                            pass
            except:
                pass
    
    return data_list

def parse_subject_requirement(text):
    """解析选科要求为代码"""
    text = text.strip()
    
    if not text or text == '不限':
        return '000'
    
    # 物化生
    if '物理' in text and '化学' in text and '生物' in text:
        return '456'
    if '物理' in text and '化学' in text:
        return '54'
    if '物理' in text and '生物' in text:
        return '46'
    if '化学' in text and '生物' in text:
        return '56'
    
    # 政史地
    if '政治' in text and '历史' in text:
        return '78'
    if '历史' in text and '地理' in text:
        return '89'
    if '政治' in text and '地理' in text:
        return '79'
    
    # 单科
    if '物理' in text:
        return '4'
    if '化学' in text:
        return '5'
    if '生物' in text:
        return '6'
    if '政治' in text:
        return '7'
    if '历史' in text:
        return '8'
    if '地理' in text:
        return '9'
    
    return '000'

def fetch_all_data():
    """获取所有高校的专业录取数据"""
    all_data = []
    
    print("=" * 60)
    print("海南高考各院校专业录取分数线爬取")
    print("=" * 60)
    
    for school_id, school_name in SCHOOL_IDS.items():
        print(f"\n正在获取 {school_name}...")
        
        for year in [2025, 2024, 2023]:
            data = fetch_school_major_scores(school_id, school_name, year)
            if data:
                all_data.extend(data)
            time.sleep(0.5)  # 避免请求过快
    
    return all_data

def save_to_json(data, filename='major_scores_data.json'):
    """保存到JSON文件"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n数据已保存到 {filename}")
    print(f"共 {len(data)} 条记录")

def main():
    print("=" * 60)
    print("海南高考专业录取分数线数据获取")
    print("=" * 60)
    
    # 获取数据
    all_data = fetch_all_data()
    
    if all_data:
        # 保存数据
        save_to_json(all_data)
        
        # 统计
        print("\n数据统计:")
        years = set(d['year'] for d in all_data)
        schools = set(d['school_name'] for d in all_data)
        
        for year in sorted(years):
            year_data = [d for d in all_data if d['year'] == year]
            print(f"  {year}年: {len(year_data)}条, {len(set(d['school_name'] for d in year_data))}所高校")
        
        print(f"  总计: {len(all_data)}条, {len(schools)}所高校")
    else:
        print("\n未获取到数据，请检查网络或数据源")

if __name__ == "__main__":
    main()