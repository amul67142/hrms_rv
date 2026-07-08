import nodemailer from 'nodemailer'
import { prisma } from '@/lib/core/db'

interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

async function getTransporter() {
  const settings = await prisma.smtpSetting.findFirst()
  if (!settings || !settings.enabled) {
    return null
  }
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: {
      user: settings.username,
      pass: settings.password,
    },
  })
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  try {
    const settings = await prisma.smtpSetting.findFirst()
    if (!settings || !settings.enabled) {
      console.log('[Mail] SMTP disabled, skipping:', options.subject)
      return false
    }
    const transporter = await getTransporter()
    if (!transporter) return false
    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      ...options,
    })
    return true
  } catch (error) {
    console.error('[Mail] Failed to send email:', error)
    return false
  }
}

export function generateEmailTemplate(content: string, title?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Realvibe HRM'}</title>
</head>
<body style="margin:0;padding:0;background-color:#0F0F0F;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1A1A1A;border-radius:16px;padding:40px;border:1px solid #2D2D2D;">
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#8B5CF6;font-size:24px;margin:0;">Realvibe HRM</h1>
        <p style="color:#9CA3AF;font-size:14px;margin:8px 0 0;">Human Resource Management System</p>
      </div>
      <div style="color:#FFFFFF;font-size:15px;line-height:1.7;">
        ${content}
      </div>
      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #2D2D2D;text-align:center;">
        <p style="color:#9CA3AF;font-size:12px;margin:0;">This is an automated notification from Realvibe HRM.</p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function sendLeaveApprovalEmail(
  employeeEmail: string,
  employeeName: string,
  leaveType: string,
  status: 'APPROVED' | 'REJECTED',
  fromDate: string,
  toDate: string,
  notes?: string
) {
  const statusColor = status === 'APPROVED' ? '#22C55E' : '#EF4444'
  const statusText = status === 'APPROVED' ? 'Approved' : 'Rejected'
  const content = `
    <h2 style="color:#FFFFFF;margin-bottom:20px;">Leave Request ${statusText}</h2>
    <p style="color:#9CA3AF;margin-bottom:8px;">Dear ${employeeName},</p>
    <p style="color:#9CA3AF;">Your leave request has been <strong style="color:${statusColor};">${statusText}</strong>.</p>
    <div style="background:#262626;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">Leave Type</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${leaveType}</td></tr>
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">From</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${fromDate}</td></tr>
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">To</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${toDate}</td></tr>
        ${notes ? `<tr><td style="color:#9CA3AF;padding:8px 0;">Note</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;">${notes}</td></tr>` : ''}
      </table>
    </div>
    <p style="color:#9CA3AF;font-size:13px;">Log in to your HRM portal to view full details.</p>
  `
  return sendMail({
    to: employeeEmail,
    subject: `Leave Request ${statusText} - ${leaveType}`,
    html: generateEmailTemplate(content),
  })
}

export async function sendLeaveApplicationEmail(
  adminEmails: string[],
  employeeName: string,
  leaveType: string,
  fromDate: string,
  toDate: string,
  totalDays: number,
  reason?: string
) {
  const content = `
    <h2 style="color:#FFFFFF;margin-bottom:20px;">New Leave Request Pending Approval</h2>
    <p style="color:#9CA3AF;margin-bottom:8px;">Hello,</p>
    <p style="color:#9CA3AF;"><strong style="color:#FFFFFF;">${employeeName}</strong> has submitted a new leave request that is pending review.</p>
    <div style="background:#262626;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">Employee Name</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${employeeName}</td></tr>
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">Leave Type</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${leaveType}</td></tr>
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">From Date</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${fromDate}</td></tr>
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">To Date</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${toDate}</td></tr>
        <tr><td style="color:#9CA3AF;padding:8px 0;border-bottom:1px solid #2D2D2D;">Total Days</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;border-bottom:1px solid #2D2D2D;">${totalDays} day${totalDays !== 1 ? 's' : ''}</td></tr>
        ${reason ? `<tr><td style="color:#9CA3AF;padding:8px 0;">Reason</td><td style="color:#FFFFFF;text-align:right;padding:8px 0;">${reason}</td></tr>` : ''}
      </table>
    </div>
    <p style="color:#9CA3AF;font-size:13px;">Log in to the Admin/HRM portal to review and take action on this request.</p>
  `
  const results = await Promise.all(
    adminEmails.map(email =>
      sendMail({
        to: email,
        subject: `New Leave Request: ${employeeName} - ${leaveType}`,
        html: generateEmailTemplate(content),
      })
    )
  )
  return results.filter(Boolean).length
}


export async function sendReimbursementApprovalEmail(
  employeeEmail: string,
  employeeName: string,
  title: string,
  amount: number,
  status: 'APPROVED' | 'REJECTED' | 'PAID',
  notes?: string
) {
  const statusColor = status === 'APPROVED' ? '#22C55E' : status === 'PAID' ? '#8B5CF6' : '#EF4444'
  const content = `
    <h2 style="color:#FFFFFF;margin-bottom:20px;">Reimbursement ${status}</h2>
    <p style="color:#9CA3AF;margin-bottom:8px;">Dear ${employeeName},</p>
    <p style="color:#9CA3AF;">Your reimbursement request <strong style="color:#FFFFFF;">"${title}"</strong> for <strong style="color:#8B5CF6;">Rs.${amount.toLocaleString('en-IN')}</strong> has been <strong style="color:${statusColor};">${status}</strong>.</p>
    ${notes ? `<p style="color:#9CA3AF;background:#262626;padding:12px;border-radius:8px;margin:16px 0;">Note: ${notes}</p>` : ''}
    <p style="color:#9CA3AF;font-size:13px;">Log in to your HRM portal to view full details.</p>
  `
  return sendMail({
    to: employeeEmail,
    subject: `Reimbursement ${status} - ${title}`,
    html: generateEmailTemplate(content),
  })
}

export async function sendPasswordResetEmail(employeeEmail: string, resetToken: string) {
  const resetUrl = `${process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
  const content = `
    <h2 style="color:#FFFFFF;margin-bottom:20px;">Password Reset Request</h2>
    <p style="color:#9CA3AF;margin-bottom:16px;">We received a request to reset your password.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#8B5CF6;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">Reset Password</a>
    <p style="color:#9CA3AF;font-size:13px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
  `
  return sendMail({
    to: employeeEmail,
    subject: 'Password Reset - Realvibe HRM',
    html: generateEmailTemplate(content),
  })
}

export async function sendNoticeEmail(employeeEmails: string[], noticeTitle: string, noticeContent: string) {
  const content = `
    <h2 style="color:#FFFFFF;margin-bottom:20px;">${noticeTitle}</h2>
    <div style="background:#262626;border-radius:12px;padding:20px;margin:16px 0;">
      <p style="color:#FFFFFF;margin:0;white-space:pre-wrap;">${noticeContent}</p>
    </div>
    <p style="color:#9CA3AF;font-size:13px;">Log in to your HRM portal to view full details.</p>
  `
  const results = await Promise.all(
    employeeEmails.map(email =>
      sendMail({
        to: email,
        subject: `Notice: ${noticeTitle}`,
        html: generateEmailTemplate(content, noticeTitle),
      })
    )
  )
  return results.filter(Boolean).length
}

export async function sendReportEmail(employeeEmail: string, reportType: string, period: string, downloadUrl?: string) {
  const content = `
    <h2 style="color:#FFFFFF;margin-bottom:20px;">${reportType} Report</h2>
    <p style="color:#9CA3AF;">Your requested <strong style="color:#FFFFFF;">${reportType}</strong> report for <strong style="color:#8B5CF6;">${period}</strong> is ready.</p>
    ${downloadUrl ? `<a href="${downloadUrl}" style="display:inline-block;background:#8B5CF6;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">Download Report</a>` : '<p style="color:#9CA3AF;">Log in to your HRM portal to download the report.</p>'}
  `
  return sendMail({
    to: employeeEmail,
    subject: `${reportType} Report - ${period}`,
    html: generateEmailTemplate(content),
  })
}
