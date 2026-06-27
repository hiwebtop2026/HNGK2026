import { createClient } from '@supabase/supabase-js';

// Supabase 配置 - 用户需要替换为自己的项目信息
// 获取方式：登录 supabase.com → 创建项目 → Settings → API
// anon key 是公开安全的，可以硬编码在客户端代码中
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
} as const;