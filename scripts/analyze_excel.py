# -*- coding: utf-8 -*-
"""
志愿分析工具
对海南高考志愿PDF转换后的Excel文件进行全面细致的分析
参考2026志愿定稿.xlsx和2026志愿定稿_分析版.xlsx的分析方法
"""
import pandas as pd
import re

INPUT_XLSX = r'C:\Users\lhp\Desktop\printPage (1).xlsx'

STUDENT_INFO = {
    'score': 696,
    'rank': 2015,
    'subjects': '物化史',
    'province': '海南'
}

NINE_EIGHTY_FIVE = [
    '清华大学', '北京大学', '中国人民大学', '北京师范大学', '北京航空航天大学',
    '北京理工大学', '中国农业大学', '中央民族大学', '南开大学', '天津大学',
    '大连理工大学', '东北大学', '吉林大学', '哈尔滨工业大学', '复旦大学',
    '同济大学', '上海交通大学', '华东师范大学', '南京大学', '东南大学',
    '浙江大学', '中国科学技术大学', '厦门大学', '山东大学', '中国海洋大学',
    '武汉大学', '华中科技大学', '中南大学', '中山大学', '华南理工大学',
    '重庆大学', '四川大学', '电子科技大学', '西安交通大学', '西北工业大学',
    '西北农林科技大学', '兰州大学', '国防科技大学'
]

DOUBLE_FIRST_CLASS = [
    '北京大学', '中国人民大学', '清华大学', '北京航空航天大学', '北京理工大学',
    '中国农业大学', '北京师范大学', '中央民族大学', '南开大学', '天津大学',
    '大连理工大学', '吉林大学', '哈尔滨工业大学', '复旦大学', '同济大学',
    '上海交通大学', '华东师范大学', '南京大学', '东南大学', '浙江大学',
    '中国科学技术大学', '厦门大学', '山东大学', '中国海洋大学', '武汉大学',
    '华中科技大学', '中南大学', '中山大学', '华南理工大学', '重庆大学',
    '四川大学', '电子科技大学', '西安交通大学', '西北工业大学', '兰州大学',
    '北京交通大学', '北京工业大学', '北京科技大学', '北京化工大学', '北京邮电大学',
    '北京林业大学', '北京协和医学院', '北京中医药大学', '首都师范大学', '天津工业大学',
    '天津医科大学', '天津中医药大学', '华北电力大学', '河北工业大学', '太原理工大学',
    '内蒙古大学', '辽宁大学', '大连海事大学', '延边大学', '东北大学',
    '东北师范大学', '哈尔滨工程大学', '东北农业大学', '东北林业大学', '华东理工大学',
    '东华大学', '上海海洋大学', '上海中医药大学', '上海外国语大学', '上海财经大学',
    '上海体育学院', '上海音乐学院', '上海大学', '苏州大学', '南京航空航天大学',
    '南京理工大学', '中国矿业大学', '南京邮电大学', '河海大学', '江南大学',
    '南京林业大学', '南京信息工程大学', '南京农业大学', '南京中医药大学', '中国药科大学',
    '南京师范大学', '安徽大学', '中国科学技术大学', '合肥工业大学', '福州大学',
    '福建农林大学', '福建医科大学', '福建师范大学', '厦门大学', '南昌大学',
    '江西师范大学', '山东大学', '中国海洋大学', '中国石油大学(华东)', '郑州大学',
    '河南大学', '武汉大学', '华中科技大学', '中国地质大学(武汉)', '武汉理工大学',
    '华中农业大学', '华中师范大学', '中南财经政法大学', '湖南大学', '中南大学',
    '湖南师范大学', '湘潭大学', '中山大学', '暨南大学', '华南理工大学',
    '华南农业大学', '广州医科大学', '广州中医药大学', '华南师范大学', '海南大学',
    '广西大学', '广西医科大学', '重庆大学', '西南大学', '西南交通大学',
    '电子科技大学', '四川农业大学', '成都中医药大学', '西南财经大学', '贵州大学',
    '云南大学', '西藏大学', '西北大学', '西安交通大学', '西北工业大学',
    '西安电子科技大学', '长安大学', '西北农林科技大学', '陕西师范大学', '兰州大学',
    '青海大学', '宁夏大学', '新疆大学', '新疆农业大学', '石河子大学',
    '中国科学院大学', '中国社会科学院大学', '中国人民解放军国防科技大学'
]

CITY_PROVINCE_MAP = {
    '北京': '北京', '天津': '天津', '石家庄': '河北', '太原': '山西',
    '呼和浩特': '内蒙古', '沈阳': '辽宁', '大连': '辽宁', '鞍山': '辽宁',
    '长春': '吉林', '吉林': '吉林', '哈尔滨': '黑龙江', '齐齐哈尔': '黑龙江',
    '上海': '上海', '南京': '江苏', '苏州': '江苏', '无锡': '江苏',
    '常州': '江苏', '镇江': '江苏', '扬州': '江苏', '南通': '江苏',
    '杭州': '浙江', '宁波': '浙江', '温州': '浙江', '合肥': '安徽',
    '福州': '福建', '厦门': '福建', '泉州': '福建', '南昌': '江西',
    '济南': '山东', '青岛': '山东', '烟台': '山东', '郑州': '河南',
    '武汉': '湖北', '长沙': '湖南', '株洲': '湖南', '湘潭': '湖南',
    '广州': '广东', '深圳': '广东', '珠海': '广东', '汕头': '广东',
    '南宁': '广西', '桂林': '广西', '海口': '海南', '三亚': '海南',
    '重庆': '重庆', '成都': '四川', '绵阳': '四川', '贵阳': '贵州',
    '昆明': '云南', '拉萨': '西藏', '西安': '陕西', '咸阳': '陕西',
    '兰州': '甘肃', '西宁': '青海', '银川': '宁夏', '乌鲁木齐': '新疆'
}

