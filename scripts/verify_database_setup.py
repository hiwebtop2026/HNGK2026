from supabase import create_client

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'


def main():
    print("=" * 70)
    print("数据库配置全面验证")
    print("=" * 70)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    print("\n📋 1. 表结构验证")
    print("-" * 50)
    try:
        result = supabase.rpc('execute_sql', {'sql': """
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            ORDER BY ordinal_position;
        """}).execute()
        if result.data:
            for col in result.data:
                nullable = "NO" if col['is_nullable'] == 'NO' else "YES"
                print(f"  ✅ {col['column_name']}: {col['data_type']} ({nullable})")
        else:
            print("  ❌ 未找到 profiles 表")
    except Exception as e:
        print(f"  ❌ 查询失败: {e}")
    
    print("\n📋 2. RLS 策略验证")
    print("-" * 50)
    try:
        result = supabase.rpc('execute_sql', {'sql': """
            SELECT policyname, cmd, roles, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'profiles';
        """}).execute()
        if result.data:
            for policy in result.data:
                roles = str(policy['roles']).replace("{", "").replace("}", "")
                print(f"  ✅ {policy['policyname']}: {policy['cmd']} | roles={roles} | qual={policy['qual']}")
                if policy['policyname'] == "Anyone can read profile by nickname":
                    print(f"     ⚠️  警告：此策略不安全，请删除")
        else:
            print("  ⚠️  未找到 profiles 表的 RLS 策略")
    except Exception as e:
        print(f"  ❌ 查询失败: {e}")
    
    print("\n📋 3. 函数验证")
    print("-" * 50)
    try:
        result = supabase.rpc('execute_sql', {'sql': """
            SELECT proname, provolatile, prorettype::regtype
            FROM pg_proc 
            WHERE proname = 'get_email_by_nickname';
        """}).execute()
        if result.data:
            for func in result.data:
                print(f"  ✅ {func['proname']}: returns {func['prorettype']}")
        else:
            print("  ❌ get_email_by_nickname 函数不存在")
    except Exception as e:
        print(f"  ❌ 查询失败: {e}")
    
    print("\n📋 4. 触发器验证")
    print("-" * 50)
    try:
        result = supabase.rpc('execute_sql', {'sql': """
            SELECT tgname, pg_get_triggerdef(t.oid) as trigger_def
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            WHERE c.relname = 'users' AND tgname = 'on_auth_user_created';
        """}).execute()
        if result.data:
            for trigger in result.data:
                print(f"  ✅ 触发器: {trigger['tgname']}")
                print(f"     定义: {trigger['trigger_def'][:100]}...")
        else:
            print("  ⚠️  on_auth_user_created 触发器不存在")
    except Exception as e:
        print(f"  ❌ 查询失败: {e}")
    
    print("\n📋 5. RPC 函数测试")
    print("-" * 50)
    try:
        result = supabase.rpc('get_email_by_nickname', {'p_nickname': 'testuser'}).execute()
        print(f"  ✅ RPC 调用成功")
        print(f"  查询 'testuser' 结果: {result.data}")
    except Exception as e:
        print(f"  ❌ RPC 调用失败: {e}")
    
    print("\n" + "=" * 70)
    print("验证完成")
    print("=" * 70)


if __name__ == '__main__':
    main()
