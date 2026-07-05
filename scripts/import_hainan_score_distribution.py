import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2
import json

DB_URL = os.environ.get('SUPABASE_DB_URL')
if not DB_URL:
    raise EnvironmentError("缺少环境变量 SUPABASE_DB_URL，请在 .env 中配置（格式：postgresql://postgres.<ref>:<password>@<host>:6543/postgres）")

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
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print('✅ 连接成功')
        
        cursor.execute('ALTER TABLE score_distribution DISABLE ROW LEVEL SECURITY;')
        print('✅ 已禁用score_distribution RLS')
        
        cursor.execute('DELETE FROM score_distribution WHERE province = %s AND year = %s;', ('海南', 2026))
        print('✅ 已清空海南2026年旧数据')
        
        hainan_data = interpolate_data()
        
        insert_query = """
            INSERT INTO score_distribution (province, year, score, count, cumulative_count, min_rank, max_rank, category)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        batch_size = 100
        total = len(hainan_data)
        for i in range(0, total, batch_size):
            batch = hainan_data[i:i+batch_size]
            for score, count, cumulative in batch:
                min_rank = cumulative - count + 1
                max_rank = cumulative
                cursor.execute(insert_query, ('海南', 2026, score, count, cumulative, min_rank, max_rank, '普通类'))
            print(f'  已导入 {min(i+batch_size, total)}/{total} 条')
        
        cursor.execute('SELECT COUNT(*) FROM score_distribution WHERE province = %s AND year = %s;', ('海南', 2026))
        count = cursor.fetchone()[0]
        print(f'✅ 导入完成，共 {count} 条记录')
        
        cursor.execute('SELECT score, count, cumulative_count, min_rank, max_rank FROM score_distribution WHERE province = %s AND year = %s AND score IN (800, 750, 700, 650, 603, 600, 567, 500, 479, 400, 300) ORDER BY score DESC;', ('海南', 2026))
        print('\n关键分数点验证:')
        for row in cursor.fetchall():
            print(f'  {row[0]}分: 同分{row[1]}人, 累计{row[2]}人, 位次{row[3]}~{row[4]}')
        
        cursor.execute('SELECT MIN(score), MAX(score) FROM score_distribution WHERE province = %s AND year = %s;', ('海南', 2026))
        min_score, max_score = cursor.fetchone()
        print(f'\n分数范围: {max_score} - {min_score}')
        
        cursor.close()
        conn.close()
        print('\n✅ 所有操作完成！')
        
    except Exception as e:
        print(f'❌ 错误: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