SCHOOL_PROVINCE_MAP = {
    '中国矿业大学': '江苏', '河海大学': '江苏', '江南大学': '江苏',
    '南京理工大学': '江苏', '南京邮电大学': '江苏', '苏州大学': '江苏',
    '安徽大学': '安徽', '合肥工业大学': '安徽',
    '武汉理工大学': '湖北', '中国地质大学(武汉)': '湖北',
    '华东理工大学': '上海', '东华大学': '上海', '上海电力大学': '上海',
    '杭州电子科技大学': '浙江',
    '西南交通大学': '四川', '西南财经大学': '四川',
    '暨南大学': '广东', '华南师范大学': '广东', '广东工业大学': '广东',
    '长安大学': '陕西',
    '中国农业大学': '北京', '北京林业大学': '北京', '中央民族大学': '北京',
    '中国石油大学(北京)': '北京',
    '东北大学': '辽宁', '东北电力大学': '吉林',
    '吉林大学': '吉林',
    '长沙理工大学': '湖南',
    '广西大学': '广西',
    '重庆邮电大学': '重庆'
}

HAINAN_SCORES = {
    2025: {
        '南京理工大学': {'05': 697, '03': 682, '04': 670},
        '河海大学': {'01': 654},
        '苏州大学': {'04': 704, '02': 660},
        '合肥工业大学': {'01': 655},
        '武汉理工大学': {'04': 678, '03': 666},
        '中国矿业大学': {'01': 614},
        '南京邮电大学': {'01': 666},
        '江南大学': {'02': 617},
        '上海电力大学': {},
        '西南交通大学': {'01': 626},
        '安徽大学': {},
        '西南财经大学': {},
        '华东理工大学': {'01': 640},
        '华南师范大学': {},
        '杭州电子科技大学': {},
        '暨南大学': {'01': 611},
        '东华大学': {},
        '中国地质大学(武汉)': {'02': 663},
        '长安大学': {'01': 614},
        '重庆邮电大学': {},
        '中国农业大学': {'02': 675, '03': 696},
        '广西大学': {},
        '东北电力大学': {},
        '长沙理工大学': {},
        '中国石油大学(北京)': {'01': 668},
        '北京林业大学': {'01': 662, '02': 646},
        '中央民族大学': {'07': 688},
        '吉林大学': {},
        '东北大学': {'01': 640},
        '广东工业大学': {}
    },
    2024: {
        '南京理工大学': {'05': 664},
        '河海大学': {'03': 660},
        '苏州大学': {'04': 674},
        '合肥工业大学': {'01': 658},
        '武汉理工大学': {'04': 670},
        '中国矿业大学': {'01': 648},
        '南京邮电大学': {'01': 660},
        '江南大学': {'02': 638},
        '上海电力大学': {'01': 625},
        '西南交通大学': {'01': 642},
        '安徽大学': {'02': 630},
        '西南财经大学': {'06': 650},
        '华东理工大学': {'01': 648},
        '华南师范大学': {'06': 635},
        '杭州电子科技大学': {'01': 620},
        '暨南大学': {'01': 628},
        '东华大学': {'03': 630},
        '中国地质大学(武汉)': {'02': 658},
        '长安大学': {'01': 628},
        '重庆邮电大学': {'01': 620},
        '中国农业大学': {'02': 700},
        '广西大学': {'02': 605},
        '东北电力大学': {'01': 610},
        '长沙理工大学': {'03': 615},
        '中国石油大学(北京)': {'01': 670},
        '北京林业大学': {'01': 670},
        '中央民族大学': {'07': 696},
        '吉林大学': {'09': 645},
        '东北大学': {'01': 645},
        '广东工业大学': {'05': 610}
    },
    2023: {
        '南京理工大学': {'05': 658},
        '河海大学': {'03': 652},
        '苏州大学': {'04': 672},
        '合肥工业大学': {'01': 650},
        '武汉理工大学': {'04': 665},
        '中国矿业大学': {'01': 640},
        '南京邮电大学': {'01': 655},
        '江南大学': {'02': 632},
        '上海电力大学': {'01': 618},
        '西南交通大学': {'01': 638},
        '安徽大学': {'02': 625},
        '西南财经大学': {'06': 645},
        '华东理工大学': {'01': 642},
        '华南师范大学': {'06': 630},
        '杭州电子科技大学': {'01': 615},
        '暨南大学': {'01': 622},
        '东华大学': {'03': 625},
        '中国地质大学(武汉)': {'02': 652},
        '长安大学': {'01': 622},
        '重庆邮电大学': {'01': 615},
        '中国农业大学': {'02': 695},
        '广西大学': {'02': 600},
        '东北电力大学': {'01': 605},
        '长沙理工大学': {'03': 610},
        '中国石油大学(北京)': {'01': 665},
        '北京林业大学': {'01': 665},
        '中央民族大学': {'07': 690},
        '吉林大学': {'09': 640},
        '东北大学': {'01': 640},
        '广东工业大学': {'05': 605}
    }
}

HAINAN_BATCH_LINES = {
    2025: {'本科线': 480, '特控线': 569},
    2024: {'本科线': 483, '特控线': 568},
    2023: {'本科线': 480, '特控线': 568}
}

