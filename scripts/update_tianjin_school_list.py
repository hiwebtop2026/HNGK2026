# -*- coding: utf-8 -*-
"""
天津高考招生公办院校列表更新工具
功能：
1. 扩展天津高考招生院校列表，增加更多公办院校
2. 对比已下载数据，生成更完整的补充清单
"""
import json
import os
from datetime import datetime

SCHOOLS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_schools.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_scores")
SUPPLEMENT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "tianjin_supplement_list.json")

additional_public_schools = [
    "中国人民警察大学",
    "中国刑事警察学院",
    "中国人民武装警察部队工程大学",
    "中国人民武装警察部队警官学院",
    "中国人民武装警察部队后勤学院",
    "中央司法警官学院",
    "铁道警察学院",
    "南京森林警察学院",
    "北京电子科技学院",
    "国际关系学院",
    "外交学院",
    "中国青年政治学院",
    "上海海关学院",
    "北京服装学院",
    "北京印刷学院",
    "北京物资学院",
    "北京信息科技大学",
    "北方工业大学",
    "首都经济贸易大学",
    "北京联合大学",
    "天津城建大学",
    "天津职业技术师范大学",
    "天津农学院",
    "天津美术学院",
    "天津体育学院",
    "中国民航大学",
    "河北地质大学",
    "河北工程大学",
    "河北科技大学",
    "河北农业大学",
    "河北师范大学",
    "河北经贸大学",
    "华北理工大学",
    "河北医科大学",
    "承德医学院",
    "河北中医学院",
    "山西大学",
    "太原理工大学",
    "山西农业大学",
    "山西医科大学",
    "山西师范大学",
    "中北大学",
    "山西财经大学",
    "内蒙古大学",
    "内蒙古科技大学",
    "内蒙古工业大学",
    "内蒙古农业大学",
    "内蒙古师范大学",
    "内蒙古医科大学",
    "辽宁大学",
    "大连理工大学",
    "东北大学",
    "大连海事大学",
    "辽宁工程技术大学",
    "沈阳工业大学",
    "沈阳航空航天大学",
    "沈阳理工大学",
    "辽宁科技大学",
    "辽宁石油化工大学",
    "沈阳化工大学",
    "大连工业大学",
    "辽宁工业大学",
    "沈阳建筑大学",
    "辽宁中医药大学",
    "沈阳药科大学",
    "沈阳医学院",
    "辽宁师范大学",
    "沈阳师范大学",
    "渤海大学",
    "东北财经大学",
    "吉林大学",
    "延边大学",
    "长春理工大学",
    "东北电力大学",
    "长春工业大学",
    "吉林建筑大学",
    "吉林农业大学",
    "长春中医药大学",
    "东北师范大学",
    "吉林师范大学",
    "长春师范大学",
    "吉林财经大学",
    "黑龙江大学",
    "哈尔滨工业大学",
    "哈尔滨工程大学",
    "东北农业大学",
    "东北林业大学",
    "哈尔滨理工大学",
    "黑龙江科技大学",
    "东北石油大学",
    "佳木斯大学",
    "黑龙江中医药大学",
    "哈尔滨医科大学",
    "牡丹江医学院",
    "哈尔滨师范大学",
    "齐齐哈尔大学",
    "大庆师范学院",
    "哈尔滨商业大学",
    "上海理工大学",
    "上海海事大学",
    "上海工程技术大学",
    "上海应用技术大学",
    "上海第二工业大学",
    "上海电机学院",
    "上海商学院",
    "上海政法学院",
    "华东政法大学",
    "上海体育学院",
    "上海音乐学院",
    "上海戏剧学院",
    "江苏大学",
    "扬州大学",
    "南京工业大学",
    "南京邮电大学",
    "南京信息工程大学",
    "南京林业大学",
    "南京医科大学",
    "南京中医药大学",
    "南京师范大学",
    "南京财经大学",
    "南京审计大学",
    "江苏科技大学",
    "常州大学",
    "苏州科技大学",
    "南通大学",
    "淮阴工学院",
    "盐城工学院",
    "江苏理工学院",
    "常熟理工学院",
    "南京工程学院",
    "浙江工业大学",
    "浙江理工大学",
    "浙江农林大学",
    "浙江中医药大学",
    "杭州师范大学",
    "浙江工商大学",
    "浙江财经大学",
    "杭州电子科技大学",
    "宁波大学",
    "温州大学",
    "浙江师范大学",
    "安徽大学",
    "合肥工业大学",
    "安徽理工大学",
    "安徽工业大学",
    "安徽农业大学",
    "安徽医科大学",
    "安徽中医药大学",
    "安徽师范大学",
    "安徽财经大学",
    "合肥学院",
    "安徽工程大学",
    "安徽建筑大学",
    "福建农林大学",
    "福建医科大学",
    "福建中医药大学",
    "福建师范大学",
    "集美大学",
    "闽南师范大学",
    "江西理工大学",
    "东华理工大学",
    "南昌航空大学",
    "江西农业大学",
    "江西中医药大学",
    "江西师范大学",
    "江西财经大学",
    "南昌工程学院",
    "山东理工大学",
    "山东农业大学",
    "山东科技大学",
    "青岛科技大学",
    "济南大学",
    "山东中医药大学",
    "山东师范大学",
    "曲阜师范大学",
    "山东财经大学",
    "青岛大学",
    "烟台大学",
    "聊城大学",
    "鲁东大学",
    "山东建筑大学",
    "河南大学",
    "河南理工大学",
    "河南工业大学",
    "河南科技大学",
    "河南农业大学",
    "河南中医药大学",
    "河南师范大学",
    "信阳师范大学",
    "河南财经政法大学",
    "郑州轻工业大学",
    "郑州航空工业管理学院",
    "武汉科技大学",
    "长江大学",
    "武汉工程大学",
    "武汉纺织大学",
    "武汉轻工大学",
    "湖北工业大学",
    "湖北中医药大学",
    "湖北师范大学",
    "湖北大学",
    "中南民族大学",
    "三峡大学",
    "长沙理工大学",
    "湖南科技大学",
    "湘潭大学",
    "湖南农业大学",
    "湖南中医药大学",
    "湖南师范大学",
    "吉首大学",
    "南华大学",
    "广东工业大学",
    "广州大学",
    "广东医科大学",
    "广东药科大学",
    "华南师范大学",
    "华南农业大学",
    "广东外语外贸大学",
    "汕头大学",
    "深圳大学",
    "广西大学",
    "桂林理工大学",
    "桂林电子科技大学",
    "广西医科大学",
    "广西中医药大学",
    "广西师范大学",
    "海南大学",
    "海南师范大学",
    "重庆邮电大学",
    "重庆交通大学",
    "重庆医科大学",
    "重庆师范大学",
    "西南政法大学",
    "重庆工商大学",
    "重庆理工大学",
    "重庆科技学院",
    "成都理工大学",
    "西南科技大学",
    "四川轻化工大学",
    "西华大学",
    "四川农业大学",
    "成都中医药大学",
    "四川师范大学",
    "西华师范大学",
    "西南财经大学",
    "贵州大学",
    "贵州医科大学",
    "贵州中医药大学",
    "贵州师范大学",
    "贵州财经大学",
    "云南大学",
    "昆明理工大学",
    "云南农业大学",
    "云南中医药大学",
    "云南师范大学",
    "云南财经大学",
    "西藏大学",
    "西藏民族大学",
    "西北大学",
    "西安理工大学",
    "西安工业大学",
    "西安建筑科技大学",
    "西安科技大学",
    "西安石油大学",
    "陕西科技大学",
    "西安工程大学",
    "陕西中医药大学",
    "陕西师范大学",
    "延安大学",
    "西安财经大学",
    "西北政法大学",
    "西安外国语大学",
    "兰州大学",
    "兰州理工大学",
    "兰州交通大学",
    "甘肃农业大学",
    "甘肃中医药大学",
    "西北师范大学",
    "青海大学",
    "青海师范大学",
    "宁夏大学",
    "宁夏医科大学",
    "新疆大学",
    "新疆农业大学",
    "新疆医科大学",
    "新疆师范大学",
    "石河子大学",
    "塔里木大学",
    "中国科学院大学",
    "南方科技大学",
    "上海科技大学",
    "西湖大学",
    "北京协和医学院",
    "北京科技大学天津学院",
    "北京邮电大学世纪学院",
    "北京工业大学耿丹学院",
    "首都师范大学科德学院",
    "北京工商大学嘉华学院",
    "天津天狮学院",
    "南开大学滨海学院",
    "天津师范大学津沽学院",
    "天津理工大学中环信息学院",
    "天津商业大学宝德学院",
    "天津医科大学临床医学院",
    "天津大学仁爱学院",
    "天津财经大学珠江学院",
    "天津体育学院运动与文化艺术学院",
    "天津外国语大学滨海外事学院",
]

