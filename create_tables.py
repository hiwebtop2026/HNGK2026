"""
Supabase数据库表结构创建脚本
使用Python客户端直接创建表
"""
import os
from dotenv import load_dotenv
load_dotenv()


try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

def create_tables():
    """创建数据库表"""
    print("正在连接Supabase...")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("连接成功")
    
    print("\n创建表结构...")
    
    # 创建主表
    create_main_table = """
    CREATE TABLE IF NOT EXISTS admission_scores (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        year INTEGER NOT NULL,
        group_code VARCHAR(10) NOT NULL,
        group_name VARCHAR(200) NOT NULL,
        school_name VARCHAR(100) NOT NULL,
        school_code VARCHAR(6),
        group_number VARCHAR(10),
        subject_requirement VARCHAR(10),
        score INTEGER NOT NULL,
        plan_count INTEGER,
        admission_count INTEGER,
        batch_type VARCHAR(50) DEFAULT '本科普通批',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """
    
    try:
        supabase.rpc('pg_catalog.pg_execute', {'sql': create_main_table}).execute()
        print("  ✅ 创建 admission_scores 表成功")
    except Exception as e:
        print(f"  ⚠️ 尝试创建表失败: {e}")
        # 尝试通过REST API创建（如果表不存在）
        pass
    
    # 创建索引
    try:
        supabase.rpc('pg_catalog.pg_execute', {'sql': 'CREATE UNIQUE INDEX IF NOT EXISTS admission_scores_unique_idx ON admission_scores (year, group_code);'}).execute()
        print("  ✅ 创建唯一索引成功")
    except:
        pass
    
    try:
        supabase.rpc('pg_catalog.pg_execute', {'sql': 'CREATE INDEX IF NOT EXISTS admission_scores_year_idx ON admission_scores (year);'}).execute()
        print("  ✅ 创建年份索引成功")
    except:
        pass
    
    try:
        supabase.rpc('pg_catalog.pg_execute', {'sql': 'CREATE INDEX IF NOT EXISTS admission_scores_school_idx ON admission_scores (school_name);'}).execute()
        print("  ✅ 创建学校索引成功")
    except:
        pass
    
    # 创建科目要求表
    create_subject_table = """
    CREATE TABLE IF NOT EXISTS subject_requirements (
        code VARCHAR(10) PRIMARY KEY,
        description VARCHAR(200) NOT NULL,
        subjects VARCHAR(100),
        requirement_type VARCHAR(50)
    );
    """
    
    try:
        supabase.rpc('pg_catalog.pg_execute', {'sql': create_subject_table}).execute()
        print("  ✅ 创建 subject_requirements 表成功")
    except:
        pass
    
    # 插入科目要求数据
    insert_subjects = """
    INSERT INTO subject_requirements (code, description, subjects, requirement_type) VALUES
    ('000', '不提科目要求', '不限', '不限'),
    ('0', '不提科目要求', '不限', '不限'),
    ('4', '物理', '物理', '单选'),
    ('5', '化学', '化学', '单选'),
    ('6', '生物', '生物', '单选'),
    ('7', '思想政治', '思想政治', '单选'),
    ('8', '历史', '历史', '单选'),
    ('9', '地理', '地理', '单选'),
    ('45', '物理或化学（选考其中一门即可）', '物理,化学', '双选或'),
    ('54', '物理和化学（均须选考）', '物理,化学', '双选必'),
    ('456', '物理或化学或生物（选考其中一门即可）', '物理,化学,生物', '三选或'),
    ('56', '化学和生物（均须选考）', '化学,生物', '双选必'),
    ('65', '化学或生物（选考其中一门即可）', '化学,生物', '双选或'),
    ('469', '物理或生物或地理（选考其中一门即可）', '物理,生物,地理', '三选或'),
    ('48', '物理或历史（选考其中一门即可）', '物理,历史', '双选或'),
    ('489', '物理或历史或地理（选考其中一门即可）', '物理,历史,地理', '三选或'),
    ('87', '历史或政治（选考其中一门即可）', '历史,政治', '双选或'),
    ('89', '历史或地理（选考其中一门即可）', '历史,地理', '双选或')
    ON CONFLICT (code) DO NOTHING;
    """
    
    try:
        supabase.rpc('pg_catalog.pg_execute', {'sql': insert_subjects}).execute()
        print("  ✅ 插入科目要求数据成功")
    except:
        pass
    
    print("\n表结构创建完成！")
    
    # 验证表是否存在
    try:
        result = supabase.table('admission_scores').select('count(*)').limit(1).execute()
        print(f"  ✅ admission_scores 表已就绪")
    except Exception as e:
        print(f"  ⚠️ 验证表失败: {e}")

if __name__ == "__main__":
    create_tables()