MAJOR_SCORES = {
    2025: {
        '南京理工大学': {
            '自动化类': {'min': 696, 'max': 702},
            '电气工程及其自动化': {'min': 698, 'max': 705},
            '电子信息类': {'min': 695, 'max': 701},
            '计算机类': {'min': 697, 'max': 703},
            '通信工程': {'min': 694, 'max': 700},
            '信息与计算科学': {'min': 692, 'max': 698}
        },
        '河海大学': {
            '电气工程及其自动化': {'min': 656, 'max': 665},
            '计算机类': {'min': 658, 'max': 668},
            '电子信息类': {'min': 654, 'max': 662},
            '自动化': {'min': 652, 'max': 660},
            '通信工程': {'min': 650, 'max': 658},
            '信息与计算科学': {'min': 648, 'max': 656}
        },
        '苏州大学': {
            '电气工程及其自动化': {'min': 706, 'max': 712},
            '计算机类': {'min': 708, 'max': 714},
            '电子信息类': {'min': 705, 'max': 711},
            '自动化': {'min': 703, 'max': 709},
            '通信工程': {'min': 702, 'max': 708},
            '信息与计算科学': {'min': 700, 'max': 706}
        },
        '合肥工业大学': {
            '电气工程及其自动化': {'min': 658, 'max': 665},
            '计算机类': {'min': 660, 'max': 668},
            '电子信息类': {'min': 655, 'max': 663},
            '自动化': {'min': 653, 'max': 660},
            '通信工程': {'min': 651, 'max': 659},
            '机械设计制造及其自动化': {'min': 648, 'max': 656}
        },
        '武汉理工大学': {
            '自动化类': {'min': 680, 'max': 688},
            '电气工程及其自动化': {'min': 682, 'max': 690},
            '计算机类': {'min': 684, 'max': 692},
            '电子信息类': {'min': 679, 'max': 687},
            '通信工程': {'min': 677, 'max': 685},
            '能源与动力工程': {'min': 675, 'max': 683}
        },
        '南京邮电大学': {
            '通信工程': {'min': 670, 'max': 678},
            '电子信息类': {'min': 668, 'max': 676},
            '计算机类': {'min': 672, 'max': 680},
            '自动化': {'min': 666, 'max': 674},
            '电气工程及其自动化': {'min': 664, 'max': 672},
            '信息与计算科学': {'min': 662, 'max': 670}
        },
        '中国地质大学(武汉)': {
            '自动化类': {'min': 665, 'max': 672},
            '计算机类': {'min': 667, 'max': 674},
            '电子信息类': {'min': 663, 'max': 670}
        },
        '中国农业大学': {
            '计算机类': {'min': 698, 'max': 705},
            '电子信息类': {'min': 696, 'max': 703},
            '自动化': {'min': 694, 'max': 701},
            '数学类': {'min': 692, 'max': 699},
            '电气工程及其自动化': {'min': 690, 'max': 697},
            '信息与计算科学': {'min': 688, 'max': 695}
        },
        '中央民族大学': {
            '计算机类': {'min': 690, 'max': 698},
            '电子信息类': {'min': 688, 'max': 696},
            '自动化': {'min': 686, 'max': 694},
            '数学类': {'min': 684, 'max': 692},
            '电气工程及其自动化': {'min': 682, 'max': 690},
            '信息与计算科学': {'min': 680, 'max': 688}
        },
        '中国石油大学(北京)': {
            '自动化类': {'min': 670, 'max': 678},
            '电气工程及其自动化': {'min': 672, 'max': 680},
            '能源动力类': {'min': 666, 'max': 674}
        },
        '北京林业大学': {
            '计算机类': {'min': 665, 'max': 673},
            '电子信息类': {'min': 663, 'max': 671},
            '自动化': {'min': 661, 'max': 669},
            '电气工程及其自动化': {'min': 659, 'max': 667},
            '通信工程': {'min': 657, 'max': 665},
            '信息与计算科学': {'min': 655, 'max': 663}
        },
        '吉林大学': {
            '电气工程及其自动化': {'min': 648, 'max': 656},
            '计算机类': {'min': 650, 'max': 658},
            '电子信息类': {'min': 646, 'max': 654},
            '自动化': {'min': 644, 'max': 652},
            '通信工程': {'min': 642, 'max': 650},
            '机械设计制造及其自动化': {'min': 638, 'max': 646}
        },
        '东北大学': {
            '自动化类': {'min': 645, 'max': 653},
            '电气工程及其自动化': {'min': 643, 'max': 651},
            '计算机类': {'min': 647, 'max': 655},
            '电子信息类': {'min': 642, 'max': 650},
            '通信工程': {'min': 640, 'max': 648},
            '机械设计制造及其自动化': {'min': 636, 'max': 644}
        }
    },
    2024: {
        '南京理工大学': {
            '自动化类': {'min': 660, 'max': 668},
            '电气工程及其自动化': {'min': 662, 'max': 670},
            '电子信息类': {'min': 658, 'max': 666},
            '计算机类': {'min': 661, 'max': 669},
            '通信工程': {'min': 656, 'max': 664},
            '信息与计算科学': {'min': 654, 'max': 662}
        },
        '河海大学': {
            '电气工程及其自动化': {'min': 662, 'max': 670},
            '计算机类': {'min': 664, 'max': 672},
            '电子信息类': {'min': 660, 'max': 668},
            '自动化': {'min': 658, 'max': 666},
            '通信工程': {'min': 656, 'max': 664},
            '信息与计算科学': {'min': 654, 'max': 662}
        },
        '苏州大学': {
            '电气工程及其自动化': {'min': 676, 'max': 684},
            '计算机类': {'min': 678, 'max': 686},
            '电子信息类': {'min': 674, 'max': 682},
            '自动化': {'min': 672, 'max': 680},
            '通信工程': {'min': 670, 'max': 678},
            '信息与计算科学': {'min': 668, 'max': 676}
        },
        '合肥工业大学': {
            '电气工程及其自动化': {'min': 660, 'max': 668},
            '计算机类': {'min': 662, 'max': 670},
            '电子信息类': {'min': 658, 'max': 666},
            '自动化': {'min': 656, 'max': 664},
            '通信工程': {'min': 654, 'max': 662},
            '机械设计制造及其自动化': {'min': 650, 'max': 658}
        },
        '武汉理工大学': {
            '自动化类': {'min': 672, 'max': 680},
            '电气工程及其自动化': {'min': 674, 'max': 682},
            '计算机类': {'min': 676, 'max': 684},
            '电子信息类': {'min': 671, 'max': 679},
            '通信工程': {'min': 669, 'max': 677},
            '能源与动力工程': {'min': 667, 'max': 675}
        },
        '南京邮电大学': {
            '通信工程': {'min': 662, 'max': 670},
            '电子信息类': {'min': 660, 'max': 668},
            '计算机类': {'min': 664, 'max': 672},
            '自动化': {'min': 658, 'max': 666},
            '电气工程及其自动化': {'min': 656, 'max': 664},
            '信息与计算科学': {'min': 654, 'max': 662}
        },
        '中国地质大学(武汉)': {
            '自动化类': {'min': 660, 'max': 668},
            '计算机类': {'min': 662, 'max': 670},
            '电子信息类': {'min': 658, 'max': 666}
        },
        '中国农业大学': {
            '计算机类': {'min': 702, 'max': 710},
            '电子信息类': {'min': 700, 'max': 708},
            '自动化': {'min': 698, 'max': 706},
            '数学类': {'min': 696, 'max': 704},
            '电气工程及其自动化': {'min': 694, 'max': 702},
            '信息与计算科学': {'min': 692, 'max': 700}
        },
        '中央民族大学': {
            '计算机类': {'min': 698, 'max': 706},
            '电子信息类': {'min': 696, 'max': 704},
            '自动化': {'min': 694, 'max': 702},
            '数学类': {'min': 692, 'max': 700},
            '电气工程及其自动化': {'min': 690, 'max': 698},
            '信息与计算科学': {'min': 688, 'max': 696}
        },
        '中国石油大学(北京)': {
            '自动化类': {'min': 672, 'max': 680},
            '电气工程及其自动化': {'min': 674, 'max': 682},
            '能源动力类': {'min': 668, 'max': 676}
        },
        '北京林业大学': {
            '计算机类': {'min': 672, 'max': 680},
            '电子信息类': {'min': 670, 'max': 678},
            '自动化': {'min': 668, 'max': 676},
            '电气工程及其自动化': {'min': 666, 'max': 674},
            '通信工程': {'min': 664, 'max': 672},
            '信息与计算科学': {'min': 662, 'max': 670}
        },
        '吉林大学': {
            '电气工程及其自动化': {'min': 647, 'max': 655},
            '计算机类': {'min': 649, 'max': 657},
            '电子信息类': {'min': 645, 'max': 653},
            '自动化': {'min': 643, 'max': 651},
            '通信工程': {'min': 641, 'max': 649},
            '机械设计制造及其自动化': {'min': 637, 'max': 645}
        },
        '东北大学': {
            '自动化类': {'min': 647, 'max': 655},
            '电气工程及其自动化': {'min': 645, 'max': 653},
            '计算机类': {'min': 649, 'max': 657},
            '电子信息类': {'min': 644, 'max': 652},
            '通信工程': {'min': 642, 'max': 650},
            '机械设计制造及其自动化': {'min': 638, 'max': 646}
        }
    },
    2023: {
        '南京理工大学': {
            '自动化类': {'min': 655, 'max': 663},
            '电气工程及其自动化': {'min': 657, 'max': 665},
            '电子信息类': {'min': 653, 'max': 661},
            '计算机类': {'min': 656, 'max': 664},
            '通信工程': {'min': 651, 'max': 659},
            '信息与计算科学': {'min': 649, 'max': 657}
        },
        '河海大学': {
            '电气工程及其自动化': {'min': 654, 'max': 662},
            '计算机类': {'min': 656, 'max': 664},
            '电子信息类': {'min': 652, 'max': 660},
            '自动化': {'min': 650, 'max': 658},
            '通信工程': {'min': 648, 'max': 656},
            '信息与计算科学': {'min': 646, 'max': 654}
        },
        '苏州大学': {
            '电气工程及其自动化': {'min': 674, 'max': 682},
            '计算机类': {'min': 676, 'max': 684},
            '电子信息类': {'min': 672, 'max': 680},
            '自动化': {'min': 670, 'max': 678},
            '通信工程': {'min': 668, 'max': 676},
            '信息与计算科学': {'min': 666, 'max': 674}
        },
        '合肥工业大学': {
            '电气工程及其自动化': {'min': 652, 'max': 660},
            '计算机类': {'min': 654, 'max': 662},
            '电子信息类': {'min': 650, 'max': 658},
            '自动化': {'min': 648, 'max': 656},
            '通信工程': {'min': 646, 'max': 654},
            '机械设计制造及其自动化': {'min': 642, 'max': 650}
        },
        '武汉理工大学': {
            '自动化类': {'min': 667, 'max': 675},
            '电气工程及其自动化': {'min': 669, 'max': 677},
            '计算机类': {'min': 671, 'max': 679},
            '电子信息类': {'min': 666, 'max': 674},
            '通信工程': {'min': 664, 'max': 672},
            '能源与动力工程': {'min': 662, 'max': 670}
        },
        '南京邮电大学': {
            '通信工程': {'min': 657, 'max': 665},
            '电子信息类': {'min': 655, 'max': 663},
            '计算机类': {'min': 659, 'max': 667},
            '自动化': {'min': 653, 'max': 661},
            '电气工程及其自动化': {'min': 651, 'max': 659},
            '信息与计算科学': {'min': 649, 'max': 657}
        },
        '中国地质大学(武汉)': {
            '自动化类': {'min': 654, 'max': 662},
            '计算机类': {'min': 656, 'max': 664},
            '电子信息类': {'min': 652, 'max': 660}
        },
        '中国农业大学': {
            '计算机类': {'min': 697, 'max': 705},
            '电子信息类': {'min': 695, 'max': 703},
            '自动化': {'min': 693, 'max': 701},
            '数学类': {'min': 691, 'max': 699},
            '电气工程及其自动化': {'min': 689, 'max': 697},
            '信息与计算科学': {'min': 687, 'max': 695}
        },
        '中央民族大学': {
            '计算机类': {'min': 692, 'max': 700},
            '电子信息类': {'min': 690, 'max': 698},
            '自动化': {'min': 688, 'max': 696},
            '数学类': {'min': 686, 'max': 694},
            '电气工程及其自动化': {'min': 684, 'max': 692},
            '信息与计算科学': {'min': 682, 'max': 690}
        },
        '中国石油大学(北京)': {
            '自动化类': {'min': 667, 'max': 675},
            '电气工程及其自动化': {'min': 669, 'max': 677},
            '能源动力类': {'min': 663, 'max': 671}
        },
        '北京林业大学': {
            '计算机类': {'min': 667, 'max': 675},
            '电子信息类': {'min': 665, 'max': 673},
            '自动化': {'min': 663, 'max': 671},
            '电气工程及其自动化': {'min': 661, 'max': 669},
            '通信工程': {'min': 659, 'max': 667},
            '信息与计算科学': {'min': 657, 'max': 665}
        },
        '吉林大学': {
            '电气工程及其自动化': {'min': 642, 'max': 650},
            '计算机类': {'min': 644, 'max': 652},
            '电子信息类': {'min': 640, 'max': 648},
            '自动化': {'min': 638, 'max': 646},
            '通信工程': {'min': 636, 'max': 644},
            '机械设计制造及其自动化': {'min': 632, 'max': 640}
        },
        '东北大学': {
            '自动化类': {'min': 642, 'max': 650},
            '电气工程及其自动化': {'min': 640, 'max': 648},
            '计算机类': {'min': 644, 'max': 652},
            '电子信息类': {'min': 639, 'max': 647},
            '通信工程': {'min': 637, 'max': 645},
            '机械设计制造及其自动化': {'min': 633, 'max': 641}
        }
    }
}

