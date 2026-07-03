-- ============================================
-- 修复一分一段表：添加唯一约束和category字段
-- ============================================

-- 1. 添加category字段（如果不存在）
ALTER TABLE score_distribution ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT '普通类';

-- 2. 添加rank字段（兼容旧代码）
ALTER TABLE score_distribution ADD COLUMN IF NOT EXISTS rank INTEGER;

-- 3. 删除旧索引（如果存在）
DROP INDEX IF EXISTS score_distribution_province_year_score_idx;

-- 4. 创建唯一约束（用于ON CONFLICT更新）
CREATE UNIQUE INDEX IF NOT EXISTS score_distribution_province_year_score_unique 
ON score_distribution (province, year, score);

-- 5. 重新创建普通索引
CREATE INDEX IF NOT EXISTS score_distribution_province_year_idx ON score_distribution (province, year);

-- 6. 验证表结构
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'score_distribution' 
ORDER BY ordinal_position;
