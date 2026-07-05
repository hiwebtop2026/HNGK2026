from dotenv import load_dotenv
load_dotenv()

# -*- coding: utf-8 -*-
"""
检查并创建一分一段表，导入天津和海南数据
"""

import os
import sys

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client

def check_and_create_table():
    print('='*60)
    print('🚀 检查并创建一分一段表')
    print('='*60)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 检查表是否存在
    try:
        response = supabase.from_('score_distribution').select('*').limit(1).execute()
        print('✅ score_distribution表已存在')
        return True
    except Exception as e:
        print(f'❌ 表不存在，创建中: {e}')
        return False

def generate_create_table_sql():
    """生成创建表的SQL语句"""
    sql = """
-- 创建一分一段表
CREATE TABLE IF NOT EXISTS score_distribution (
    id BIGSERIAL PRIMARY KEY,
    province VARCHAR(50) NOT NULL DEFAULT '海南',
    year INTEGER NOT NULL,
    score INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    cumulative_count INTEGER NOT NULL DEFAULT 0,
    min_rank INTEGER,
    max_rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS score_distribution_province_idx ON score_distribution (province);
CREATE INDEX IF NOT EXISTS score_distribution_province_year_idx ON score_distribution (province, year);
CREATE INDEX IF NOT EXISTS score_distribution_province_year_score_idx ON score_distribution (province, year, score);

-- 创建视图
CREATE OR REPLACE VIEW score_distribution_stats AS
SELECT 
    province,
    year,
    MIN(score) as min_score,
    MAX(score) as max_score,
    SUM(count) as total_students,
    MAX(cumulative_count) as max_cumulative
FROM score_distribution
GROUP BY province, year
ORDER BY province, year DESC;
"""
    return sql

