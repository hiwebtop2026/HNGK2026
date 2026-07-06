import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'no-reply@haogaokao.dev';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, nickname } = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ success: false, error: '请输入正确的邮箱地址' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from('auth_otps').insert({
      email: email.trim(),
      code,
      expires_at: expiresAt,
      used: false,
    });

    if (insertError) {
      console.error('保存验证码失败:', insertError);
      return new Response(JSON.stringify({ success: false, error: '验证码生成失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!SENDGRID_API_KEY) {
      return new Response(JSON.stringify({ 
        success: true, 
        code: code 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const htmlContent = `
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
    <p style="color: #64748b; margin: 0 0 20px;">您好${nickname ? '，' + nickname : ''}，感谢注册智能高考志愿助手！</p>
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #6366f1; font-family: monospace;">${code}</span>
    </div>
    <p style="color: #94a3b8; font-size: 14px; margin: 0;">验证码有效期为10分钟，请尽快使用。</p>
    <p style="color: #cbd5e1; font-size: 12px; margin: 10px 0 0;">如果这不是您的操作，请忽略此邮件。</p>
  </div>
</body>
</html>
    `;

    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.trim() }] }],
        from: { email: FROM_EMAIL, name: '智能高考志愿助手' },
        subject: '【智能高考志愿助手】注册验证码',
        content: [
          { type: 'text/html', value: htmlContent },
          { type: 'text/plain', value: `您的验证码是：${code}\n验证码有效期为10分钟。` },
        ],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorData = await sendgridResponse.json();
      console.error('发送邮件失败:', errorData);
      return new Response(JSON.stringify({ success: false, error: '邮件发送失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge Function 错误:', error);
    return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}