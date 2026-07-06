from dotenv import load_dotenv
load_dotenv()

import os

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    print("=" * 70)
    print("检查并更新 profiles 表 RLS 策略")
    print("=" * 70)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    try:
        print("\n📊 1. 检查当前 RLS 策略：")
        print("-" * 50)
        
        # 使用 rpc 执行查询
        try:
            result = supabase.rpc('execute_sql', {'sql': "SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'profiles';"})
            if result.data:
                policies = result.data
                for p in policies:
                    print(f"  - {p['policyname']}: {p['cmd']} | qual={p['qual']}")
            else:
                print("  没有找到 profiles 表的 RLS 策略")
        except Exception as e:
            print(f"  查询策略失败: {e}")
        
        print("\n📊 2. 检查 get_email_by_nickname 函数是否存在：")
        print("-" * 50)
        try:
            result = supabase.rpc('get_email_by_nickname', {'p_nickname': 'test'})
            print("  ✅ 函数已存在")
        except Exception as e:
            print(f"  ❌ 函数不存在: {e}")
            print("  需要创建函数")
        
        print("\n📊 3. 测试昵称查询功能：")
        print("-" * 50)
        try:
            result = supabase.rpc('get_email_by_nickname', {'p_nickname': 'test'})
            print(f"  查询结果: {result.data}")
            if result.data is None:
                print("  ✅ 函数正常工作（无匹配数据返回 None）")
            else:
                print("  ✅ 函数正常工作")
        except Exception as e:
            print(f"  ❌ 查询失败: {e}")
        
        print("\n" + "=" * 70)
        print("检查完成")
        print("=" * 70)
        print("\n需要在 Supabase SQL Editor 中执行以下操作：")
        print("1. 删除旧的不安全策略: DROP POLICY IF EXISTS \"Anyone can read profile by nickname\" ON profiles;")
        print("2. 创建安全函数: CREATE OR REPLACE FUNCTION public.get_email_by_nickname(p_nickname TEXT) RETURNS TEXT AS $$ BEGIN RETURN (SELECT email FROM public.profiles WHERE nickname = p_nickname LIMIT 1); END; $$ LANGUAGE plpgsql SECURITY DEFINER;")
        
    except Exception as e:
        print(f"\n❌ 连接失败: {e}")


if __name__ == '__main__':
    main()
