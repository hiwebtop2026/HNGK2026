from dotenv import load_dotenv
load_dotenv()

import os

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == '请填入service_role_key（轮换后的新密钥）':
    print("❌ 错误：请先在 .env 文件中配置 SUPABASE_SERVICE_ROLE_KEY")
    print("获取方式：登录 supabase.com → 项目 → Settings → API → service_role_key")
    exit(1)

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    print("=" * 70)
    print("⚠️  危险操作：清理所有用户数据")
    print("=" * 70)
    print("\n此操作将删除以下表中的所有用户数据：")
    print("  - auth.users（认证用户）")
    print("  - profiles（用户昵称映射）")
    print("  - usage_logs（用户操作日志）")
    print("  - volunteer_plans（用户志愿方案）")
    print("\n⚠️  此操作不可撤销！")
    
    confirm = input("\n请输入 YES 确认执行：")
    if confirm.strip().upper() != 'YES':
        print("✅ 操作已取消")
        return

    print("\n🔄 正在连接 Supabase...")
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try:
        print("\n📊 统计当前用户数据：")
        print("-" * 50)
        
        profiles_res = supabase.table('profiles').select('*', count='exact').execute()
        print(f"  profiles 表: {profiles_res.count} 条记录")
        
        usage_logs_res = supabase.table('usage_logs').select('*', count='exact').execute()
        print(f"  usage_logs 表: {usage_logs_res.count} 条记录")
        
        volunteer_plans_res = supabase.table('volunteer_plans').select('*', count='exact').execute()
        print(f"  volunteer_plans 表: {volunteer_plans_res.count} 条记录")

        auth_users_res = supabase.auth.admin.list_users()
        auth_count = len(auth_users_res.users)
        print(f"  auth.users 表: {auth_count} 个用户")

        print("\n🗑️  开始清理...")
        print("-" * 50)

        print("  1. 删除 volunteer_plans 表数据...")
        supabase.table('volunteer_plans').delete().neq('id', 0).execute()
        print("     ✅ 完成")

        print("  2. 删除 usage_logs 表数据...")
        supabase.table('usage_logs').delete().neq('id', 0).execute()
        print("     ✅ 完成")

        print("  3. 删除 profiles 表数据...")
        supabase.table('profiles').delete().neq('id', 0).execute()
        print("     ✅ 完成")

        print(f"  4. 删除 auth.users 表中的 {auth_count} 个用户...")
        for user in auth_users_res.users:
            try:
                supabase.auth.admin.delete_user(user.id)
                print(f"     - 删除用户: {user.email}")
            except Exception as e:
                print(f"     - 删除失败: {user.email} - {str(e)}")
        print("     ✅ 完成")

        print("\n" + "=" * 70)
        print("🎉 清理完成！所有用户数据已删除")
        print("=" * 70)
        print("\n用户现在可以重新注册了。")

    except Exception as e:
        print(f"\n❌ 清理失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
