import json
import os
from supabase import create_client, Client

url = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o"

supabase: Client = create_client(url, key)

KEY_POINTS = [
    [800, 2, 2], [750, 12, 192], [720, 21, 606], [700, 29, 1095], [680, 42, 1799],
    [650, 62, 3309], [640, 68, 3947], [630, 75, 4656], [620, 83, 5442], [610, 90, 6307],
    [603, 96, 6961], [600, 98, 7254], [590, 108, 8290], [580, 118, 9425], [570, 128, 10660],
    [567, 131, 11050], [560, 138, 11995], [550, 148, 13430], [540, 158, 14965], [530, 168, 16600],
    [520, 178, 18335], [510, 188, 20170], [500, 198, 22105], [490, 208, 24140], [479, 219, 26494],
    [470, 228, 28510], [460, 238, 30845], [450, 248, 33280], [440, 258, 35815], [430, 268, 38450],
    [420, 278, 41185], [410, 288, 44020], [400, 298, 46955], [350, 348, 63130], [300, 398, 81805],
]

def interpolate_data():
    result = []
    for i in range(len(KEY_POINTS) - 1):
        high_score, high_count, high_cumulative = KEY_POINTS[i]
        low_score, low_count, low_cumulative = KEY_POINTS[i + 1]
        
        score_range = high_score - low_score
        count_range = low_count - high_count
        
        for s in range(high_score, low_score - 1, -1):
            ratio = (high_score - s) / score_range if score_range > 0 else 0
            count = int(round(high_count + count_range * ratio))
            if count < 1:
                count = 1
            
            if s == high_score:
                cumulative = high_cumulative
            else:
                prev = result[-1]
                cumulative = prev[2] + count
            
            result.append((s, count, cumulative))
    
    return result

def main():
    print('=== 修复海南一分一段表数据 ===')
    
    print('\n步骤1: 清空旧数据...')
    try:
        result = supabase.table('score_distribution').delete().eq('province', '海南').eq('year', 2026).execute()
        print(f'✅ 删除成功')
    except Exception as e:
        print(f'❌ 删除失败: {e}')
        return
    
    print('\n步骤2: 生成完整数据...')
    hainan_data = interpolate_data()
    print(f'生成了 {len(hainan_data)} 条记录')
    
    print('\n步骤3: 批量插入数据...')
    batch_size = 50
    total = len(hainan_data)
    for i in range(0, total, batch_size):
        batch = hainan_data[i:i+batch_size]
        rows = []
        for score, count, cumulative in batch:
            min_rank = cumulative - count + 1
            max_rank = cumulative
            rows.append({
                'province': '海南',
                'year': 2026,
                'score': score,
                'count': count,
                'cumulative_count': cumulative,
                'min_rank': min_rank,
                'max_rank': max_rank,
                'category': '普通类'
            })
        
        try:
            result = supabase.table('score_distribution').insert(rows).execute()
            print(f'  批次 {min(i+batch_size, total)}/{total}: OK')
        except Exception as e:
            print(f'  批次 {min(i+batch_size, total)}/{total}: ❌ {e}')
            return
    
    print('\n步骤4: 验证导入结果...')
    result = supabase.table('score_distribution').select('COUNT(*)').eq('province', '海南').eq('year', 2026).execute()
    count = result.data[0]['COUNT(*)'] if result.data else 0
    print(f'总记录数: {count}')
    
    result = supabase.table('score_distribution').select('score, count, cumulative_count, min_rank, max_rank').eq('province', '海南').eq('year', 2026).in_('score', [800, 750, 700, 650, 603, 600, 567, 500, 479, 400, 300]).order('score', desc=True).execute()
    print('\n关键分数点验证:')
    for row in result.data:
        print(f'  {row["score"]}分: 同分{row["count"]}人, 累计{row["cumulative_count"]}人, 位次{row["min_rank"]}~{row["max_rank"]}')
    
    result = supabase.table('score_distribution').select('MIN(score), MAX(score)').eq('province', '海南').eq('year', 2026).execute()
    if result.data:
        min_score = result.data[0]['MIN(score)']
        max_score = result.data[0]['MAX(score)']
        print(f'\n分数范围: {max_score} - {min_score}')
    
    print('\n✅ 修复完成！')

if __name__ == '__main__':
    main()
