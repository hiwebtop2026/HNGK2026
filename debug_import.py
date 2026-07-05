"""
调试数据导入问题
添加详细错误日志
"""
import os
from dotenv import load_dotenv
load_dotenv()


import json
import time

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')

try:
    from supabase import create_client
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'supabase', '-q'])
    from supabase import create_client

def main():
    print('='*60)
    print('🔍 数据导入调试工具')
    print('='*60)
    
    print("\n连接Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("连接成功")
    
    print("\n验证表结构...")
    try:
        result = supabase.table('admission_scores').select('*').limit(1).execute()
        print("✅ 表查询成功")
        print(f"   返回数据: {result.data}")
    except Exception as e:
        print(f"❌ 表查询失败: {e}")
        return
    
    print("\n读取本地数据...")
    with open('admission_scores_data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"读取到 {len(data)} 条数据")
    
    print("\n查看第一条数据格式:")
    first_item = data[0]
    print(json.dumps(first_item, indent=2, ensure_ascii=False))
    
    print("\n尝试插入单条数据...")
    try:
        result = supabase.table('admission_scores').insert(first_item).execute()
        print(f"✅ 插入成功")
        print(f"   返回数据: {result.data}")
    except Exception as e:
        print(f"❌ 插入失败: {e}")
        print(f"   错误类型: {type(e)}")
        # 尝试获取更多错误信息
        try:
            import traceback
            traceback.print_exc()
        except:
            pass
        
        print("\n尝试使用API直接插入...")
        import requests
        
        headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
            'Content-Type': 'application/json',
        }
        
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/admission_scores",
            headers=headers,
            json=first_item
        )
        
        print(f"HTTP状态码: {response.status_code}")
        print(f"响应内容: {response.text[:500]}")
        
        if response.status_code == 401:
            print("\n⚠️ 权限错误：请检查API密钥是否正确")
        elif response.status_code == 403:
            print("\n⚠️ 拒绝访问：可能是RLS策略阻止了写入")
            print("   请在Supabase中为admission_scores表添加RLS策略：")
            print("   CREATE POLICY \"Allow anonymous insert\" ON admission_scores FOR INSERT WITH CHECK (true);")
            print("   CREATE POLICY \"Allow anonymous select\" ON admission_scores FOR SELECT USING (true);")
        elif response.status_code == 422:
            print("\n⚠️ 数据验证错误：字段类型不匹配")

if __name__ == '__main__':
    main()