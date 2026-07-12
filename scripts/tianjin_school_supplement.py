# -*- coding: utf-8 -*-
"""
天津高考招生公办院校补充清单生成工具
功能：
1. 联网获取天津地区高考招生的全部公办院校列表
2. 对比已下载数据，生成需要补充的院校清单
3. 输出详细的统计报告
"""
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional, Any

SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")
SUPPLEMENT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_supplement_list.json")
LOG_FILE = os.path.join(os.path.dirname(__file__), "..", "logs", "tianjin_school_supplement.log")

os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

class Logger:
    @staticmethod
    def log(message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_line = f"[{timestamp}] {message}"
        print(log_line)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(log_line + "\n")

def load_schools() -> List[str]:
    if not os.path.exists(SCHOOLS_FILE):
        Logger.log(f"❌ 院校列表文件不存在: {SCHOOLS_FILE}")
        return []
    with open(SCHOOLS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_downloaded_schools() -> Dict[str, List[int]]:
    downloaded = {}
    if not os.path.exists(OUTPUT_DIR):
        return downloaded
    
    for filename in os.listdir(OUTPUT_DIR):
        if "_专业分数线.json" in filename:
            parts = filename.replace("_专业分数线.json", "").split("_")
            if len(parts) >= 2:
                school_name = "_".join(parts[:-1])
                year = int(parts[-1])
                if school_name not in downloaded:
                    downloaded[school_name] = []
                downloaded[school_name].append(year)
    
    return downloaded

def save_supplement_list(supplement_list: List[Dict], filename: str = SUPPLEMENT_FILE):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(supplement_list, f, ensure_ascii=False, indent=2)
    Logger.log(f"✅ 补充清单已保存: {filename}")

def fetch_all_tianjin_schools() -> List[str]:
    """联网获取天津地区高考招生全部公办院校列表"""
    Logger.log("\n📡 开始联网获取天津地区高考招生院校列表...")
    
    all_schools = []
    
    try:
        import requests
        from bs4 import BeautifulSoup
        
        sources = [
            {
                "url": "https://gaokao.chsi.com.cn/sch/search.do?searchType=school&province=12",
                "name": "学信网天津院校列表"
            },
            {
                "url": "https://www.eol.cn/e_html/gk/zt/2024/gxmd/tj.shtml",
                "name": "中国教育在线天津院校"
            },
            {
                "url": "https://gaokao.qnr.cn/school/tianjin/",
                "name": "求学网天津院校"
            }
        ]
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        for source in sources:
            try:
                Logger.log(f"   正在获取: {source['name']}")
                response = requests.get(source["url"], headers=headers, timeout=15)
                response.encoding = "utf-8"
                
                soup = BeautifulSoup(response.text, "html.parser")
                
                school_names = []
                for tag in soup.find_all(["a", "td", "div", "li"]):
                    text = tag.get_text(strip=True)
                    if len(text) >= 3 and len(text) <= 30:
                        if any(keyword in text for keyword in ["大学", "学院", "师范", "理工", "科技", "财经", "工业", "农业", "医科", "中医药"]):
                            school_names.append(text)
                
                all_schools.extend(school_names)
                Logger.log(f"     ✅ 获取到 {len(school_names)} 所院校")
                
            except Exception as e:
                Logger.log(f"     ❌ 获取失败: {e}")
            
            time.sleep(2)
        
        additional_schools = [
            "天津城建