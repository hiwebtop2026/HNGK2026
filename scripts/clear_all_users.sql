-- ============================================
-- 危险操作：清理所有用户数据
-- ============================================
-- 此脚本将删除所有用户相关数据，请谨慎操作！
-- 执行前请确保已备份数据或确认不需要保留任何用户信息。
-- ============================================

-- 1. 先查看当前用户数据统计
SELECT 'auth.users' AS table_name, count(*) AS record_count FROM auth.users
UNION ALL
SELECT 'profiles', count(*) FROM profiles
UNION ALL
SELECT 'usage_logs', count(*) FROM usage_logs
UNION ALL
SELECT 'volunteer_plans', count(*) FROM volunteer_plans;

-- ============================================
-- 确认无误后，取消注释下面的语句执行清理
-- ============================================

-- -- 2. 删除用户志愿方案
-- DELETE FROM volunteer_plans;

-- -- 3. 删除用户操作日志
-- DELETE FROM usage_logs;

-- -- 4. 删除用户昵称映射表
-- DELETE FROM profiles;

-- -- 5. 删除认证用户（需要超级用户权限）
-- DELETE FROM auth.users;

-- -- 6. 重置序列（可选，清理后重置自增ID）
-- SELECT setval('profiles_id_seq', 1);
-- SELECT setval('usage_logs_id_seq', 1);
-- SELECT setval('volunteer_plans_id_seq', 1);

-- -- 7. 验证清理结果
-- SELECT '清理后统计' AS message;
-- SELECT 'auth.users' AS table_name, count(*) AS record_count FROM auth.users
-- UNION ALL
-- SELECT 'profiles', count(*) FROM profiles
-- UNION ALL
-- SELECT 'usage_logs', count(*) FROM usage_logs
-- UNION ALL
-- SELECT 'volunteer_plans', count(*) FROM volunteer_plans;
