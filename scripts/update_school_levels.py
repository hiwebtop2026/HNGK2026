# -*- coding: utf-8 -*-
"""
院校层次信息优化工具
全面检查并更新院校的985、211、双一流等层次信息
"""
import re

SCHOOL_DATA_PATH = r'C:\Users\lhp\Documents\trae_projects\GAOKAO2026\src\data\schoolData.ts'

UNIVERSITY_985 = {
    '清华大学', '北京大学', '中国人民大学', '北京师范大学', '北京航空航天大学',
    '北京理工大学', '中国农业大学', '中央民族大学', '南开大学', '天津大学',
    '大连理工大学', '东北大学', '吉林大学', '哈尔滨工业大学', '复旦大学',
    '同济大学', '上海交通大学', '华东师范大学', '南京大学', '东南大学',
    '浙江大学', '中国科学技术大学', '厦门大学', '山东大学', '中国海洋大学',
    '武汉大学', '华中科技大学', '湖南大学', '中南大学', '中山大学',
    '华南理工大学', '四川大学', '重庆大学', '电子科技大学', '西安交通大学',
    '西北工业大学', '西北农林科技大学', '兰州大学', '国防科技大学',
}

UNIVERSITY_985_EXPANDED = UNIVERSITY_985 | {
    '北京大学医学部', '哈尔滨工业大学(深圳)', '哈尔滨工业大学(威海)', '东北大学秦皇岛分校',
    '大连理工大学(盘锦校区)', '山东大学威海分校', '中国人民大学(苏州校区)', '电子科技大学(沙河校区)',
    '复旦大学医学院', '上海交通大学医学院', '浙江大学医学院',
}

UNIVERSITY_211 = {
    '北京交通大学', '北京工业大学', '北京科技大学', '北京化工大学', '北京邮电大学',
    '北京林业大学', '北京中医药大学', '北京外国语大学', '中国传媒大学', '中央财经大学',
    '对外经济贸易大学', '北京体育大学', '中央音乐学院', '中国政法大学', '华北电力大学',
    '华北电力大学(北京)', '华北电力大学(保定)', '南开大学', '天津大学', '天津医科大学',
    '河北工业大学', '太原理工大学', '内蒙古大学', '辽宁大学', '大连理工大学',
    '东北大学', '大连海事大学', '吉林大学', '延边大学', '东北师范大学',
    '哈尔滨工业大学', '哈尔滨工程大学', '东北农业大学', '东北林业大学', '复旦大学',
    '同济大学', '上海交通大学', '华东理工大学', '东华大学', '上海海洋大学',
    '上海中医药大学', '华东师范大学', '上海外国语大学', '上海财经大学', '上海体育学院',
    '上海音乐学院', '上海大学', '南京大学', '苏州大学', '东南大学',
    '南京航空航天大学', '南京理工大学', '中国矿业大学', '中国矿业大学(北京)', '南京邮电大学',
    '河海大学', '江南大学', '南京林业大学', '南京农业大学', '南京中医药大学',
    '中国药科大学', '南京师范大学', '浙江大学', '宁波大学', '安徽大学',
    '合肥工业大学', '合肥工业大学(宣城校区)', '厦门大学', '福州大学', '福建农林大学',
    '福建师范大学', '南昌大学', '山东大学', '中国海洋大学', '中国石油大学(华东)',
    '郑州大学', '武汉大学', '华中科技大学', '中国地质大学(武汉)', '中国地质大学(北京)',
    '武汉理工大学', '华中农业大学', '华中师范大学', '中南财经政法大学', '湖南大学',
    '中南大学', '湖南师范大学', '中山大学', '暨南大学', '华南理工大学',
    '华南农业大学', '广州中医药大学', '华南师范大学', '海南大学', '广西大学',
    '四川大学', '重庆大学', '西南交通大学', '电子科技大学', '四川农业大学',
    '西南大学', '西南财经大学', '贵州大学', '云南大学', '西藏大学',
    '西北大学', '西安交通大学', '西北工业大学', '西安电子科技大学', '长安大学',
    '西北农林科技大学', '陕西师范大学', '兰州大学', '青海大学', '宁夏大学',
    '新疆大学', '石河子大学', '中国科学技术大学', '国防科技大学',
}

UNIVERSITY_DOUBLE_FIRST = UNIVERSITY_211 | {
    '中国科学院大学', '南方科技大学', '上海科技大学', '首都医科大学', '南京医科大学',
    '南京信息工程大学', '成都理工大学', '河南大学', '湘潭大学', '山西大学',
    '广州医科大学', '南方医科大学', '天津工业大学', '重庆邮电大学', '浙江工业大学',
    '广东工业大学', '江苏大学', '扬州大学', '北京协和医学院',
}

LEVEL_PRIORITY = ['985', '211', '双一流', '普通本科']

LEVEL_FIXES = {
    '浙江大学': '985',
    '浙江大学医学院': '985',
    '复旦大学医学院': '985',
    '上海交通大学医学院': '985',
    '杭州电子科技大学': '普通本科',
    '西安电子科技大学': '211',
    '西北大学': '211',
    '西南大学': '211',
    '南京邮电大学': '双一流',
    '南京信息工程大学': '双一流',
    '广州医科大学': '双一流',
    '宁波大学': '双一流',
    '广东工业大学': '普通本科',
    '重庆邮电大学': '普通本科',
    '浙江工业大学': '普通本科',
    '江苏大学': '普通本科',
    '扬州大学': '普通本科',
}

