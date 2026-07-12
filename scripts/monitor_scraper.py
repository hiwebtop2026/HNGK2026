import os
import time
import subprocess

from provinces_config import check_data_completed

MAX_CONCURRENT = 2

COLLECTION_ORDER = [
    ['海南', '天津'],
    ['广东', '湖南'],
]

def get_running_provinces():
    try:
        result = subprocess.run(
            ['tasklist', '/FI', 'IMAGENAME eq python.exe'],
            capture_output=True, text=True, encoding='utf-8'
        )
        lines = result.stdout.strip().split('\n')
        running = []
        
        for line in lines:
            if 'gaokao_scraper.py' in line:
                parts = line.split('--province')
                if len(parts) > 1:
                    province = parts[1].strip().split()[0]
                    running.append(province)
        
        return list(set(running))
    except:
        return []

def start_province(province):
    print(f"🚀 启动 {province} 数据采集")
    cmd = f'python scripts/gaokao_scraper.py --province {province} --missing'
    subprocess.Popen(
        cmd,
        shell=True,
        cwd='I:\\trae_projects\\GAOKAO2026',
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

def main():
    print("=" * 60)
    print("📊 数据采集监控器 v2.2")
    print(f"并发数: {MAX_CONCURRENT}")
    print(f"采集顺序: {COLLECTION_ORDER}")
    print("=" * 60)
    
    round_num = 0
    for round_provinces in COLLECTION_ORDER:
        round_num += 1
        print(f"\n--- 第 {round_num} 轮: {round_provinces} ---")
        
        completed_in_round = []
        started_in_round = []
        
        for province in round_provinces:
            while len(get_running_provinces()) >= MAX_CONCURRENT:
                running = get_running_provinces()
                print(f"[{time.strftime('%H:%M:%S')}] 运行中: {running}")
                time.sleep(30)
            
            start_province(province)
            started_in_round.append(province)
            time.sleep(10)
        
        while len(completed_in_round) < len(round_provinces):
            running = get_running_provinces()
            for province in started_in_round:
                if province not in running and province not in completed_in_round:
                    status = check_data_completed(province)
                    if status['status'] == '已完成':
                        print(f"✅ {province} 采集完成")
                    else:
                        print(f"⚠️ {province} 采集结束 (状态: {status['status']})")
                    completed_in_round.append(province)
            
            print(f"[{time.strftime('%H:%M:%S')}] 运行中: {running} | 本轮完成: {completed_in_round}")
            time.sleep(30)
    
    print("\n🎉 所有省份采集完成！")

if __name__ == '__main__':
    main()