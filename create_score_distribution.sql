-- ============================================
-- 创建一分一段表（完整版）
-- ============================================

-- 1. 创建表
CREATE TABLE IF NOT EXISTS score_distribution (
    id BIGSERIAL PRIMARY KEY,
    province VARCHAR(50) NOT NULL DEFAULT '海南',
    year INTEGER NOT NULL,
    score INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    cumulative_count INTEGER NOT NULL DEFAULT 0,
    min_rank INTEGER,
    max_rank INTEGER,
    rank INTEGER,
    category VARCHAR(50) DEFAULT '普通类',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建唯一约束（用于ON CONFLICT更新）
CREATE UNIQUE INDEX IF NOT EXISTS score_distribution_province_year_score_unique 
ON score_distribution (province, year, score);

-- 3. 创建普通索引
CREATE INDEX IF NOT EXISTS score_distribution_province_idx ON score_distribution (province);
CREATE INDEX IF NOT EXISTS score_distribution_province_year_idx ON score_distribution (province, year);

-- 4. 创建视图
CREATE OR REPLACE VIEW score_distribution_stats AS
SELECT 
    province,
    year,
    MIN(score) as min_score,
    MAX(score) as max_score,
    SUM(count) as total_students,
    MAX(cumulative_count) as max_cumulative
FROM score_distribution
GROUP BY province, year
ORDER BY province, year DESC;

-- 5. 验证表结构
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'score_distribution' 
ORDER BY ordinal_position;
