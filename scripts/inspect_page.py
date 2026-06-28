# -*- coding: utf-8 -*-
"""
检查页面结构
"""

import time
import os
from selenium import webdriver

EDGE_DEBUG_PORT = 9222
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')

def ensure_dir(dir_path):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

def main():
    print('正在连接Edge浏览器...')
    
    try:
        options = webdriver.EdgeOptions()
        options.add_experimental_option('debuggerAddress', f'localhost:{EDGE_DEBUG_PORT}')
        driver = webdriver.Edge(options=options)
        print('✅ 连接成功！')
    except Exception as e:
        print(f'❌ 连接失败: {e}')
        return
    
    try:
        print(f'\n当前页面: {driver.title}')
        print(f'URL: {driver.current_url[:100]}...')
        
        ensure_dir(OUTPUT_DIR)
        
        html_file = os.path.join(OUTPUT_DIR, 'page_content.html')
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(driver.page_source)
        print(f'\n页面HTML已保存到: {html_file}')
        
        screenshot_file = os.path.join(OUTPUT_DIR, 'page_screenshot.png')
        driver.save_screenshot(screenshot_file)
        print(f'截图已保存到: {screenshot_file}')
        
        script = '''
        function analyzePage() {
            const info = {
                title: document.title,
                url: window.location.href,
                allClasses: [],
                listContainers: [],
                tables: [],
                buttons: [],
                tabs: []
            };
            
            const allElements = document.querySelectorAll('*');
            const classSet = new Set();
            allElements.forEach(el => {
                if (el.className && typeof el.className === 'string') {
                    el.className.split(/\\s+/).forEach(c => {
                        if (c) classSet.add(c);
                    });
                }
            });
            info.allClasses = Array.from(classSet).filter(c => 
                c.includes('list') || c.includes('item') || c.includes('major') || 
                c.includes('score') || c.includes('tab') || c.includes('year') ||
                c.includes('fen') || c.includes('shu') || c.includes('zhuanye')
            ).sort();
            
            document.querySelectorAll('[class*="list"], [class*="List"]').forEach(el => {
                if (el.children.length > 0) {
                    info.listContainers.push({
                        class: el.className,
                        childCount: el.children.length,
                        firstChildText: el.children[0] ? el.children[0].textContent.substring(0, 100) : ''
                    });
                }
            });
            
            document.querySelectorAll('table').forEach(table => {
                info.tables.push({
                    class: table.className,
                    rows: table.rows.length
                });
            });
            
            document.querySelectorAll('button, [role="button"], [class*="btn"], [class*="Btn"]').forEach(btn => {
                info.buttons.push({
                    text: btn.textContent.substring(0, 50),
                    class: btn.className
                });
            });
            
            document.querySelectorAll('[class*="tab"], [role="tab"]').forEach(tab => {
                info.tabs.push({
                    text: tab.textContent.substring(0, 50),
                    class: tab.className
                });
            });
            
            return info;
        }
        
        return analyzePage();
        '''
        
        print('\n正在分析页面结构...')
        info = driver.execute_script(script)
        
        print(f'\n📄 页面标题: {info["title"]}')
        print(f'\n🔍 相关的CSS类名:')
        for cls in info['allClasses'][:30]:
            print(f'   - {cls}')
        
        print(f'\n📋 列表容器 ({len(info["listContainers"])}个):')
        for i, lc in enumerate(info['listContainers'][:10]):
            print(f'   {i+1}. 类名: {lc["class"][:80]}')
            print(f'      子元素数: {lc["childCount"]}')
            print(f'      首个内容: {lc["firstChildText"][:80]}')
        
        print(f'\n📊 表格 ({len(info["tables"])}个):')
        for i, t in enumerate(info['tables']):
            print(f'   {i+1}. {t["class"][:60]} - {t["rows"]}行')
        
        print(f'\n🔘 按钮/标签 ({len(info["tabs"])}个Tab, {len(info["buttons"])}个按钮):')
        print('  Tabs:')
        for t in info['tabs'][:10]:
            print(f'   - {t["text"][:30]} ({t["class"][:40]})')
        print('  Buttons:')
        for b in info['buttons'][:15]:
            print(f'   - {b["text"][:30]} ({b["class"][:40]})')
        
        info_file = os.path.join(OUTPUT_DIR, 'page_analysis.json')
        import json
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(info, f, ensure_ascii=False, indent=2)
        print(f'\n📁 详细分析已保存到: {info_file}')
        
    except Exception as e:
        print(f'出错: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
