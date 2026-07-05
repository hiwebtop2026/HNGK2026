-- ⚠️ 历史脚本，勿直接执行！RLS 策略已更新，请使用 security_fix_rls.sql
-- ============================================
-- 检查并启用所有相关表的RLS策略
-- 允许前端匿名查询数据
-- ============================================

-- ============================================
-- 1. admission_scores表
-- ============================================
ALTER TABLE admission_scores ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "允许公开查询录取分数线" ON admission_scores;

-- 创建查询策略
CREATE POLICY "允许公开查询录取分数线" ON admission_scores
    FOR SELECT
    USING (true);

-- ============================================
-- 2. major_scores表
-- ============================================
ALTER TABLE major_scores ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "允许公开查询专业分数线" ON major_scores;

-- 创建查询策略
CREATE POLICY "允许公开查询专业分数线" ON major_scores
    FOR SELECT
    USING (true);

-- ============================================
-- 3. score_distribution表
-- ============================================
ALTER TABLE score_distribution ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "允许公开查询一分一段表" ON score_distribution;

-- 创建查询策略
CREATE POLICY "允许公开查询一分一段表" ON score_distribution
    FOR SELECT
    USING (true);

-- ============================================
-- 验证所有策略
-- ============================================
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN ('admission_scores', 'major_scores', 'score_distribution')
ORDER BY tablename, policyname;
