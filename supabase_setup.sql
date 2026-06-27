-- ========================================
-- 高考志愿助手 - 使用记录表 SQL
-- 在 Supabase Dashboard → SQL Editor 中执行以下语句
-- ========================================

-- 1. 创建 usage_logs 表
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引（提升查询速度）
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);

-- 3. 启用 RLS（行级安全）
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 4. 创建策略：用户只能查看自己的记录
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
CREATE POLICY "Users can view own usage logs"
  ON usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 5. 创建策略：用户可以插入自己的使用记录
DROP POLICY IF EXISTS "Users can insert own usage logs" ON usage_logs;
CREATE POLICY "Users can insert own usage logs"
  ON usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 常用查询示例（在 SQL Editor 中执行）
-- ========================================

-- 查看所有用户数
-- SELECT COUNT(DISTINCT user_id) as total_users FROM usage_logs;

-- 查看今日活跃用户数
-- SELECT COUNT(DISTINCT user_id) as daily_active_users
-- FROM usage_logs
-- WHERE created_at >= DATE_TRUNC('day', NOW());

-- 按行为类型统计
-- SELECT action, COUNT(*) as count
-- FROM usage_logs
-- WHERE created_at >= NOW() - INTERVAL '7 days'
-- GROUP BY action
-- ORDER BY count DESC;

-- 查看某用户的所有记录
-- SELECT * FROM usage_logs
-- WHERE email = 'user@example.com'
-- ORDER BY created_at DESC
-- LIMIT 50;

-- 查看最近24小时的使用趋势
-- SELECT 
--   DATE_TRUNC('hour', created_at) as hour,
--   action,
--   COUNT(*) as count
-- FROM usage_logs
-- WHERE created_at >= NOW() - INTERVAL '24 hours'
-- GROUP BY hour, action
-- ORDER BY hour DESC;
