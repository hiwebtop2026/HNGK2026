-- ============================================================
-- 安全加固：修复 RLS（行级安全）策略
-- ============================================================
-- 用途：修复历史脚本遗留的危险 RLS 策略，仅允许匿名读取，
--       禁止前端任意写入/删除数据。
--
-- 执行方式：在 Supabase Dashboard → SQL Editor 中粘贴并执行
--
-- 执行前请确认：
--   1. 已在 Supabase 控制台轮换 service_role 和 anon 密钥
--   2. 已删除 execute_sql RPC 函数（Database → Functions）
--
-- 安全说明：
--   - 修复后前端（anon key）只能 SELECT，无法 INSERT/UPDATE/DELETE
--   - 数据导入应通过 Python 脚本使用 service_role 密钥完成
--   - volunteer_plans 和 usage_logs 表保留认证用户的写权限（业务需要）
-- ============================================================

-- ============================================================
-- 1. 启用 RLS（对 5 张核心数据表）
-- ============================================================
ALTER TABLE admission_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_info ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. 删除所有旧策略（含危险的 INSERT/UPDATE/DELETE 策略）
--    使用动态 SQL 删除这些表上的所有策略，确保无遗漏
-- ============================================================
DO $$
DECLARE
  r RECORD;
  tables text[] := ARRAY['admission_scores', 'major_scores', 'score_distribution', 'subject_requirements', 'school_info'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, t);
      RAISE NOTICE '已删除策略: % on %', r.policyname, t;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 3. 仅创建匿名 SELECT 策略（前端读取需要）
--    前端使用 anon key，需要匿名读取这些数据表
-- ============================================================
CREATE POLICY "anon_select_admission_scores"
  ON admission_scores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon_select_major_scores"
  ON major_scores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon_select_score_distribution"
  ON score_distribution FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon_select_subject_requirements"
  ON subject_requirements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "anon_select_school_info"
  ON school_info FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 4. 验证策略结果
--    执行后应只看到 FOR SELECT 策略，无 INSERT/UPDATE/DELETE
-- ============================================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('admission_scores', 'major_scores', 'score_distribution', 'subject_requirements', 'school_info')
ORDER BY tablename, policyname;

-- ============================================================
-- 5. 可选：删除危险的 execute_sql RPC 函数
--    若该函数存在，任意持有 anon key 者均可执行任意 SQL
-- ============================================================
-- DROP FUNCTION IF EXISTS execute_sql(text) CASCADE;
-- 取消上方注释行以删除该函数（推荐）