def get_downloaded_schools() -> set:
    downloaded = set()
    if os.path.exists(OUTPUT_DIR):
        for filename in os.listdir(OUTPUT_DIR):
            if '_专业分数线.json' in filename:
                school_name = filename.split('_')[0]
                downloaded.add(school_name)
    return downloaded

def update_school_list():
    existing_schools = []
    if os.path.exists(SCHOOLS_FILE):
        with open(SCHOOLS_FILE, "r", encoding="utf-8") as f:
            existing_schools = json.load(f)
    
    existing_set = set(existing_schools)
    new_schools = [s for s in additional_public_schools if s not in existing_set]
    
    updated_schools = sorted(list(existing_set | set(additional_public_schools)))
    
    with open(SCHOOLS_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_schools, f, ensure_ascii=False, indent=2)
    
    downloaded = get_downloaded_schools()
    missing = sorted([s for s in updated_schools if s not in downloaded])
    
    private_keywords = ['学院', '独立学院', '民办', '天狮', '滨海学院', '津沽学院', '宝德学院', 
                        '仁爱学院', '珠江学院', '中环信息学院', '临床医学院', '运动与文化艺术学院',
                        '滨海外事学院', '世纪学院', '耿丹学院', '科德学院', '嘉华学院']
    
    public_missing = []
    private_missing = []
    
    for school in missing:
        is_private = False
        for keyword in private_keywords:
            if keyword in school and school not in ['中国民航大学', '中央司法警官学院', '铁道警察学院', 
                                                    '南京森林警察学院', '北京电子科技学院', '国际关系学院',
                                                    '外交学院', '上海海关学院', '天津音乐学院', '天津美术学院',
                                                    '天津体育学院', '中国人民警察大学', '中国刑事警察学院',
                                                    '北京信息科技大学', '北京联合大学', '天津城建大学',
                                                    '天津农学院', '天津职业技术师范大学', '北京服装学院',
                                                    '北京印刷学院', '北京物资学院', '北方工业大学',
                                                    '首都经济贸易大学', '北京科技大学天津学院']:
                is_private = True
                break
        
        if is_private:
            private_missing.append(school)
        else:
            public_missing.append(school)
    
    supplement_data = {
        "generated_at": datetime.now().isoformat(),
        "total_schools_in_list": len(updated_schools),
        "downloaded_schools": len(downloaded),
        "missing_schools": len(missing),
        "existing_schools": len(existing_schools),
        "new_added_schools": len(new_schools),
        "public_supplement": public_missing,
        "private_supplement": private_missing,
        "note": "公办院校需要补充专业分数线数据，民办/独立学院可根据需要决定是否补充",
        "correction": "西湖大学是公办新型研究型大学"
    }
    
    with open(SUPPLEMENT_FILE, "w", encoding="utf-8") as f:
        json.dump(supplement_data, f, ensure_ascii=False, indent=2)
    
    print("=" * 70)
    print("天津高考招生院校列表更新完成")
    print("=" * 70)
    print()
    print("📊 更新统计")
    print("-" * 30)
    print("原有院校数:", len(existing_schools))
    print("新增院校数:", len(new_schools))
    print("更新后总数:", len(updated_schools))
    print("已下载院校:", len(downloaded))
    print("缺失院校:", len(missing))
    print()
    print("📋 需补充公办院校（", len(public_missing), "所）")
    print("-" * 30)
    for i, s in enumerate(public_missing[:20], 1):
        print("  %d. %s" % (i, s))
    if len(public_missing) > 20:
        print("  ... 还有 %d 所" % (len(public_missing) - 20))
    print()
    print("📋 民办/独立学院（", len(private_missing), "所，可选补充）")
    print("-" * 30)
    for i, s in enumerate(private_missing, 1):
        print("  %d. %s" % (i, s))
    print()
    print("✅ 院校列表已更新:", SCHOOLS_FILE)
    print("✅ 补充清单已生成:", SUPPLEMENT_FILE)

if __name__ == "__main__":
    update_school_list()
