-- ⚠️ 历史脚本，勿直接执行！本脚本会禁用 RLS，导致数据库可被任意读写。
-- RLS 策略已更新，如需修复请使用 security_fix_rls.sql
ALTER TABLE score_distribution DISABLE ROW LEVEL SECURITY;
ALTER TABLE admission_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE major_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE subject_requirements DISABLE ROW LEVEL SECURITY;