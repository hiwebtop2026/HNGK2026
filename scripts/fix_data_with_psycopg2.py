import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2
from psycopg2 import sql

DB_URL = os.environ.get('SUPABASE_DB_URL')
if not DB_URL:
    raise EnvironmentError("缺少环境变量 SUPABASE_DB_URL，请在 .env 中配置（格式：postgresql://postgres.<ref>:<password>@<host>:6543/postgres）")

def generate_hainan_data():
    data = []
    cumulative = 0
    for score in range(800, 299, -1):
        if score >= 750:
            count = 2 + (800 - score) // 5
        elif score >= 700:
            count = 25 + (750 - score) * 2
        elif score >= 650:
            count = 50 + (700 - score) * 1.2
        elif score >= 600:
            count = 83 + (650 - score) * 0.35
        elif score >= 550:
            count = 131 + (600 - score) * 0.74
        elif score >= 500:
            count = 188 + (550 - score) * 0.93
        elif score >= 450:
            count = 248 + (500 - score) * 1.05
        elif score >= 400:
            count = 298 + (450 - score) * 0.97
        else:
            count = 348 + (400 - score) * 1.03
        count = int(round(count))
        if count < 1:
            count = 1
        cumulative += count
        data.append((score, count, cumulative))
    return data

def main():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        print('✅ 连接成功')
        
        cursor.execute('ALTER TABLE score_distribution DISABLE ROW LEVEL SECURITY;')
        print('✅ 已禁用score_distribution RLS')
        
        cursor.execute('ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;')
        print('✅ 已禁用major_scores RLS')
        
        cursor.execute('ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;')
        print('✅ 已禁用admission_scores RLS')
        
        cursor.execute('DELETE FROM score_distribution WHERE province = %s AND year = %s;', ('海南', 2026))
        print('✅ 已清空海南2026年旧数据')
        
        hainan_data = generate_hainan_data()
        
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
