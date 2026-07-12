from typing import Dict, List
import os
import json

PROVINCES_CONFIG: Dict[str, Dict] = {
    "北京": {
        "school_list_file": "beijing_schools.json",
        "output_dir": "beijing_scores",
        "log_file": "beijing_scraper.log",
        "province_name": "北京",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["综合"],
        "gaokao_mode": "3+3",
        "enabled": True,
    },
    "天津": {
        "school_list_file": "tianjin_schools.json",
        "output_dir": "tianjin_scores",
        "log_file": "tianjin_scraper.log",
        "province_name": "天津",
        "batch": "本科批A阶段",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["综合"],
        "gaokao_mode": "3+3",
        "enabled": True,
    },
    "河北": {
        "school_list_file": "hebei_schools.json",
        "output_dir": "hebei_scores",
        "log_file": "hebei_scraper.log",
        "province_name": "河北",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "山西": {
        "school_list_file": "shanxi_schools.json",
        "output_dir": "shanxi_scores",
        "log_file": "shanxi_scraper.log",
        "province_name": "山西",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "内蒙古": {
        "school_list_file": "neimenggu_schools.json",
        "output_dir": "neimenggu_scores",
        "log_file": "neimenggu_scraper.log",
        "province_name": "内蒙古",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "辽宁": {
        "school_list_file": "liaoning_schools.json",
        "output_dir": "liaoning_scores",
        "log_file": "liaoning_scraper.log",
        "province_name": "辽宁",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "吉林": {
        "school_list_file": "jilin_schools.json",
        "output_dir": "jilin_scores",
        "log_file": "jilin_scraper.log",
        "province_name": "吉林",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "黑龙江": {
        "school_list_file": "heilongjiang_schools.json",
        "output_dir": "heilongjiang_scores",
        "log_file": "heilongjiang_scraper.log",
        "province_name": "黑龙江",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "上海": {
        "school_list_file": "shanghai_schools.json",
        "output_dir": "shanghai_scores",
        "log_file": "shanghai_scraper.log",
        "province_name": "上海",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["综合"],
        "gaokao_mode": "3+3",
        "enabled": True,
    },
    "江苏": {
        "school_list_file": "jiangsu_schools.json",
        "output_dir": "jiangsu_scores",
        "log_file": "jiangsu_scraper.log",
        "province_name": "江苏",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "浙江": {
        "school_list_file": "zhejiang_schools.json",
        "output_dir": "zhejiang_scores",
        "log_file": "zhejiang_scraper.log",
        "province_name": "浙江",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["综合"],
        "gaokao_mode": "3+3",
        "enabled": True,
    },
    "安徽": {
        "school_list_file": "anhui_schools.json",
        "output_dir": "anhui_scores",
        "log_file": "anhui_scraper.log",
        "province_name": "安徽",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "福建": {
        "school_list_file": "fujian_schools.json",
        "output_dir": "fujian_scores",
        "log_file": "fujian_scraper.log",
        "province_name": "福建",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "江西": {
        "school_list_file": "jiangxi_schools.json",
        "output_dir": "jiangxi_scores",
        "log_file": "jiangxi_scraper.log",
        "province_name": "江西",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "山东": {
        "school_list_file": "shandong_schools.json",
        "output_dir": "shandong_scores",
        "log_file": "shandong_scraper.log",
        "province_name": "山东",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["综合"],
        "gaokao_mode": "3+3",
        "enabled": True,
    },
    "河南": {
        "school_list_file": "henan_schools.json",
        "output_dir": "henan_scores",
        "log_file": "henan_scraper.log",
        "province_name": "河南",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "湖北": {
        "school_list_file": "hubei_schools.json",
        "output_dir": "hubei_scores",
        "log_file": "hubei_scraper.log",
        "province_name": "湖北",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "湖南": {
        "school_list_file": "hunan_schools.json",
        "output_dir": "hunan_scores",
        "log_file": "hunan_scraper.log",
        "province_name": "湖南",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "广东": {
        "school_list_file": "guangdong_schools.json",
        "output_dir": "guangdong_scores",
        "log_file": "guangdong_scraper.log",
        "province_name": "广东",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "广西": {
        "school_list_file": "guangxi_schools.json",
        "output_dir": "guangxi_scores",
        "log_file": "guangxi_scraper.log",
        "province_name": "广西",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "海南": {
        "school_list_file": "hainan_schools.json",
        "output_dir": "hainan_scores",
        "log_file": "hainan_scraper.log",
        "province_name": "海南",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["综合"],
        "gaokao_mode": "3+3",
        "enabled": True,
    },
    "重庆": {
        "school_list_file": "chongqing_schools.json",
        "output_dir": "chongqing_scores",
        "log_file": "chongqing_scraper.log",
        "province_name": "重庆",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "enabled": True,
    },
    "四川": {
        "school_list_file": "sichuan_schools.json",
        "output_dir": "sichuan_scores",
        "log_file": "sichuan_scraper.log",
        "province_name": "四川",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "贵州": {
        "school_list_file": "guizhou_schools.json",
        "output_dir": "guizhou_scores",
        "log_file": "guizhou_scraper.log",
        "province_name": "贵州",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "云南": {
        "school_list_file": "yunnan_schools.json",
        "output_dir": "yunnan_scores",
        "log_file": "yunnan_scraper.log",
        "province_name": "云南",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "西藏": {
        "school_list_file": "xizang_schools.json",
        "output_dir": "xizang_scores",
        "log_file": "xizang_scraper.log",
        "province_name": "西藏",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["理科", "文科"],
        "gaokao_mode": "传统文理",
        "enabled": False,
    },
    "陕西": {
        "school_list_file": "shaanxi_schools.json",
        "output_dir": "shaanxi_scores",
        "log_file": "shaanxi_scraper.log",
        "province_name": "陕西",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "甘肃": {
        "school_list_file": "gansu_schools.json",
        "output_dir": "gansu_scores",
        "log_file": "gansu_scraper.log",
        "province_name": "甘肃",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "青海": {
        "school_list_file": "qinghai_schools.json",
        "output_dir": "qinghai_scores",
        "log_file": "qinghai_scraper.log",
        "province_name": "青海",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "宁夏": {
        "school_list_file": "ningxia_schools.json",
        "output_dir": "ningxia_scores",
        "log_file": "ningxia_scraper.log",
        "province_name": "宁夏",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["物理", "历史"],
        "gaokao_mode": "3+1+2",
        "mode_transition_year": 2026,
        "old_gaokao_mode": "传统文理",
        "old_subject_groups": ["理科", "文科"],
        "old_genre": "理科",
        "enabled": True,
    },
    "新疆": {
        "school_list_file": "xinjiang_schools.json",
        "output_dir": "xinjiang_scores",
        "log_file": "xinjiang_scraper.log",
        "province_name": "新疆",
        "batch": "本科批",
        "genre": "综合",
        "years": [2023, 2024, 2025],
        "subject_groups": ["理科", "文科"],
        "gaokao_mode": "传统文理",
        "enabled": True,
    },
}

SUPPORTED_PROVINCES: List[str] = [p for p, cfg in PROVINCES_CONFIG.items() if cfg.get("enabled", True)]
ENABLED_PROVINCES: List[str] = SUPPORTED_PROVINCES

def get_province_config(province: str) -> Dict:
    if province not in PROVINCES_CONFIG:
        raise ValueError(f"不支持的省份: {province}，支持的省份: {SUPPORTED_PROVINCES}")
    return PROVINCES_CONFIG[province]

def get_mode_for_year(province: str, year: int) -> Dict:
    config = get_province_config(province)
    transition_year = config.get("mode_transition_year", None)
    
    if transition_year is None or year >= transition_year:
        return {
            "gaokao_mode": config["gaokao_mode"],
            "subject_groups": config["subject_groups"],
            "genre": config["genre"],
        }
    
    old_mode = config.get("old_gaokao_mode", "传统文理")
    old_groups = config.get("old_subject_groups", ["理科", "文科"])
    
    return {
        "gaokao_mode": old_mode,
        "subject_groups": old_groups,
        "genre": config.get("old_genre", "理科"),
    }

def get_base_dir() -> str:
    return os.path.dirname(os.path.dirname(__file__))

def ensure_dirs(province: str) -> Dict[str, str]:
    config = get_province_config(province)
    base_dir = get_base_dir()
    
    paths = {
        "school_list_file": os.path.join(base_dir, "data", config["school_list_file"]),
        "output_dir": os.path.join(base_dir, "data", config["output_dir"]),
        "log_file": os.path.join(base_dir, "logs", config["log_file"]),
    }
    
    os.makedirs(os.path.dirname(paths["school_list_file"]), exist_ok=True)
    os.makedirs(paths["output_dir"], exist_ok=True)
    os.makedirs(os.path.dirname(paths["log_file"]), exist_ok=True)
    
    return paths

def check_school_list_exists(province: str) -> bool:
    paths = ensure_dirs(province)
    return os.path.exists(paths["school_list_file"])

def check_data_completed(province: str) -> Dict:
    config = get_province_config(province)
    paths = ensure_dirs(province)
    
    if not check_school_list_exists(province):
        return {
            "province": province,
            "completed": False,
            "school_list_exists": False,
            "total_schools": 0,
            "completed_schools": 0,
            "progress": 0,
            "missing_schools": [],
            "subject_groups": config.get("subject_groups", ["综合"]),
            "gaokao_mode": config.get("gaokao_mode", ""),
            "status": "院校列表不存在",
        }
    
    try:
        with open(paths["school_list_file"], "r", encoding="utf-8-sig") as f:
            schools = json.load(f)
    except json.JSONDecodeError:
        with open(paths["school_list_file"], "r", encoding="utf-8") as f:
            schools = json.load(f)
    
    subject_groups = config.get("subject_groups", ["综合"])
    years = config.get("years", [2023, 2024, 2025])
    
    completed_schools = 0
    missing_schools = []
    
    for school in schools:
        all_years_completed = True
        for year in years:
            all_groups_completed = True
            for sg in subject_groups:
                if sg and sg != "综合":
                    filename = f"{school}_{year}_{sg}_专业分数线.json"
                else:
                    filename = f"{school}_{year}_专业分数线.json"
                filepath = os.path.join(paths["output_dir"], filename)
                if not os.path.exists(filepath):
                    all_groups_completed = False
                    break
            if not all_groups_completed:
                all_years_completed = False
                break
        
        if all_years_completed:
            completed_schools += 1
        else:
            missing_schools.append(school)
    
    total_schools = len(schools)
    completed = total_schools > 0 and completed_schools == total_schools
    
    return {
        "province": province,
        "completed": completed,
        "school_list_exists": True,
        "total_schools": total_schools,
        "completed_schools": completed_schools,
        "progress": round(completed_schools / total_schools * 100, 2) if total_schools > 0 else 0,
        "missing_schools": missing_schools,
        "missing_count": len(missing_schools),
        "subject_groups": subject_groups,
        "gaokao_mode": config.get("gaokao_mode", ""),
        "years": years,
        "output_dir": paths["output_dir"],
        "status": "采集完成" if completed else f"部分完成 ({completed_schools}/{total_schools})",
    }

def list_all_provinces_status() -> List[Dict]:
    results = []
    for province in ENABLED_PROVINCES:
        status = check_data_completed(province)
        results.append(status)
    return results

def print_all_provinces_status():
    status_list = list_all_provinces_status()
    
    print("=" * 100)
    print(f"{'省份':<6} {'高考模式':<10} {'科目分组':<12} {'总院校':>6} {'已完成':>6} {'进度':>8} {'状态'}")
    print("=" * 100)
    
    for status in status_list:
        groups_str = ",".join(status["subject_groups"])
        print(f"{status['province']:<6} {status.get('gaokao_mode', ''):<10} {groups_str:<12} {status['total_schools']:>6} {status['completed_schools']:>6} {status['progress']:>7.1f}%  {status['status']}")
    
    print("=" * 100)
    
    completed_count = sum(1 for s in status_list if s["completed"])
    partial_count = sum(1 for s in status_list if not s["completed"] and s["school_list_exists"])
    no_list_count = sum(1 for s in status_list if not s["school_list_exists"])
    
    print(f"已完成: {completed_count} | 部分完成: {partial_count} | 无院校列表: {no_list_count}")
    print("=" * 100)