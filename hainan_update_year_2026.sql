-- ============================================
-- 修正海南一分一段表年份：2025 -> 2026
-- 说明：此前导入的海南一分一段表实为2026年高考数据，需更正年份
-- ============================================

-- 第一步：查看当前海南数据年份分布（执行前确认）
SELECT province, year, COUNT(*) as records
FROM score_distribution
WHERE province = '海南'
GROUP BY province, year
ORDER BY year;

-- 第二步：将海南2025年数据更新为2026年
-- 由于 (province, year, score) 有唯一约束，先删除可能存在的2026年数据（如有），再更新
DELETE FROM score_distribution WHERE province = '海南' AND year = 2026;
UPDATE score_distribution SET year = 2026 WHERE province = '海南' AND year = 2025;

-- 第三步：验证更新结果
SELECT province, year, COUNT(*) as records, MIN(score) as min_score, MAX(score) as max_score, MAX(cumulative_count) as total_students
FROM score_distribution
WHERE province = '海南'
GROUP BY province, year
ORDER BY year;

-- 第四步：验证所有省份年份分布
SELECT province, year, COUNT(*) as records, MIN(score) as min_score, MAX(score) as max_score, MAX(cumulative_count) as total_students
FROM score_distribution
GROUP BY province, year
ORDER BY province, year;
