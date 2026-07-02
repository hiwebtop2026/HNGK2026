-- ========================================
-- 夸克高考专业分数线数据表 SQL
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ========================================

-- 1. 创建 major_scores 表（如果已存在则跳过）
CREATE TABLE IF NOT EXISTS major_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  school_code TEXT,
  province TEXT DEFAULT '海南',
  level TEXT,
  major_name TEXT NOT NULL,
  major_group TEXT,
  subject_requirement TEXT,
  year INTEGER NOT NULL,
  min_score INTEGER,
  min_rank INTEGER,
  avg_score INTEGER,
  batch TEXT,
  batch_line INTEGER,
  batch_line_diff INTEGER,
  person_count INTEGER,
  source TEXT DEFAULT '夸克高考',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引（提升查询速度）
CREATE INDEX IF NOT EXISTS idx_major_scores_school_name ON major_scores(school_name);
CREATE INDEX IF NOT EXISTS idx_major_scores_year ON major_scores(year);
CREATE INDEX IF NOT EXISTS idx_major_scores_province ON major_scores(province);
CREATE INDEX IF NOT EXISTS idx_major_scores_major_name ON major_scores(major_name);

-- 3. 禁用 RLS（行级安全）
-- 与 admission_scores、subject_requirements 表保持一致，允许数据导入
-- 注意：该表存储公开的分数线数据（非用户私有数据），禁用 RLS 安全
ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;

-- 4. 清理旧策略（如果之前创建过）
DROP POLICY IF EXISTS "Allow public read major_scores" ON major_scores;
DROP POLICY IF EXISTS "Allow authenticated insert major_scores" ON major_scores;
DROP POLICY IF EXISTS "Allow authenticated update major_scores" ON major_scores;
DROP POLICY IF EXISTS "Allow admin delete major_scores" ON major_scores;

-- 8. 创建更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_major_scores_updated_at ON major_scores;
CREATE TRIGGER update_major_scores_updated_at
  BEFORE UPDATE ON major_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. 清空表（可选，用于重新导入）
-- TRUNCATE TABLE major_scores;

-- 10. 验证表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'major_scores'
ORDER BY ordinal_position;
