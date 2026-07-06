import os
import sys

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    if len(sys.argv) < 2:
        print("用法: python clear_auth_users_cli.py <service_role_key>")
        print("\n获取方式：登录 supabase.com → 项目 → Settings → API → service_role_key")
        return

    service_role_key = sys.argv[1]
    
    if not service_role_key or len(service_role_key) < 50:
        print("❌ 无效的 service_role_key")
        return

    print("\n🔄 正在连接 Supabase...")
    supabase = create_client(SUPABASE_URL, service_role_key)

    try:
        print("\n📊 统计当前认证用户：")
        print("-" * 50)
        
        auth_users_res = supabase.auth.admin.list_users()
        auth_count = len(auth_users_res.users)
        
        if auth_count == 0:
            print("  auth.users 表: 0 个用户")
            print("\n✅ 无需清理，认证用户表已经是空的")
            return
        
        print(f"  auth.users 表: {auth_count} 个用户")
        print("\n  用户列表：")
        for user in auth_users_res.users:
            print(f"    - {user.email} (ID: {user.id[:8]}...)")

        print("\n🗑️  开始删除用户...")
        print("-" * 50)
        
        success_count = 0
        fail_count = 0
        for user in auth_users_res.users:
            try:
                supabase.auth.admin.delete_user(user.id)
                print(f"     ✅ 删除成功: {user.email}")
                success_count += 1
            except Exception as e:
                print(f"     ❌ 删除失败: {user.email} - {str(e)}")
                fail_count += 1

        print("\n" + "=" * 70)
        print(f"🎉 清理完成！")
        print(f"   成功删除: {success_count} 个用户")
        print(f"   删除失败: {fail_count} 个用户")
        print("=" * 70)
        print("\n用户现在可以重新注册了。")

    except Exception as e:
        print(f"\n❌ 操作失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
