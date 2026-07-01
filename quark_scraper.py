"""
夸克高考专业录取分数线爬取脚本
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re

# 夸克高考URL格式
QUARK_BASE = "https://www.gaokao.cn"

def test_connection():
    """测试连接夸克高考"""
    url = f"{QUARK_BASE}/school/261"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        print(f"状态码: {response.status_code}")
        print(f"编码: {response.encoding}")
        print(f"内容长度: {len(response.text)}")
        return response
    except Exception as e:
        print(f"连接失败: {e}")
        return None

def fetch_page(url):
    """通用页面获取"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        return response
    except Exception as e:
        print(f"请求失败: {e}")
        return None

def parse_major_scores_page(html, school_name):
    """解析专业分数线页面"""
    soup = BeautifulSoup(html, 'html.parser')
    data_list = []
    
    # 尝试查找表格
    tables = soup.find_all('table')
    
    if tables:
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 4:
                    # 尝试解析数据行
                    cell_texts = [c.get_text().strip() for c in cells]
                    
                    # 检查是否是有效数据行（包含年份和专业名称）
                    if any(text.isdigit() and 2020 <= int(text) <= 2026 for text in cell_texts):
                        try:
                            data_item = parse_row_data(cells, school_name)
                            if data_item:
                                data_list.append(data_item)
                        except:
                            pass
    else:
        # 尝试其他格式
        # 查找包含分数的div或li
        for elem in soup.find_all(['div', 'li'], class_=lambda x: x and ('score' in x.lower() or 'major' in x.lower())):
            text = elem.get_text()
            if '分' in text:
                # 尝试解析
                pass
    
    return data_list

def parse_row_data(cells, school_name):
    """解析单行数据"""
    try:
        cell_texts = [c.get_text().strip() for c in cells]
        
        # 找到年份（通常在第一列或第二列）
        year = None
        year_idx = 0
        for i, text in enumerate(cell_texts):
            if text.isdigit() and 2020 <= int(text) <= 2026:
                year = int(text)
                year_idx = i
                break
        
        if year is None:
            return None
        
        # 专业名称（通常在年份后面）
        major_name = ''
        if year_idx + 1 < len(cell_texts):
            major_name = cell_texts[year_idx + 1]
        
        if not major_name:
            return None
        
        # 最低分（查找包含数字和"分"的单元格）
        min_score = None
        for text in cell_texts:
            match = re.search(r'(\d+)\s*分', text)
            if match:
                min_score = int(match.group(1))
                break
        
        if min_score is None:
            return None
        
        # 最低位次（可选）
        min_rank = None
        for text in cell_texts:
            if '位次' in text or '排名' in text:
                match = re.search(r'(\d+)', text)
                if match:
                    min_rank = int(match.group(1))
                    break
        
        # 选科要求
        subject_req = '000'
        for text in cell_texts:
            if any(x in text for x in ['物理', '化学', '生物', '历史', '政治', '地理']):
                subject_req = parse_subject_code(text)
                break
        
        return {
            'school_name': school_name,
            'year': year,
            'major_name': major_name,
            'min_score': min_score,
            'min_rank': min_rank,
            'subject_requirement': subject_req,
            'province': '海南',
        }
        
    except Exception as e:
        return None

def parse_subject_code(text):
    """解析选科要求"""
    text = str(text)
    
    if '物理' in text and '化学' in text:
        return '54'
    if '物理' in text and '生物' in text:
        return '46'
    if '化学' in text and '生物' in text:
        return '56'
    if '物理' in text:
        return '4'
    if '化学' in text:
        return '5'
    if '生物' in text:
        return '6'
    if '历史' in text:
        return '8'
    if '政治' in text:
        return '7'
    if '地理' in text:
        return '9'
    
    return '000'

def fetch_school_major_scores(school_id, school_name):
    """获取某学校的专业分数线"""
    all_data = []
    
    # 尝试不同的URL格式
    urls_to_try = [
        f"{QUARK_BASE}/gk-mb/{school_id}/504-46",  # 海南
        f"{QUARK_BASE}/school/{school_id}/majors",
        f"{QUARK_BASE}/major/{school_id}",
    ]
    
    for url in urls_to_try:
        response = fetch_page(url)
        if not response or response.status_code != 200:
            continue
        
        data = parse_major_scores_page(response.text, school_name)
        if data:
            all_data.extend(data)
            print(f"  ✅ {school_name}: 从 {url} 获取 {len(data)} 条")
            break
    
    if not all_data:
        print(f"  ⚠️ {school_name}: 未找到数据")
    
    return all_data

def main():
    print("=" * 60)
    print("夸克高考专业录取分数线爬取测试")
    print("=" * 60)
    
    # 测试连接
    print("\n1. 测试夸克高考连接...")
    response = test_connection()
    
    if not response:
        print("连接失败，尝试其他方式...")
    
    # 测试解析海南大学页面
    print("\n2. 测试解析海南大学页面...")
    test_url = f"{QUARK_BASE}/gk-mb/261/504-46"
    print(f"URL: {test_url}")
    
    response = fetch_page(test_url)
    if response:
        print(f"响应状态: {response.status_code}")
        print(f"内容预览: {response.text[:500]}...")
        
        # 保存页面内容用于分析
        with open('test_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("\n页面内容已保存到 test_page.html")
    
    # 列出可能的学校ID
    print("\n3. 常用高校ID:")
    schools = {
        '261': '海南大学',
        '262': '海南师范大学', 
        '263': '海南医科大学',
        '1': '北京大学',
        '2': '清华大学',
        '3': '中国人民大学',
    }
    for sid, name in schools.items():
        print(f"  {sid}: {name}")

if __name__ == "__main__":
    main()