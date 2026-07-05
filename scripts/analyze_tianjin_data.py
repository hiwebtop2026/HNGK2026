# -*- coding: utf-8 -*-
"""
分析天津数据加载问题：为什么179所院校只有131所被加载到数据库
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'tianjin_scores')

def analyze_files():
    """分析所有本地数据文件"""
    json_files = sorted([f for f in os.listdir(DATA_DIR) if f.endswith('.json')])
    
    print(f"总文件数: {len(json_files)}")
    
    all_schools_from_files = set()
    files_with_no_valid_data = []
    files_with_no_school_name = []
    files_with_zero_score = []
    valid_schools = set()
    
    for filename in json_files:
        filepath = os.path.join(DATA_DIR, filename)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list) or len(data) == 0:
                files_with_no_valid_data.append(filename)
                continue
            
            school_name = filename.split('_')[0]
            all_schools_from_files.add(school_name)
            
            has_valid_data = False
            has_school_name = False
            
            for item in data:
                sn = item.get('school_name', '')
                if sn:
                    has_school_name = True
                
                score = item.get('min_score')
                if score is not None and score >= 100:
                    has_valid_data = True
                    valid_schools.add(sn if sn else school_name)
            
            if not has_school_name:
                files_with_no_school_name.append(filename)
            
            if not has_valid_data:
                files_with_zero_score.append(filename)
            
        except Exception as e:
            print(f"⚠️ 读取文件失败 {filename}: {e}")
    
    print(f"\n文件中提取的院校数: {len(all_schools_from_files)}")
    print(f"有有效数据的院校数: {len(valid_schools)}")
    print(f"无有效数据的文件数: {len(files_with_no_valid_data)}")
    print(f"无school_name字段的文件数: {len(files_with_no_school_name)}")
    print(f"分数无效(score<100)的文件数: {len(files_with_zero_score)}")
    
    if files_with_zero_score:
        print(f"\n分数无效的文件列表(前20个):")
        for f in files_with_zero_score[:20]:
            print(f"  {f}")
    
    missing_schools = all_schools_from_files - valid_schools
    print(f"\n无有效数据的院校数: {len(missing_schools)}")
    if missing_schools:
        print(f"无有效数据的院校列表:")
        for s in sorted(missing_schools):
            print(f"  {s}")
    
    return valid_schools

def check_db_schools():
    """检查数据库中的院校"""
    try:
        from supabase import create_client, Client
        
        url = "https://jhcyqhtgtnomqvcdeeuo.supabase.co"
        key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1ODk1OCwiZXhwIjoyMDk4MTM0OTU4fQ.D2Rogs1Hd5wBospzq6oILP5F9KVxj6x_0COPa3BVqpE"
        
        supabase: Client = create_client(url, key)
        
        result = supabase.table('major_scores').select('school_name').eq('province', '天津').execute()
        db_schools = set(r['school_name'] for r in result.data if r['school_name'])
        
        print(f"\n数据库中院校数: {len(db_schools)}")
        
        result2 = supabase.table('admission_scores').select('school_name').eq('province', '天津').execute()
        admission_schools = set(r['school_name'] for r in result2.data if r['school_name'])
        
        print(f"admission_scores表中院校数: {len(admission_schools)}")
        
        return db_schools
    
    except Exception as e:
        print(f"❌ 连接数据库失败: {e}")
        return set()

if __name__ == '__main__':
    print("=" * 70)
    print("天津数据加载问题分析")
    print("=" * 70)
    
    print("\n步骤1: 分析本地文件...")
    valid_schools = analyze_files()
    
    print("\n步骤2: 检查数据库...")
    db_schools = check_db_schools()
    
    if valid_schools and db_schools:
        missing_in_db = valid_schools - db_schools
        print(f"\n本地有但数据库缺失的院校数: {len(missing_in_db)}")
        if missing_in_db:
            print("缺失院校列表:")
            for s in sorted(missing_in_db):
                print(f"  {s}")
    
    print("\n" + "=" * 70)