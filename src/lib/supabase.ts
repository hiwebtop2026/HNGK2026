import { createClient } from '@supabase/supabase-js';

// Supabase 配置
// 获取方式：登录 supabase.com → 创建项目 → Settings → API
// anon key 是为客户端设计的公开密钥，可以安全地包含在前端代码中
// 安全说明：anon key 是公开密钥，安全性依赖于 Supabase 的 RLS（Row Level Security）策略
// fallback 值用于 GitHub Pages 部署时环境变量可能缺失的场景
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jhcyqhtgtnomqvcdeeuo.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY3lxaHRndG5vbXF2Y2RlZXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTg5NTgsImV4cCI6MjA5ODEzNDk1OH0.UEefdrpIZU1Ul-gCCGYCElR_JClDgvtIkd3GuK9VK_o';

// 检查是否配置了 Supabase
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// 创建 Supabase 客户端
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// 数据库表名
export const TABLES = {
  USERS: 'profiles',
  VOLUNTEER_PLANS: 'volunteer_plans',
  ADMISSION_SCORES: 'admission_scores',
  SUBJECT_REQUIREMENTS: 'subject_requirements',
} as const;