-- ============================================
-- 启用score_distribution表的RLS策略
-- 允许匿名用户查询数据（前端读取）
-- ============================================

-- 1. 启用行级安全
ALTER TABLE score_distribution ENABLE ROW LEVEL SECURITY;

-- 2. 创建策略：允许所有人查询（SELECT）
CREATE POLICY "允许公开查询一分一段表" ON score_distribution
    FOR SELECT
    USING (true);

-- 3. 创建策略：允许认证用户插入（INSERT）
CREATE POLICY "允许认证用户插入一分一段表" ON score_distribution
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 4. 创建策略：允许认证用户更新（UPDATE）
CREATE POLICY "允许认证用户更新一分一段表" ON score_distribution
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. 创建策略：允许认证用户删除（DELETE）
CREATE POLICY "允许认证用户删除一分一段表" ON score_distribution
    FOR DELETE
    TO authenticated
    USING (true);

-- 6. 验证策略
SELECT tablename, policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'score_distribution';
