const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'no-reply@example.com';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: '邮件服务未配置' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      return { success: true };
    }

    return { success: false, error: data.error?.message || '发送失败' };
  } catch (error) {
    return { success: false, error: '网络错误' };
  }
}

export async function sendVerificationCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>注册验证码</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 12px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 24px;">智能高考志愿助手</h2>
  </div>
  <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 8px;">
    <h3 style="color: #1e293b; margin: 0 0 16px;">您的验证码</h3>
    <p style="color: #64748b; margin: 0 0 20px;">您好，感谢注册智能高考志愿助手！</p>
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #6366f1; font-family: monospace;">${code}</span>
    </div>
    <p style="color: #94a3b8; font-size: 14px; margin: 0;">验证码有效期为10分钟，请尽快使用。</p>
    <p style="color: #cbd5e1; font-size: 12px; margin: 10px 0 0;">如果这不是您的操作，请忽略此邮件。</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: '【智能高考志愿助手】注册验证码',
    html,
    text: `您的验证码是：${code}\n验证码有效期为10分钟。`,
  });
}