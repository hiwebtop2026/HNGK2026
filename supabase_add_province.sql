ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT '海南';

CREATE INDEX IF NOT EXISTS admission_scores_province_idx ON admission_scores (province);

CREATE INDEX IF NOT EXISTS admission_scores_province_year_idx ON admission_scores (province, year);

UPDATE admission_scores SET province = '海南' WHERE province IS NULL;

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