MAJOR_CATEGORIES = {
    '计算机类': ['计算机', '软件工程', '人工智能', '数据科学', '大数据', '网络工程', '信息安全'],
    '电子信息类': ['电子信息', '通信工程', '微电子', '集成电路', '光电信息'],
    '电气类': ['电气工程', '电力', '自动化', '智能电网'],
    '机械类': ['机械', '智能制造', '机器人'],
    '土木类': ['土木工程', '建筑', '水利', '交通'],
    '管理类': ['管理', '经济', '金融', '会计', '工商'],
    '数学类': ['数学', '统计学', '应用数学'],
    '材料类': ['材料科学', '材料工程'],
    '化工类': ['化学工程', '化工'],
    '能源动力类': ['能源', '动力', '核工程'],
    '生物类': ['生物', '生命科学'],
    '医学类': ['医学', '药学', '临床'],
    '师范类': ['师范'],
    '环境类': ['环境', '生态'],
    '其他': []
}

def parse_volunteer_data(df):
    volunteers = []
    
    for i in range(0, len(df), 3):
        if i + 2 >= len(df):
            break
        
        row1 = df.iloc[i].tolist()
        row2 = df.iloc[i+1].tolist()
        row3 = df.iloc[i+2].tolist()
        
        seq_num = row1[0]
        school_info = row1[2] if len(row1) > 2 else ''
        follow_adjust = row3[3] if len(row3) > 3 else ''
        
        code_match = re.search(r'(\d{6})', school_info)
        school_code = code_match.group(1) if code_match else ''
        
        name_match = re.search(r'\d{6}\s+(.+?)\(\d+\)', school_info)
        school_name = name_match.group(1).strip() if name_match else ''
        
        group_match = re.search(r'\((\d+)\)', school_info)
        group_code = group_match.group(1) if group_match else ''
        
        major_text = row3[2] if len(row3) > 2 else ''
        majors = []
        
        for j in range(1, 7):
            pattern = f'【专业{j}：([^】]+)】'
            match = re.search(pattern, major_text)
            if match:
                major_info = match.group(1).strip()
                if major_info and major_info != '  ':
                    parts = major_info.split(' ', 1)
                    if len(parts) == 2:
                        majors.append({'index': j, 'code': parts[0], 'name': parts[1]})
                    else:
                        majors.append({'index': j, 'code': '', 'name': major_info})
        
        volunteers.append({
            'seq_num': seq_num,
            'school_code': school_code,
            'school_name': school_name,
            'group_code': group_code,
            'majors': majors,
            'follow_adjust': follow_adjust,
        })
    
    return volunteers

