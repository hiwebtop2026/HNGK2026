-- 天津2023-2025年高考专业分数线数据导入
DELETE FROM major_scores WHERE province = '天津';

INSERT INTO major_scores (school_name, province, year, major_name, major_group, min_score, min_rank, person_count, batch, subject_requirement)
VALUES 
('上海交通大学', '天津', 2023, '电子信息类', '', 699, 71, 1, '本科批', '物+化(2科必选)'),
('上海交通大学', '天津', 2023, '人工智能', '', 697, 106, 2, '本科批', '物+化(2科必选)'),
('上海交通大学', '天津', 2023, '电子信息类', '', 697, 106, 2, '本科批', '物+化(2科必选)'),
('上海交通大学', '天津', 2023, '理科试验班类', '', 696, 118, 1, '本科批', '物+化(2科必选)'),
('上海交通大学', '天津', 2023, '工科试验班类', '', 695, 137, 1, '本科批', '物+化(2科必选)');