PROVINCE_FIXES = {
    '西安电子科技大学': '陕西',
    '西北大学': '陕西',
    '西北工业大学': '陕西',
    '西北农林科技大学': '陕西',
    '陕西师范大学': '陕西',
    '长安大学': '陕西',
    '兰州大学': '甘肃',
    '郑州大学': '河南',
    '南京医科大学': '江苏',
    '华东政法大学': '上海',
    '华北电力大学(保定)': '河北',
    '北京协和医学院': '北京',
    '南方科技大学': '广东',
    '上海科技大学': '上海',
    '中国科学院大学': '北京',
    '首都医科大学': '北京',
    '天津工业大学': '天津',
    '湘潭大学': '湖南',
    '山西大学': '山西',
    '成都理工大学': '四川',
    '浙江工业大学': '浙江',
    '广东工业大学': '广东',
    '江苏大学': '江苏',
    '扬州大学': '江苏',
    '河南大学': '河南',
    '哈尔滨工业大学(深圳)': '广东',
}


def extract_school_base_name(name):
    match = re.match(r'([^\(]+)', name)
    if match:
        return match.group(1).strip()
    return name


def get_correct_level(school_name):
    base_name = extract_school_base_name(school_name)
    
    if base_name in LEVEL_FIXES:
        return LEVEL_FIXES[base_name]
    
    if base_name in UNIVERSITY_985_EXPANDED:
        return '985'
    if base_name in UNIVERSITY_211:
        return '211'
    if base_name in UNIVERSITY_DOUBLE_FIRST:
        return '双一流'
    return '普通本科'


def get_correct_province(school_name):
    base_name = extract_school_base_name(school_name)
    
    if base_name in PROVINCE_FIXES:
        return PROVINCE_FIXES[base_name]
    
    return None


def update_school_data():
    with open(SCHOOL_DATA_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'\{\s*code:\s*[\'"]([^\'"]+)[\'"],\s*name:\s*[\'"]([^\'"]+)[\'"],\s*subject:\s*(\d+),\s*province:\s*[\'"]([^\'"]+)[\'"],\s*level:\s*[\'"]([^\'"]+)[\'"],\s*nature:\s*[\'"]([^\'"]+)[\'"],\s*score2025:\s*([\d.]+|null),\s*score2024:\s*([\d.]+|null),\s*score2023:\s*([\d.]+|null),\s*region:\s*[\'"]([^\'"]+)[\'"]\s*\}'
    
    matches = re.findall(pattern, content)
    
    level_changes = []
    province_changes = []
    
    for match in matches:
        code, name, subject, province, level, nature, score2025, score2024, score2023, region = match
        
        new_level = get_correct_level(name)
        new_province = get_correct_province(name)
        
        if new_level != level:
            old_str = f"name: '{name}', subject: {subject}, province: '{province}', level: '{level}'"
            new_str = f"name: '{name}', subject: {subject}, province: '{province}', level: '{new_level}'"
            content = content.replace(old_str, new_str, 1)
            level_changes.append((name, level, new_level))
        
        if new_province and new_province != province:
            old_str = f"name: '{name}', subject: {subject}, province: '{province}', level: '{new_level if new_level != level else level}'"
            new_str = f"name: '{name}', subject: {subject}, province: '{new_province}', level: '{new_level if new_level != level else level}'"
            content = content.replace(old_str, new_str, 1)
            province_changes.append((name, province, new_province))
    
    with open(SCHOOL_DATA_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n✅ 院校数据更新完成!")
    print(f"   层次修正: {len(level_changes)} 处")
    print(f"   省份修正: {len(province_changes)} 处")
    
    if level_changes:
        print(f"\n📋 层次修正详情:")
        for name, old, new in level_changes:
            print(f"   {name}: {old} → {new}")
    
    if province_changes:
        print(f"\n📍 省份修正详情:")
        for name, old, new in province_changes:
            print(f"   {name}: {old} → {new}")


def verify_school_data():
    with open(SCHOOL_DATA_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    pattern = r'\{\s*code:\s*[\'"]([^\'"]+)[\'"],\s*name:\s*[\'"]([^\'"]+)[\'"],\s*level:\s*[\'"]([^\'"]+)[\'"]'
    
    matches = re.findall(pattern, content)
    
    print(f"\n📊 院校层次分布统计:")
    level_counts = {}
    school_set = set()
    
    for code, name, level in matches:
        level_counts[level] = level_counts.get(level, 0) + 1
        school_set.add(extract_school_base_name(name))
    
    for level, count in sorted(level_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"   {level}: {count} 所院校")
    
    print(f"\n🏫 去重后院校总数: {len(school_set)}")
    
    print(f"\n🔍 985院校（按首字母排序）:")
    schools_985 = []
    for code, name, level in matches:
        if level == '985':
            base_name = extract_school_base_name(name)
            if base_name not in schools_985:
                schools_985.append(base_name)
    
    for school in sorted(schools_985):
        print(f"   ✅ {school}")


if __name__ == '__main__':
    print("🔧 开始优化院校层次信息...")
    update_school_data()
    verify_school_data()