-- ============================================
-- 启用score_distribution_stats视图的RLS策略
-- 允许匿名用户查询数据（前端读取统计信息）
-- ============================================

-- 1. 为视图启用行级安全
ALTER VIEW score_distribution_stats ENABLE ROW LEVEL SECURITY;

-- 2. 创建策略：允许所有人查询（SELECT）
CREATE POLICY "允许公开查询一分一段表统计" ON score_distribution_stats
    FOR SELECT
    USING (true);

-- 3. 验证策略
SELECT tablename, policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'score_distribution_stats';
