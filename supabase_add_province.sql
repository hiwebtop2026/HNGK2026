-- ============================================
-- 数据库迁移脚本：添加province字段支持全国各地区
-- 适用表：admission_scores, major_scores
-- ============================================

-- ============================================
-- 第一步：为admission_scores表添加province字段
-- ============================================

-- 1.1 添加province字段（默认值为海南，兼容现有数据）
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT '海南';

-- 1.2 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS admission_scores_province_idx ON admission_scores (province);
CREATE INDEX IF NOT EXISTS admission_scores_province_year_idx ON admission_scores (province, year);

-- 1.3 更新现有数据的province字段（确保所有数据都有province值）
UPDATE admission_scores SET province = '海南' WHERE province IS NULL;

-- ============================================
-- 第二步：为major_scores表添加province字段
-- ============================================

-- 2.1 添加province字段（默认值为海南，兼容现有数据）
ALTER TABLE major_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT '海南';

-- 2.2 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS major_scores_province_idx ON major_scores (province);
CREATE INDEX IF NOT EXISTS major_scores_province_year_idx ON major_scores (province, year);

-- 2.3 更新现有数据的province字段（确保所有数据都有province值）
UPDATE major_scores SET province = '海南' WHERE province IS NULL;

-- ============================================
-- 第三步：更新视图以包含province字段
-- ============================================

-- 3.1 更新admission_score_stats视图
CREATE OR REPLACE VIEW admission_score_stats AS
SELECT 
    province,
    school_name,
    school_code,
    COUNT(DISTINCT year) as years_count,
    MIN(score) as min_score,
    MAX(score) as max_score,
    AVG(score)::INTEGER as avg_score,
    MIN(score) FILTER (WHERE year = 2023) as score_2023,
    MIN(score) FILTER (WHERE year = 2024) as score_2024,
    MIN(score) FILTER (WHERE year = 2025) as score_2025
FROM admission_scores
GROUP BY province, school_name, school_code
ORDER BY province, avg_score DESC;

-- 3.2 更新group_score_changes视图
CREATE OR REPLACE VIEW group_score_changes AS
SELECT 
    province,
    group_code,
    group_name,
    school_name,
    subject_requirement,
    score_2023,
    score_2024,
    score_2025,
    COALESCE(score_2024 - score_2023, 0) as change_23_24,
    COALESCE(score_2025 - score_2024, 0) as change_24_25
FROM (
    SELECT 
        province,
        group_code,
        group_name,
        school_name,
        subject_requirement,
        MIN(score) FILTER (WHERE year = 2023) as score_2023,
        MIN(score) FILTER (WHERE year = 2024) as score_2024,
        MIN(score) FILTER (WHERE year = 2025) as score_2025
    FROM admission_scores
    GROUP BY province, group_code, group_name, school_name, subject_requirement
) t
WHERE score_2023 IS NOT NULL OR score_2024 IS NOT NULL OR score_2025 IS NOT NULL;

-- ============================================
-- 第四步：验证迁移结果
-- ============================================

-- 4.1 检查admission_scores表province字段数据分布
SELECT 'admission_scores' as table_name, province, COUNT(*) as record_count 
FROM admission_scores 
GROUP BY province 
ORDER BY record_count DESC;

-- 4.2 检查major_scores表province字段数据分布
SELECT 'major_scores' as table_name, province, COUNT(*) as record_count 
FROM major_scores 
GROUP BY province 
ORDER BY record_count DESC;

-- ============================================
-- 迁移完成！
-- ============================================
