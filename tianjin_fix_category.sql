-- ============================================
-- 修正天津一分一段表category字段
-- 说明：天津2026年数据导入时未指定category，导致查询时按物理类/历史类过滤无法匹配
-- 天津为3+3模式，不分文理，category应设为'普通类'（与海南保持一致）
-- ============================================

-- 第一步：查看当前天津数据category情况
SELECT province, category, COUNT(*) as records
FROM score_distribution
WHERE province = '天津'
GROUP BY province, category;

-- 第二步：将天津数据的category更新为'普通类'
UPDATE score_distribution
SET category = '普通类'
WHERE province = '天津' AND (category IS NULL OR category = '');

-- 第三步：验证更新结果
SELECT province, category, COUNT(*) as records, MIN(score) as min_score, MAX(score) as max_score, MAX(cumulative_count) as total_students
FROM score_distribution
WHERE province = '天津'
GROUP BY province, category;

-- 第四步：验证查询（以600分为例，应有位次10077）
SELECT province, year, score, count, cumulative_count, min_rank, max_rank, category
FROM score_distribution
WHERE province = '天津' AND year = 2026 AND score = 600;
