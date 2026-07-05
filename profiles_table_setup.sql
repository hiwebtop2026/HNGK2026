-- ========================================
-- 高考志愿助手 - 用户资料表 SQL
-- 在 Supabase Dashboard → SQL Editor 中执行以下语句
-- 用于支持昵称登录（nickname -> email 映射）
-- ========================================

-- 1. 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. 启用 RLS（行级安全）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. 创建策略：匿名用户可按昵称查询邮箱（用于昵称登录）
DROP POLICY IF EXISTS "Anyone can read profile by nickname" ON profiles;
CREATE POLICY "Anyone can read profile by nickname"
  ON profiles
  FOR SELECT
  USING (true);

-- 5. 创建策略：用户可以查看自己的资料
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 6. 创建策略：用户可以更新自己的资料
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 7. 创建触发器函数：用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 绑定触发器到 auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 验证
-- ========================================
-- 查看 profiles 表结构
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;

-- 查看 RLS 策略
-- SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'profiles';
