import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { VolunteerResult } from '../utils/volunteerUtils';

export type UsageAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'generate_plan'
  | 'view_result'
  | 'export_plan'
  | 'upload_data'
  | 'change_settings';

interface UsageLog {
  id?: string;
  user_id?: string;
  email?: string;
  action: UsageAction;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

interface UsageState {
  isLogging: boolean;
  
  logAction: (action: UsageAction, details?: Record<string, any>) => Promise<boolean>;
  logGeneratePlan: (
    baseScore: number,
    subject: number,
    totalVolunteers: number,
    resultsCount: number,
    extra?: Record<string, any>
  ) => Promise<boolean>;
  getCurrentUserStats: () => Promise<Record<string, number> | null>;
}

// 本地存储键
const USAGE_LOGS_KEY = 'hngk_usage_logs_local';

function getLocalLogs(): UsageLog[] {
  const stored = localStorage.getItem(USAGE_LOGS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveLocalLogs(logs: UsageLog[]): void {
  const trimmed = logs.slice(-100);
  localStorage.setItem(USAGE_LOGS_KEY, JSON.stringify(trimmed));
}

export const useUsageStore = create<UsageState>((set, get) => ({
  isLogging: false,
  
  logAction: async (action, details) => {
    if (!isSupabaseConfigured || !supabase) {
      // 本地模式：记录到 localStorage
      try {
        const logs = getLocalLogs();
        const log: UsageLog = {
          action,
          details,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString(),
        };
        logs.push(log);
        saveLocalLogs(logs);
      } catch {}
      return true;
    }
    
    // Supabase 模式
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return false;
      }
      
      const { error } = await supabase
        .from('usage_logs')
        .insert({
          user_id: session.user.id,
          email: session.user.email,
          action,
          details: details || {},
          user_agent: navigator.userAgent,
        });
      
      if (error) {
        console.error('Usage log error:', error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Usage log error:', err);
      return false;
    }
  },
  
  logGeneratePlan: async (baseScore, subject, totalVolunteers, resultsCount, extra) => {
    return get().logAction('generate_plan', {
      base_score: baseScore,
      subject,
      total_volunteers: totalVolunteers,
      results_count: resultsCount,
      ...extra,
    });
  },
  
  getCurrentUserStats: async () => {
    if (!isSupabaseConfigured || !supabase) {
      // 本地模式统计
      const logs = getLocalLogs();
      const stats: Record<string, number> = {};
      logs.forEach(log => {
        stats[log.action] = (stats[log.action] || 0) + 1;
      });
      return stats;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      
      const { data, error } = await supabase
        .from('usage_logs')
        .select('action')
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error('Stats error:', error);
        return null;
      }
      
      const stats: Record<string, number> = {};
      data?.forEach((log: { action: string }) => {
        stats[log.action] = (stats[log.action] || 0) + 1;
      });
      
      return stats;
    } catch {
      return null;
    }
  },
}));