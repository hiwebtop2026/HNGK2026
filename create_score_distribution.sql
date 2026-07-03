
-- 创建一分一段表
CREATE TABLE IF NOT EXISTS score_distribution (
    id BIGSERIAL PRIMARY KEY,
    province VARCHAR(50) NOT NULL DEFAULT '海南',
    year INTEGER NOT NULL,
    score INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    cumulative_count INTEGER NOT NULL DEFAULT 0,
    min_rank INTEGER,
    max_rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS score_distribution_province_idx ON score_distribution (province);
CREATE INDEX IF NOT EXISTS score_distribution_province_year_idx ON score_distribution (province, year);
CREATE INDEX IF NOT EXISTS score_distribution_province_year_score_idx ON score_distribution (province, year, score);

-- 创建视图
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
