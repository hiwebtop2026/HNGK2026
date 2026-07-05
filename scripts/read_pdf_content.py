import pdfplumber

pdf_path = r'I:\迅雷下载\P020260625627884748040.pdf'

with pdfplumber.open(pdf_path) as pdf:
    print(f'总页数: {len(pdf.pages)}')
    for i, page in enumerate(pdf.pages):
        print(f'\n{"="*70}')
        print(f'第 {i+1} 页')
        print(f'{"="*70}')

        text = page.extract_text()
        if text:
            print(f'\n文本内容 (前2000字符):')
            print(text[:2000])
            if len(text) > 2000:
                print(f'\n... (共 {len(text)} 字符)')

        tables = page.extract_tables()
        if tables:
            print(f'\n表格数量: {len(tables)}')
            for j, table in enumerate(tables):
                print(f'\n--- 表格 {j+1} (共{len(table)}行) ---')
                for k, row in enumerate(table[:10]):
                    print(f'  行{k}: {row}')
                if len(table) > 10:
                    print(f'  ... (共{len(table)}行)')
