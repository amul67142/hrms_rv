import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/core/db'

export const dynamic = 'force-dynamic'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    })

    // To prevent user enumeration, return success even if the email does not exist.
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists in our system, a password reset link has been sent.',
      })
    }

    // Generate secure 32-byte token
    const token = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry

    // Save token to DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: tokenExpiry,
      },
    })

    // Get SMTP settings
    const smtpSettings = await prisma.smtpSetting.findFirst()
    if (!smtpSettings || !smtpSettings.enabled) {
      console.error('[FORGOT PASSWORD] SMTP settings are missing or disabled.')
      return NextResponse.json({
        success: false,
        error: 'Email service is currently unavailable. Please contact system administrator.',
      }, { status: 500 })
    }

    // Base origin URL
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const resetUrl = `${origin}/reset-password?token=${token}`

    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      auth: {
        user: smtpSettings.username,
        pass: smtpSettings.password,
      },
    })

    const employeeName = user.employee 
      ? `${user.employee.firstName} ${user.employee.lastName}` 
      : 'User'

    // Send email
    await transporter.sendMail({
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to: user.email,
      subject: 'Reset Your Password - Realvibe HRM',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1A1A1A;border-radius:16px;padding:40px;border:1px solid #2D2D2D;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);">
      <div style="text-align:center;margin-bottom:30px;">
        <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:linear-gradient(135deg,#7C3AED,#8B5CF6);color:#FFFFFF;font-weight:bold;font-size:22px;">
          R
        </div>
        <h1 style="color:#8B5CF6;font-size:24px;margin:15px 0 0;font-weight:700;">Realvibe HRM</h1>
        <p style="color:#9CA3AF;font-size:14px;margin:5px 0 0;">Password Reset Request</p>
      </div>
      
      <div style="color:#E5E7EB;font-size:15px;line-height:1.7;">
        <p>Hello <strong>${employeeName}</strong>,</p>
        <p>We received a request to reset your password for your Realvibe HRM account. Click the button below to secure your account and set a new password:</p>
        
        <div style="text-align:center;margin:30px 0;">
          <a href="${resetUrl}" style="background:#8B5CF6;color:#FFFFFF;text-decoration:none;padding:12px 30px;font-size:15px;font-weight:600;border-radius:8px;display:inline-block;transition:background 0.2s;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size:13px;color:#9CA3AF;text-align:center;">
          Or copy and paste this link into your web browser:<br>
          <a href="${resetUrl}" style="color:#A78BFA;word-break:break-all;">${resetUrl}</a>
        </p>
        
        <hr style="border:0;border-top:1px solid #2D2D2D;margin:30px 0;">
        
        <p style="font-size:13px;color:#9CA3AF;margin:0;">
          This link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email or contact support if you have concerns.
        </p>
      </div>
    </div>
    
    <div style="text-align:center;margin-top:20px;color:#6B7280;font-size:12px;">
      <p>&copy; 2026 Realvibe Digital Media Pvt. Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    })

    // Create Audit Log
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        employeeId: user.employeeId || undefined,
        module: 'AUTH',
        action: 'FORGOT_PASSWORD_REQUEST',
        description: `Password reset link requested from IP ${ipAddress}`,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'If the email exists in our system, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
