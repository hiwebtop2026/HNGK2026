import os
import sys

SUPABASE_URL = 'https://jhcyqhtgtnomqvcdeeuo.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o'

try:
    from supabase import create_client
except ImportError:
    os.system('pip install supabase')
    from supabase import create_client


def main():
    if len(sys.argv) < 3:
        print("用法: python test_registration_flow.py <邮箱> <昵称>")
        print("示例: python test_registration_flow.py test@example.com testuser")
        return
    
    email = sys.argv[1]
    nickname = sys.argv[2]
    
    print("=" * 70)
    print(f"测试注册流程: {email} / {nickname}")
    print("=" * 70)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    print("\n📝 步骤1: 发送验证码")
    print("-" * 50)
    try:
        result = supabase.auth.sign_in_with_otp({
            'email': email,
            'options': {
                'should_create_user': True,
                'data': {'nickname': nickname}
            }
        }).execute()
        print(f"  ✅ 验证码发送成功")
        print(f"  返回数据: {result.data}")
    except Exception as e:
        print(f"  ❌ 发送失败: {e}")
        return
    
    print("\n📝 步骤2: 输入验证码完成注册")
    print("-" * 50)
    otp_code = input("请输入收到的6位验证码: ")
    
    if len(otp_code) < 4:
        print("  ❌ 验证码无效")
        return
    
    try:
        result = supabase.auth.verify_otp({
            'email': email,
            'token': otp_code,
            'type': 'email',
        }).execute()
        
        if result.data.user:
            print(f"  ✅ 验证码验证成功")
            print(f"  用户ID: {result.data.user.id[:8]}...")
            print(f"  用户邮箱: {result.data.user.email}")
            
            user_id = result.data.user.id
            
            print("\n📝 步骤3: 设置密码")
            print("-" * 50)
            password = input("请设置密码（至少8位，包含字母和数字）: ")
            
            update_result = supabase.auth.update_user({
                'password': password,
                'data': {'nickname': nickname}
            }).execute()
            
            if update_result.data.user:
                print(f"  ✅ 密码设置成功")
            else:
                print(f"  ⚠️  密码设置可能失败")
            
            print("\n📝 步骤4: 验证profiles表数据")
            print("-" * 50)
            
            # 使用用户身份查询profiles表
            try:
                profile_result = supabase.table('profiles').select('*').eq('id', user_id).execute()
                if profile_result.data:
                    profile = profile_result.data[0]
                    print(f"  ✅ profiles表记录:")
                    print(f"     id: {profile['id'][:8]}...")
                    print(f"     email: {profile['email']}")
                    print(f"     nickname: {profile['nickname']}")
                    print(f"     created_at: {profile['created_at']}")
                else:
                    print(f"  ❌ profiles表中未找到该用户记录")
            except Exception as e:
                print(f"  ❌ 查询profiles失败: {e}")
            
            print("\n📝 步骤5: 测试昵称登录功能")
            print("-" * 50)
            try:
                email_result = supabase.rpc('get_email_by_nickname', {'p_nickname': nickname}).execute()
                print(f"  ✅ get_email_by_nickname('{nickname}') = {email_result.data}")
                if email_result.data == email:
                    print(f"  ✅ 昵称→邮箱映射正确！")
                else:
                    print(f"  ❌ 昵称→邮箱映射不正确")
            except Exception as e:
                print(f"  ❌ 昵称查询失败: {e}")
            
            print("\n📝 步骤6: 测试登录")
            print("-" * 50)
            try:
                login_result = supabase.auth.sign_in_with_password({
                    'email': email,
                    'password': password
                }).execute()
                
                if login_result.data.user:
                    print(f"  ✅ 登录成功")
                    print(f"     用户ID: {login_result.data.user.id[:8]}...")
                    print(f"     邮箱: {login_result.data.user.email}")
                    print(f"     昵称: {login_result.data.user.user_metadata.get('nickname', '未设置')}")
                else:
                    print(f"  ❌ 登录失败")
            except Exception as e:
                print(f"  ❌ 登录失败: {e}")
            
            print("\n" + "=" * 70)
            print("🎉 测试完成！")
            print("=" * 70)
            
        else:
            print(f"  ❌ 验证码验证失败")
            
    except Exception as e:
        print(f"  ❌ 验证失败: {e}")


if __name__ == '__main__':
    main()
