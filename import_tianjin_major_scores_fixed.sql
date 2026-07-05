-- ============================================
-- 天津2023-2025年高考专业分数线数据导入（修复版）
-- 修复内容：修复820条school_name为空的记录
-- 总记录数: 2647条
-- 学校数: 127所
-- ============================================

-- 第一步：清理旧的天津专业分数线数据
DELETE FROM major_scores WHERE province = '天津';

-- 第二步：批量插入天津专业分数线数据
INSERT INTO major_scores (school_name, province, year, major_name,
                         major_group, min_score, min_rank, person_count,
                         batch, subject_requirement)
VALUES 
