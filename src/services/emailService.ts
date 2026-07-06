import { supabase } from '../lib/supabase';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: {
        email: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data?.success ? { success: true } : { success: false, error: '发送失败' };
  } catch (error) {
    return { success: false, error: '网络错误' };
  }
}

export async function sendVerificationCode(email: string, code: string, nickname?: string): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: {
        email: email.trim(),
        nickname: nickname?.trim(),
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.success) {
      return { success: true, code: data.code };
    }

    return { success: false, error: '发送失败' };
  } catch (error) {
    return { success: false, error: '网络错误' };
  }
}