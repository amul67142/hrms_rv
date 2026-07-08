import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { sendMail, generateEmailTemplate } from '@/lib/services/mail'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const role = token?.role as Role
    if (role !== 'ADMIN' && role !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required to send credentials' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: { firstName: true, lastName: true, email: true, employeeCode: true },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000'

    const content = `
      <h2 style="color:#FFFFFF;margin-bottom:20px;">Welcome to Realvibe HRM</h2>
      <p style="color:#9CA3AF;margin-bottom:8px;">Dear ${employee.firstName} ${employee.lastName},</p>
      <p style="color:#9CA3AF;">Your HRMS account has been created. Here are your login credentials:</p>
      <div style="background:#262626;border-radius:12px;padding:20px;margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#9CA3AF;padding:10px 0;border-bottom:1px solid #2D2D2D;">Employee Code</td>
            <td style="color:#FFFFFF;text-align:right;padding:10px 0;border-bottom:1px solid #2D2D2D;font-weight:600;">${employee.employeeCode}</td>
          </tr>
          <tr>
            <td style="color:#9CA3AF;padding:10px 0;border-bottom:1px solid #2D2D2D;">Email (Login ID)</td>
            <td style="color:#8B5CF6;text-align:right;padding:10px 0;border-bottom:1px solid #2D2D2D;font-weight:600;">${employee.email}</td>
          </tr>
          <tr>
            <td style="color:#9CA3AF;padding:10px 0;">Password</td>
            <td style="color:#FFFFFF;text-align:right;padding:10px 0;font-family:monospace;font-size:16px;letter-spacing:1px;">${password}</td>
          </tr>
        </table>
      </div>
      <a href="${appUrl}" style="display:inline-block;background:#8B5CF6;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">Login to HRMS Portal</a>
      <p style="color:#9CA3AF;font-size:13px;margin-top:20px;">Please change your password after your first login for security.</p>
    `

    const sent = await sendMail({
      to: employee.email,
      subject: 'Your HRMS Login Credentials - Realvibe HRM',
      html: generateEmailTemplate(content, 'Welcome to Realvibe HRM'),
    })

    if (sent) {
      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: token?.sub as string,
          employeeId: params.id,
          module: 'EMPLOYEE',
          action: 'SEND_CREDENTIALS',
          description: `Sent login credentials email to ${employee.email}`,
        },
      }).catch(() => {})

      return NextResponse.json({ success: true, message: `Credentials sent to ${employee.email}` })
    } else {
      return NextResponse.json({
        success: false,
        error: 'SMTP is not configured or disabled. Go to Settings → SMTP to enable email sending.',
      }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/employees/[id]/send-credentials error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
