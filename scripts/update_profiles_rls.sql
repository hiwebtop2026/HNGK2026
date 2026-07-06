-- ========================================
-- 更新 profiles 表 RLS 策略（安全加固）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ========================================

-- 1. 删除旧的不安全策略
DROP POLICY IF EXISTS "Anyone can read profile by nickname" ON profiles;

-- 2. 创建安全的昵称查询函数（SECURITY DEFINER）
-- 允许匿名用户按昵称查询邮箱，但只能精确查询，无法遍历所有用户
CREATE OR REPLACE FUNCTION public.get_email_by_nickname(p_nickname TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT email FROM public.profiles
    WHERE nickname = p_nickname
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 验证函数创建成功
SELECT 'Function created: get_email_by_nickname' AS result;

-- 4. 查看当前 RLS 策略
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE tablename = 'profiles';
