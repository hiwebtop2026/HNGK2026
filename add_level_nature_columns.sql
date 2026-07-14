ALTER TABLE major_scores ADD COLUMN IF NOT EXISTS level TEXT DEFAULT '普通本科';
ALTER TABLE major_scores ADD COLUMN IF NOT EXISTS nature TEXT DEFAULT '公办';

CREATE INDEX IF NOT EXISTS idx_major_scores_level ON major_scores(level);
CREATE INDEX IF NOT EXISTS idx_major_scores_nature ON major_scores(nature);

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'major_scores'
ORDER BY ordinal_position;