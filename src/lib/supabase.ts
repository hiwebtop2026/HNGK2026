import { createClient } from '@supabase/supabase-js';

// Supabase 配置 - 严格从环境变量读取，不再硬编码 fallback
// 获取方式：登录 supabase.com → 创建项目 → Settings → API
// 部署前必须在 .env 中配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] 缺少环境变量 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY，请在 .env 中配置');
}

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