def generate_tianjin_2025_sql():
    """生成天津2025年一分一段表SQL"""
    # 从搜索结果获取的数据（部分）
    data = [
        (680, 656, 656),
        (679, 66, 722),
        (678, 67, 789),
        (677, 72, 861),
        (676, 60, 921),
        (675, 47, 968),
        (674, 63, 1031),
        (673, 61, 1092),
        (672, 59, 1151),
        (671, 81, 1232),
        (670, 69, 1301),
        (669, 76, 1377),
        (668, 77, 1454),
        (667, 94, 1548),
        (666, 97, 1645),
        (665, 90, 1735),
        (664, 93, 1828),
        (663, 95, 1923),
        (662, 104, 2027),
        (661, 110, 2137),
        (660, 114, 2251),
        (659, 106, 2357),
        (658, 106, 2463),
        (657, 105, 2568),
        (656, 128, 2696),
        (655, 88, 2784),
        (654, 130, 2914),
        (653, 125, 3039),
        (652, 140, 3179),
        (651, 109, 3288),
        (650, 134, 3422),
        (649, 139, 3561),
        (648, 134, 3695),
        (647, 168, 3863),
        (646, 132, 3995),
        (645, 140, 4135),
        (644, 152, 4287),
        (643, 164, 4451),
        (642, 160, 4611),
        (641, 166, 4777),
        (640, 151, 4928),
        (639, 152, 5080),
        (638, 144, 5224),
        (637, 155, 5379),
        (636, 156, 5535),
        (635, 154, 5689),
        (634, 170, 5859),
        (633, 164, 6023),
        (632, 184, 6207),
        (631, 168, 6375),
        (630, 189, 6564),
        (629, 208, 6772),
        (628, 178, 6950),
        (627, 211, 7161),
        (626, 193, 7354),
        (625, 177, 7531),
        (624, 194, 7725),
        (623, 194, 7919),
        (622, 222, 8141),
        (621, 198, 8339),
        (620, 193, 8532),
        (619, 213, 8745),
        (618, 218, 8963),
        (617, 202, 9165),
        (616, 214, 9379),
        (615, 212, 9591),
        (614, 200, 9791),
        (613, 218, 10009),
        (612, 242, 10251),
        (611, 211, 10462),
        (610, 219, 10681),
        (609, 210, 10891),
        (608, 214, 11105),
        (607, 239, 11344),
        (606, 244, 11588),
        (605, 205, 11793),
        (604, 253, 12046),
        (603, 249, 12295),
        (602, 215, 12510),
        (601, 228, 12738),
        (600, 227, 12965),
        (599, 233, 13198),
        (598, 213, 13411),
        (597, 246, 13657),
        (596, 247, 13904),
        (595, 229, 14133),
        (594, 245, 14378),
        (593, 238, 14616),
        (592, 263, 14879),
        (591, 243, 15122),
        (590, 228, 15350),
        (589, 230, 15580),
        (588, 222, 15802),
        (587, 251, 16053),
        (586, 253, 16306),
        (585, 217, 16523),
        (584, 258, 16781),
        (583, 269, 17050),
        (582, 242, 17292),
        (581, 247, 17539),
        (580, 234, 17773),
        (579, 249, 18022),
        (578, 235, 18257),
        (577, 280, 18537),
        (576, 261, 18798),
        (575, 262, 19060),
        (574, 272, 19332),
        (573, 269, 19601),
        (572, 254, 19855),
        (571, 279, 20134),
        (570, 279, 20413),
        (569, 275, 20688),
        (568, 252, 20940),
        (567, 300, 21240),
        (566, 260, 21500),
        (565, 254, 21754),
        (564, 278, 22032),
        (563, 250, 22282),
        (562, 265, 22547),
        (561, 262, 22809),
        (560, 274, 23083),
        (559, 291, 23374),
        (558, 260, 23634),
        (557, 286, 23920),
        (556, 289, 24209),
        (555, 256, 24465),
        (554, 285, 24750),
        (553, 268, 25018),
        (552, 299, 25317),
        (551, 270, 25587),
        (550, 287, 25874),
        (549, 273, 26147),
        (548, 309, 26456),
        (547, 262, 26718),
        (546, 248, 26966),
        (545, 265, 27231),
        (544, 301, 27532),
        (543, 246, 27778),
        (542, 284, 28062),
        (541, 293, 28355),
        (540, 276, 28631),
        (539, 234, 28865),
        (538, 282, 29147),
        (537, 285, 29432),
        (536, 295, 29727),
        (535, 302, 30029),
        (534, 303, 30332),
        (533, 298, 30630),
        (532, 298, 30928),
        (531, 303, 31231),
        (530, 268, 31499),
        (529, 280, 31779),
        (528, 285, 32064),
        (527, 278, 32342),
        (526, 287, 32629),
        (525, 292, 32921),
        (524, 299, 33220),
        (523, 289, 33509),
        (522, 264, 33773),
        (521, 301, 34074),
        (520, 320, 34394),
        (519, 276, 34670),
        (518, 242, 34912),
        (517, 310, 35222),
        (516, 303, 35525),
        (515, 314, 35839),
        (514, 268, 36107),
        (513, 302, 36409),
        (512, 302, 36711),
        (511, 296, 37007),
        (510, 303, 37310),
        (509, 314, 37624),
        (508, 280, 37904),
        (507, 283, 38187),
        (506, 272, 38459),
        (505, 316, 38775),
        (504, 301, 39076),
        (503, 303, 39379),
        (502, 276, 39655),
        (501, 298, 39953),
        (500, 280, 40233),
        (499, 301, 40534),
        (498, 273, 40807),
        (497, 311, 41118),
        (496, 294, 41412),
        (495, 296, 41708),
        (494, 268, 41976),
        (493, 292, 42268),
        (492, 281, 42549),
        (491, 302, 42851),
        (490, 307, 43158),
        (489, 283, 43441),
        (488, 307, 43748),
        (487, 306, 44054),
        (486, 267, 44321),
        (485, 292, 44613),
        (484, 285, 44898),
        (483, 285, 45183),
        (482, 289, 45472),
        (481, 303, 45775),
        (480, 260, 46035),
        (479, 296, 46331),
        (478, 282, 46613),
        (477, 277, 46890),
        (476, 283, 47173),
    ]
    
    sql_statements = []
    for score, count, cumulative in data:
        sql = f"INSERT INTO score_distribution (province, year, score, count, cumulative_count, min_rank, max_rank) VALUES ('天津', 2025, {score}, {count}, {cumulative}, {cumulative - count + 1}, {cumulative}) ON CONFLICT (province, year, score) DO UPDATE SET count = EXCLUDED.count, cumulative_count = EXCLUDED.cumulative_count;"
        sql_statements.append(sql)
    
    return sql_statements

def main():
    table_exists = check_and_create_table()
    
    if not table_exists:
        print('\n生成创建表SQL...')
        create_sql = generate_create_table_sql()
        with open('create_score_distribution.sql', 'w', encoding='utf-8') as f:
            f.write(create_sql)
        print('✅ 创建表SQL已保存到 create_score_distribution.sql')
    
    print('\n生成天津2025年数据SQL...')
    tianjin_sql = generate_tianjin_2025_sql()
    with open('tianjin_2025_score_distribution.sql', 'w', encoding='utf-8') as f:
        f.write('\n'.join(tianjin_sql))
    print(f'✅ 天津数据SQL已保存到 tianjin_2025_score_distribution.sql ({len(tianjin_sql)}条)')
    
    print('\n' + '='*60)
    print('操作步骤：')
    print('1. 在Supabase SQL Editor中执行 create_score_distribution.sql')
    print('2. 执行 tianjin_2025_score_distribution.sql')
    print('3. 检查程序中的海南一分一段表数据并导入')
    print('='*60)

if __name__ == '__main__':
    main()
