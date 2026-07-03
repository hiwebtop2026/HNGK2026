-- 步骤1: 为admission_scores表添加province字段
ALTER TABLE admission_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT '海南';

-- 步骤2: 创建索引
CREATE INDEX IF NOT EXISTS admission_scores_province_idx ON admission_scores (province);

-- 步骤3: 更新现有数据
UPDATE admission_scores SET province = '海南' WHERE province IS NULL;

-- 步骤4: 为major_scores表添加province字段
ALTER TABLE major_scores ADD COLUMN IF NOT EXISTS province VARCHAR(50) DEFAULT '海南';

-- 步骤5: 创建索引
CREATE INDEX IF NOT EXISTS major_scores_province_idx ON major_scores (province);

-- 步骤6: 更新现有数据
UPDATE major_scores SET province = '海南' WHERE province IS NULL;

-- 验证执行结果
SELECT 'admission_scores' as table_name, province, COUNT(*) as count FROM admission_scores GROUP BY province
UNION ALL
SELECT 'major_scores' as table_name, province, COUNT(*) as count FROM major_scores GROUP BY province;
