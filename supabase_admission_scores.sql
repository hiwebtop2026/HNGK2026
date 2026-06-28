-- 海南高考历年投档分数线数据表
-- Supabase数据库创建脚本

-- 1. 创建投档分数线主表
CREATE TABLE IF NOT EXISTS admission_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,                    -- 年份 (2023, 2024, 2025)
    group_code VARCHAR(10) NOT NULL,          -- 院校专业组代码 (如 '000102')
    group_name VARCHAR(200) NOT NULL,         -- 院校专业组名称 (如 '北京大学(02)')
    school_name VARCHAR(100) NOT NULL,        -- 学校名称 (从group_name提取)
    school_code VARCHAR(6),                   -- 学校代码 (group_code前6位)
    group_number VARCHAR(10),                 -- 专业组编号 (如 '(02)', '(80)')
    subject_requirement VARCHAR(10),          -- 科目要求代码 (如 '000', '54', '456')
    score INTEGER NOT NULL,                   -- 投档线分数
    plan_count INTEGER,                       -- 计划招生数
    admission_count INTEGER,                  -- 实际投档数
    batch_type VARCHAR(50) DEFAULT '本科普通批', -- 批次类型
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建唯一约束（防止重复插入）
CREATE UNIQUE INDEX IF NOT EXISTS admission_scores_unique_idx 
ON admission_scores (year, group_code);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS admission_scores_year_idx ON admission_scores (year);
CREATE INDEX IF NOT EXISTS admission_scores_school_idx ON admission_scores (school_name);
CREATE INDEX IF NOT EXISTS admission_scores_score_idx ON admission_scores (score);
CREATE INDEX IF NOT EXISTS admission_scores_group_code_idx ON admission_scores (group_code);

-- 4. 添加注释
COMMENT ON TABLE admission_scores IS '海南高考历年院校专业组投档分数线数据表';
COMMENT ON COLUMN admission_scores.year IS '高考年份';
COMMENT ON COLUMN admission_scores.group_code IS '院校专业组代码，6位学校代码+专业组编号';
COMMENT ON COLUMN admission_scores.group_name IS '院校专业组完整名称';
COMMENT ON COLUMN admission_scores.school_name IS '学校名称';
COMMENT ON COLUMN admission_scores.subject_requirement IS '科目要求代码：000=不限，4=物理，5=化学，6=生物，7=政治，8=历史，9=地理，54=物理+化学必选';
COMMENT ON COLUMN admission_scores.score IS '投档分数线';
COMMENT ON COLUMN admission_scores.plan_count IS '计划招生人数';
COMMENT ON COLUMN admission_scores.admission_count IS '实际投档人数';

-- 5. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admission_scores_updated_at 
    BEFORE UPDATE ON admission_scores 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建科目要求解析表（用于解释科目要求代码）
CREATE TABLE IF NOT EXISTS subject_requirements (
    code VARCHAR(10) PRIMARY KEY,             -- 科目要求代码
    description VARCHAR(200) NOT NULL,        -- 科目要求描述
    subjects VARCHAR(100),                    -- 具体科目列表
    requirement_type VARCHAR(50)              -- 要求类型：不限/单选/双选/三选
);

-- 7. 插入科目要求解析数据
INSERT INTO subject_requirements (code, description, subjects, requirement_type) VALUES
('000', '不提科目要求', '不限', '不限'),
('0', '不提科目要求', '不限', '不限'),
('4', '物理', '物理', '单选'),
('5', '化学', '化学', '单选'),
('6', '生物', '生物', '单选'),
('7', '思想政治', '思想政治', '单选'),
('8', '历史', '历史', '单选'),
('9', '地理', '地理', '单选'),
('45', '物理或化学（选考其中一门即可）', '物理,化学', '双选或'),
('54', '物理和化学（均须选考）', '物理,化学', '双选必'),
('456', '物理或化学或生物（选考其中一门即可）', '物理,化学,生物', '三选或'),
('56', '化学和生物（均须选考）', '化学,生物', '双选必'),
('65', '化学或生物（选考其中一门即可）', '化学,生物', '双选或'),
('469', '物理或生物或地理（选考其中一门即可）', '物理,生物,地理', '三选或'),
('48', '物理或历史（选考其中一门即可）', '物理,历史', '双选或'),
('489', '物理或历史或地理（选考其中一门即可）', '物理,历史,地理', '三选或'),
('87', '历史或政治（选考其中一门即可）', '历史,政治', '双选或'),
('89', '历史或地理（选考其中一门即可）', '历史,地理', '双选或')
ON CONFLICT (code) DO NOTHING;

-- 8. 创建学校信息汇总表
CREATE TABLE IF NOT EXISTS school_info (
    school_code VARCHAR(6) PRIMARY KEY,       -- 学校代码
    school_name VARCHAR(100) NOT NULL,        -- 学校名称
    school_type VARCHAR(50),                  -- 学校类型：985/211/普通本科
    location VARCHAR(50),                     -- 学校所在地
    nature VARCHAR(20),                       -- 办学性质：公办/民办
    level VARCHAR(20),                        -- 办学层次：本科/专科
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 创建历年分数线统计视图
CREATE OR REPLACE VIEW admission_score_stats AS
SELECT 
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
GROUP BY school_name, school_code
ORDER BY avg_score DESC;

-- 10. 创建专业组分数变化视图
CREATE OR REPLACE VIEW group_score_changes AS
SELECT 
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
        group_code,
        group_name,
        school_name,
        subject_requirement,
        MIN(score) FILTER (WHERE year = 2023) as score_2023,
        MIN(score) FILTER (WHERE year = 2024) as score_2024,
        MIN(score) FILTER (WHERE year = 2025) as score_2025
    FROM admission_scores
    GROUP BY group_code, group_name, school_name, subject_requirement
) t
WHERE score_2023 IS NOT NULL OR score_2024 IS NOT NULL OR score_2025 IS NOT NULL;

-- 授权访问（根据Supabase配置调整）
-- ALTER TABLE admission_scores ENABLE ROW Level Security;
-- CREATE POLICY "公开读取投档分数线数据" ON admission_scores FOR SELECT USING (true);
-- CREATE POLICY "允许匿名插入数据" ON admission_scores FOR INSERT WITH CHECK (true);