import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || token?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { toEmail } = body

    if (!toEmail) {
      return NextResponse.json({ success: false, error: 'Test email address is required' }, { status: 400 })
    }

    const settings = await prisma.smtpSetting.findFirst()
    if (!settings) {
      return NextResponse.json({ success: false, error: 'SMTP settings not found. Please save settings first.' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.username,
        pass: settings.password,
      },
    })

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: toEmail,
      subject: 'Test Email - Realvibe HRM',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1A1A1A;border-radius:16px;padding:40px;border:1px solid #2D2D2D;">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#8B5CF6;font-size:24px;margin:0;">Realvibe HRM</h1>
        <p style="color:#9CA3AF;font-size:14px;margin:8px 0 0;">Test Email</p>
      </div>
      <div style="color:#FFFFFF;font-size:15px;line-height:1.7;text-align:center;">
        <p>This is a test email from Realvibe HRM.</p>
        <p style="color:#22C55E;font-weight:600;">Your SMTP configuration is working correctly!</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send test email. Check your SMTP credentials.' },
      { status: 500 }
    )
  }
}
