import os

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    print("=" * 70)
    print("更新 profiles 表 RLS 策略")
    print("=" * 70)
    print("\n此操作将删除旧的不安全策略")
    print("需要使用 service_role_key")
    
    import getpass
    service_role_key = getpass.getpass("\n请输入 service_role_key: ")
    
    if not service_role_key or len(service_role_key) < 50:
        print("❌ 无效的 service_role_key")
        return
    
    supabase = create_client(SUPABASE_URL, service_role_key)
    
    try:
        print("\n🗑️  删除旧的不安全策略...")
        result = supabase.rpc('remove_unsafe_policy', {}).execute()
        print(f"  结果: {result.data}")
    except Exception as e:
        print(f"  删除策略失败: {e}")
    
    print("\n✅ 更新完成")
    print("\n请在 Supabase SQL Editor 中执行以下 SQL 确认：")
    print("SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'profiles';")


if __name__ == '__main__':
    main()
