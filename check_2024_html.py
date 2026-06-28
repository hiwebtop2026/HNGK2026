import requests
from bs4 import BeautifulSoup

url = 'https://ea.hainan.gov.cn/ywdt/ptgkyjszsb/202407/t20240722_3701972.html'
r = requests.get(url, timeout=30)
r.encoding = 'utf-8'
soup = BeautifulSoup(r.text, 'html.parser')

tables = soup.find_all('table')
print(f'表格数量: {len(tables)}')

for i, tbl in enumerate(tables):
    rows = tbl.find_all('tr')
    print(f'\n表格{i}行数: {len(rows)}')
    if rows:
        cols = rows[0].find_all(['td','th'])
        print(f'  首行列数: {len(cols)}')
        for j, c in enumerate(cols[:10]):
            text = c.get_text().strip()[:50]
            print(f'    列{j}: {text}')
        
        if len(rows) > 1:
            first_data_row = rows[1].find_all(['td','th'])
            print(f'\n  第一数据行:')
            for j, c in enumerate(first_data_row[:10]):
                text = c.get_text().strip()[:50]
                print(f'    列{j}: {text}')