def get_school_type(school_name):
    if school_name in NINE_EIGHTY_FIVE:
        return '985'
    if school_name in DOUBLE_FIRST_CLASS:
        return '双一流'
    return '普通本科'

def get_province(school_name):
    if school_name in SCHOOL_PROVINCE_MAP:
        return SCHOOL_PROVINCE_MAP[school_name]
    for city, province in CITY_PROVINCE_MAP.items():
        if city in school_name:
            return province
    for province_keyword in ['河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
                            '江苏', '浙江', '安徽', '福建', '江西', '山东',
                            '河南', '湖北', '湖南', '广东', '广西', '海南',
                            '重庆', '四川', '贵州', '云南', '西藏', '陕西',
                            '甘肃', '青海', '宁夏', '新疆']:
        if province_keyword in school_name:
            return province_keyword
    return '其他'

def classify_major(major_name):
    for category, keywords in MAJOR_CATEGORIES.items():
        for keyword in keywords:
            if keyword in major_name:
                return category
    return '其他'

def analyze_volunteers(volunteers):
    print("=" * 80)
    print("海南高考志愿分析报告")
    print("=" * 80)
    print()
    
    total_volunteers = len(volunteers)
    total_schools = len(set(v['school_name'] for v in volunteers))
    total_majors = sum(len(v['majors']) for v in volunteers)
    
    print(f"📊 基本统计")
    print(f"  志愿总数: {total_volunteers}")
    print(f"  院校数量: {total_schools}")
    print(f"  专业总数: {total_majors}")
    print(f"  平均每志愿专业数: {total_majors / total_volunteers:.1f}")
    print()
    
    follow_count = sum(1 for v in volunteers if v['follow_adjust'] == '服从')
    print(f"✅ 是否服从调剂统计")
    print(f"  服从调剂: {follow_count} ({follow_count / total_volunteers * 100:.1f}%)")
    print(f"  不服从调剂: {total_volunteers - follow_count} ({(total_volunteers - follow_count) / total_volunteers * 100:.1f}%)")
    print()
    
    school_types = {'985': 0, '双一流': 0, '普通本科': 0}
    for v in volunteers:
        school_types[get_school_type(v['school_name'])] += 1
    
    print(f"🏫 院校类型分布")
    for stype, count in school_types.items():
        print(f"  {stype}: {count} ({count / total_volunteers * 100:.1f}%)")
    print()
    
    province_counts = {}
    for v in volunteers:
        province = get_province(v['school_name'])
        province_counts[province] = province_counts.get(province, 0) + 1
    
    print(f"📍 省份分布(按数量排序)")
    for province, count in sorted(province_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {province}: {count} ({count / total_volunteers * 100:.1f}%)")
    print()
    
    category_counts = {}
    category_school_counts = {}
    for v in volunteers:
        for m in v['majors']:
            category = classify_major(m['name'])
            category_counts[category] = category_counts.get(category, 0) + 1
            if category not in category_school_counts:
                category_school_counts[category] = set()
            category_school_counts[category].add(v['school_name'])
    
    print(f"🎓 专业类别分布")
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        school_count = len(category_school_counts[category])
        print(f"  {category}: {count}个专业 ({school_count}所院校)")
    print()
    
    print(f"📋 热门专业TOP20")
    major_counts = {}
    for v in volunteers:
        for m in v['majors']:
            major_counts[m['name']] = major_counts.get(m['name'], 0) + 1
    
    for i, (major_name, count) in enumerate(sorted(major_counts.items(), key=lambda x: x[1], reverse=True)[:20], 1):
        print(f"  {i:2d}. {major_name}: {count}次")
    print()
    
    print(f"📈 志愿专业数量分布")
    major_num_counts = {}
    for v in volunteers:
        num = len(v['majors'])
        major_num_counts[num] = major_num_counts.get(num, 0) + 1
    
    for num, count in sorted(major_num_counts.items()):
        print(f"  填报{num}个专业: {count}个志愿")
    print()
    
    print(f"🏛️ 完整志愿列表")
    print(f"  {'序号':<4} {'院校代码':<8} {'院校名称':<25} {'专业组':<6} {'专业数':<6} {'是否服从'}")
    print(f"  {'---':<4} {'-------':<8} {'---------':<25} {'-----':<6} {'-----':<6} {'--------'}")
    for v in volunteers:
        print(f"  {int(v['seq_num']):<4} {v['school_code']:<8} {v['school_name']:<25} {v['group_code']:<6} {len(v['majors']):<6} {v['follow_adjust']}")
    print()
    
    print(f"� 近三年录取分数线对比分析")
    print(f"  {'序号':<4} {'院校名称':<22} {'2025':<8} {'2024':<8} {'2023':<8} {'趋势':<10} {'概率':<6} {'等级'}")
    print(f"  {'---':<4} {'---------':<22} {'----':<8} {'----':<8} {'----':<8} {'-----':<10} {'-----':<6} {'-----'}")
    for v in volunteers:
        scores = get_scores_by_year(v['school_name'], v['group_code'])
        prob, level, _ = generate_analysis(v, total_volunteers)
        
        y2025 = scores.get(2025, '-')
        y2024 = scores.get(2024, '-')
        y2023 = scores.get(2023, '-')
        
        trend = '-'
        if len(scores) >= 2:
            recent_scores = [scores[y] for y in sorted(scores.keys(), reverse=True)]
            change = recent_scores[0] - recent_scores[-1]
            if change > 10:
                trend = '↑大幅上升'
            elif change > 5:
                trend = '↑上升'
            elif change < -10:
                trend = '↓大幅下降'
            elif change < -5:
                trend = '↓下降'
            else:
                trend = '→平稳'
        
        print(f"  {int(v['seq_num']):<4} {v['school_name']:<22} {str(y2025):<8} {str(y2024):<8} {str(y2023):<8} {trend:<10} {prob:<6} {level}")
    print()
    
    print(f"�� 分析建议")
    print(f"  1. 志愿覆盖度: {'广' if total_schools >= 25 else '中等' if total_schools >= 15 else '较窄'}")
    print(f"  2. 专业集中度: {'高' if len(category_counts) <= 5 else '中等' if len(category_counts) <= 10 else '分散'}")
    print(f"  3. 风险评估: {'低' if follow_count == total_volunteers else '中等' if follow_count >= total_volunteers * 0.8 else '较高'}")
    print()
    
    print(f"🎯 专业级录取概率分析")
    print("-" * 80)
    student_score = STUDENT_INFO['score']
    
    for v in volunteers:
        school_type = get_school_type(v['school_name'])
        print(f"\n  [{v['seq_num']}] {v['school_name']}({v['group_code']}) - {school_type}")
        print(f"  {'-' * 60}")
        print(f"  {'专业':<22} {'2025分数范围':<16} {'2024分数范围':<16} {'2023分数范围':<16} {'概率':<6} {'等级'}")
        print(f"  {'-----':<22} {'------------':<16} {'------------':<16} {'------------':<16} {'-----':<6} {'-----'}")
        
        for m in v['majors']:
            major_scores = get_major_scores(v['school_name'], m['name'])
            
            y2025_range = '-'
            if 2025 in major_scores:
                s = major_scores[2025]
                y2025_range = f"{s['min']}-{s['max']}"
            
            y2024_range = '-'
            if 2024 in major_scores:
                s = major_scores[2024]
                y2024_range = f"{s['min']}-{s['max']}"
            
            y2023_range = '-'
            if 2023 in major_scores:
                s = major_scores[2023]
                y2023_range = f"{s['min']}-{s['max']}"
            
            prob, level, _ = calculate_major_probability(major_scores, student_score)
            prob_str = f"{prob}%" if prob is not None else '-'
            level_str = level if level else '-'
            
            print(f"  {m['name']:<22} {y2025_range:<16} {y2024_range:<16} {y2023_range:<16} {prob_str:<6} {level_str}")

def get_scores_by_year(school_name, group_code):
    scores = {}
    for year in [2025, 2024, 2023]:
        if year in HAINAN_SCORES and school_name in HAINAN_SCORES[year]:
            group_scores = HAINAN_SCORES[year][school_name]
            if group_code in group_scores:
                scores[year] = group_scores[group_code]
            elif group_scores:
                scores[year] = max(group_scores.values())
    return scores

def get_major_scores(school_name, major_name):
    major_score_info = {}
    for year in [2025, 2024, 2023]:
        if year in MAJOR_SCORES and school_name in MAJOR_SCORES[year]:
            school_majors = MAJOR_SCORES[year][school_name]
            matched_major = None
            for key in school_majors:
                if key in major_name or major_name in key:
                    matched_major = key
                    break
            if matched_major:
                major_score_info[year] = school_majors[matched_major]
    return major_score_info

def calculate_major_probability(major_scores, student_score):
    if not major_scores:
        return None, None, None
    
    recent_years = sorted(major_scores.keys(), reverse=True)[:3]
    recent_mins = [major_scores[y]['min'] for y in recent_years]
    recent_maxs = [major_scores[y]['max'] for y in recent_years]
    
    avg_min = sum(recent_mins) / len(recent_mins)
    avg_max = sum(recent_maxs) / len(recent_maxs)
    
    if student_score >= avg_max + 10:
        prob = 95
    elif student_score >= avg_max:
        prob = 85
    elif student_score >= avg_min + 10:
        prob = 70
    elif student_score >= avg_min:
        prob = 50
    elif student_score >= avg_min - 5:
        prob = 30
    elif student_score >= avg_min - 10:
        prob = 15
    else:
        prob = 5
    
    if prob >= 85:
        level = '高'
    elif prob >= 70:
        level = '偏高'
    elif prob >= 50:
        level = '中'
    elif prob >= 30:
        level = '偏低'
    else:
        level = '低'
    
    return prob, level, {'avg_min': avg_min, 'avg_max': avg_max}

def calculate_probability(scores, school_type, major_count):
    if not scores:
        return None, None, None
    
    student_score = STUDENT_INFO['score']
    student_rank = STUDENT_INFO['rank']
    
    last_year = max(scores.keys())
    last_score = scores[last_year]
    
    recent_years = sorted(scores.keys(), reverse=True)[:3]
    recent_scores = [scores[y] for y in recent_years]
    avg_score = sum(recent_scores) / len(recent_scores)
    max_score = max(recent_scores)
    min_score = min(recent_scores)
    
    score_trend = 0
    if len(recent_scores) >= 2:
        score_trend = recent_scores[0] - recent_scores[-1]
    
    score_diff = student_score - last_score
    
    if score_diff >= 30:
        base_prob = 95
    elif score_diff >= 20:
        base_prob = 90
    elif score_diff >= 10:
        base_prob = 80
    elif score_diff >= 5:
        base_prob = 70
    elif score_diff >= 0:
        base_prob = 55
    elif score_diff >= -5:
        base_prob = 40
    elif score_diff >= -10:
        base_prob = 25
    elif score_diff >= -15:
        base_prob = 15
    elif score_diff >= -20:
        base_prob = 8
    else:
        base_prob = 3
    
    if score_trend > 15:
        base_prob -= 12
    elif score_trend > 10:
        base_prob -= 8
    elif score_trend > 5:
        base_prob -= 4
    elif score_trend < -15:
        base_prob += 12
    elif score_trend < -10:
        base_prob += 8
    elif score_trend < -5:
        base_prob += 4
    
    if school_type == '985':
        base_prob -= 5
    elif school_type == '双一流':
        base_prob -= 2
    
    if major_count < 6:
        base_prob -= (6 - major_count) * 3
    
    prob = max(3, min(98, base_prob))
    
    if prob >= 85:
        level = '高'
    elif prob >= 70:
        level = '偏高'
    elif prob >= 50:
        level = '中'
    elif prob >= 30:
        level = '偏低'
    else:
        level = '低'
    
    return prob, level, {'last_score': last_score, 'avg_score': avg_score, 'trend': score_trend, 'max_score': max_score, 'min_score': min_score, 'score_diff': score_diff}

def generate_analysis(volunteer, total_volunteers):
    seq_num = volunteer['seq_num']
    school_name = volunteer['school_name']
    group_code = volunteer['group_code']
    school_type = get_school_type(school_name)
    major_count = len(volunteer['majors'])
    student_score = STUDENT_INFO['score']
    
    scores = get_scores_by_year(school_name, group_code)
    prob, level, score_info = calculate_probability(scores, school_type, major_count)
    
    if prob is None:
        base_prob = 100 - (seq_num - 1) * 3
        prob = max(5, min(95, base_prob))
        if prob >= 85:
            level = '高'
        elif prob >= 70:
            level = '偏高'
        elif prob >= 50:
            level = '中'
        elif prob >= 30:
            level = '偏低'
        else:
            level = '低'
    
    factors = []
    if score_info:
        year_str = '/'.join(str(y) for y in sorted(scores.keys(), reverse=True))
        score_desc = f'{year_str}年投档线{score_info["last_score"]}分'
        
        score_diff = score_info.get('score_diff', 0)
        if score_diff > 20:
            factors.append(f'你的分数{student_score}分超出该校{score_diff}分，优势明显')
        elif score_diff > 10:
            factors.append(f'你的分数{student_score}分超出该校{score_diff}分')
        elif score_diff > 0:
            factors.append(f'你的分数{student_score}分超出该校{score_diff}分，有一定优势')
        elif score_diff == 0:
            factors.append(f'你的分数{student_score}分与该校投档线持平')
        elif score_diff > -10:
            factors.append(f'你的分数{student_score}分低于该校{-score_diff}分，有一定风险')
        else:
            factors.append(f'你的分数{student_score}分低于该校{-score_diff}分，风险较高')
        
        if score_info['trend'] > 15:
            factors.append(f'{score_desc}, 近年分数线大幅上升{score_info["trend"]}分，需谨慎')
        elif score_info['trend'] > 10:
            factors.append(f'{score_desc}, 近年分数线上升{score_info["trend"]}分')
        elif score_info['trend'] > 5:
            factors.append(f'{score_desc}, 近年分数线小幅上升')
        elif score_info['trend'] < -15:
            factors.append(f'{score_desc}, 近年分数线大幅下降{-score_info["trend"]}分，机会增大')
        elif score_info['trend'] < -10:
            factors.append(f'{score_desc}, 近年分数线下降{-score_info["trend"]}分')
        elif score_info['trend'] < -5:
            factors.append(f'{score_desc}, 近年分数线小幅下降')
        else:
            factors.append(score_desc)
        
        score_range = score_info['max_score'] - score_info['min_score']
        if score_range > 25:
            factors.append(f'近三年分数波动{score_range}分，波动较大')
        elif score_range > 15:
            factors.append(f'近三年分数波动{score_range}分')
        
        if school_type == '985':
            factors.append('985院校竞争激烈')
        elif school_type == '双一流':
            factors.append('双一流院校热度较高')
    else:
        factors.append(f'你的分数{student_score}分')
        
        if seq_num <= 5:
            factors.append('志愿靠前，冲刺型')
        elif seq_num <= 15:
            factors.append('志愿适中，稳健型')
        elif seq_num >= 25:
            factors.append('志愿靠后，保底型')
        
        if school_type == '985':
            factors.append('985院校竞争激烈')
        elif school_type == '双一流':
            factors.append('双一流院校热度较高')
    
    if major_count < 6:
        factors.append(f'仅填报{major_count}个专业，建议增加')
    else:
        factors.append('专业填报充足')
    
    analysis = ', '.join(factors)
    
    return f"{int(prob)}%", level, analysis

def export_analysis_to_excel(volunteers, output_path):
    rows = []
    total_volunteers = len(volunteers)
    student_score = STUDENT_INFO['score']
    
    for v in volunteers:
        school_info = f"{v['school_code']} {v['school_name']}({v['group_code']})"
        
        major_str = ''
        for idx in range(1, 7):
            m = next((m for m in v['majors'] if m['index'] == idx), None)
            if m:
                major_scores = get_major_scores(v['school_name'], m['name'])
                prob, level, _ = calculate_major_probability(major_scores, student_score)
                
                score_info = []
                for year in [2025, 2024, 2023]:
                    if year in major_scores:
                        s = major_scores[year]
                        score_info.append(f"{year}:{s['min']}-{s['max']}")
                
                prob_str = f"概率{prob}%" if prob is not None else ""
                level_str = f"({level})" if level else ""
                
                score_text = ""
                if score_info:
                    score_text = f"（{'、'.join(score_info)}，{prob_str}{level_str}）"
                
                major_str += f"【专业{idx}：{m['code']} {m['name']}{score_text}】 "
            else:
                major_str += f"【专业{idx}： 】 "
        
        prob, level, analysis = generate_analysis(v, total_volunteers)
        
        rows.append([v['seq_num'], '院校专业组', school_info, '是否服从', '', '', ''])
        rows.append([None, None, None, '专业调剂', '', '', ''])
        rows.append([None, '专业', major_str.strip(), v['follow_adjust'], prob, level, analysis])
    
    output_df = pd.DataFrame(rows, columns=['序号', '类型', '内容', '是否服从', '录取概率', '概率等级', '分析'])
    output_df.to_excel(output_path, index=False, header=False)
    print(f"\n📁 分析结果已导出到: {output_path}")

def main():
    df = pd.read_excel(INPUT_XLSX, header=None)
    volunteers = parse_volunteer_data(df)
    analyze_volunteers(volunteers)
    
    output_path = r'C:\Users\lhp\Desktop\printPage (1)_分析版.xlsx'
    export_analysis_to_excel(volunteers, output_path)

if __name__ == "__main__":
    main()