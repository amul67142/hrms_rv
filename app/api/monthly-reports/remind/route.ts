import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { sendMail, generateEmailTemplate } from '@/lib/services/mail'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Report is for the previous month
    let reportMonth = currentMonth - 1
    let reportYear = currentYear
    if (reportMonth === 0) {
      reportMonth = 12
      reportYear = currentYear - 1
    }

    const monthName = getMonthName(reportMonth)

    // Find employees who haven't submitted yet
    const existingReports = await prisma.monthlyReport.findMany({
      where: { month: reportMonth, year: reportYear },
      select: { employeeId: true },
    })
    const submittedIds = new Set(existingReports.map((r) => r.employeeId))

    const pendingEmployees = employees.filter((e) => !submittedIds.has(e.id))

    if (pendingEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All employees have already submitted their reports!',
        sent: 0,
      })
    }

    // Send emails
    let sent = 0
    for (const emp of pendingEmployees) {
      const content = `
        <h2 style="color:#FFFFFF;margin-bottom:20px;">Monthly Report Reminder</h2>
        <p style="color:#9CA3AF;margin-bottom:8px;">Dear ${emp.firstName} ${emp.lastName},</p>
        <p style="color:#9CA3AF;">This is a reminder to submit your <strong style="color:#8B5CF6;">${monthName} ${reportYear}</strong> monthly report.</p>
        <div style="background:#262626;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="color:#FFFFFF;margin:0 0 8px;font-weight:600;">⏰ Submission Deadline</p>
          <p style="color:#9CA3AF;margin:0;">Reports must be submitted between <strong style="color:#F59E0B;">1st and 3rd</strong> of each month.</p>
        </div>
        <div style="background:#262626;border-radius:12px;padding:20px;margin:20px 0;">
          <p style="color:#FFFFFF;margin:0 0 8px;font-weight:600;">📝 What to include</p>
          <ul style="color:#9CA3AF;margin:0;padding-left:20px;">
            <li>Work summary and key accomplishments</li>
            <li>Key highlights and achievements</li>
            <li>Challenges faced</li>
            <li>Plan for next month</li>
          </ul>
        </div>
        <a href="${process.env.APP_URL || 'https://emp.realvibe.in'}/employee/monthly-reports" style="display:inline-block;background:#8B5CF6;color:#FFFFFF;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;margin:16px 0;">Submit Report Now</a>
        <p style="color:#9CA3AF;font-size:13px;">Please submit your report at the earliest to avoid delays.</p>
      `
      const success = await sendMail({
        to: emp.email,
        subject: `Action Required: Submit Your ${monthName} ${reportYear} Monthly Report`,
        html: generateEmailTemplate(content, 'Monthly Report Reminder'),
      })
      if (success) sent++
    }

    return NextResponse.json({
      success: true,
      message: `Reminders sent to ${sent} of ${pendingEmployees.length} employees who haven't submitted their reports.`,
      sent,
      total: pendingEmployees.length,
    })
  } catch (error) {
    console.error('POST /api/monthly-reports/remind error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return months[month - 1] || ''
}
