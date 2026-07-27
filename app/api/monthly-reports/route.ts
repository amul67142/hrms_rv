import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const userRole = token.role
    const employeeId = token.employeeId

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
    const status = searchParams.get('status') || undefined

    const where: Record<string, unknown> = {}

    // Employees can only see their own reports
    if (userRole === 'EMPLOYEE') {
      where.employeeId = employeeId as string
    }

    if (month) where.month = month
    if (year) where.year = year
    if (status) where.status = status

    const reports = await prisma.monthlyReport.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { submittedAt: 'desc' }],
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: reports })
  } catch (error) {
    console.error('GET /api/monthly-reports error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const employeeId = token?.employeeId
    if (!employeeId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { month, year, title, content, highlights, challenges, nextMonthPlan } = body

    if (!month || !year || !title || !content) {
      return NextResponse.json({ success: false, error: 'Month, year, title, and content are required' }, { status: 400 })
    }

    // Check submission window: only 1st to 3rd of the month
    const now = new Date()
    const currentDay = now.getDate()

    // Report is for the PREVIOUS month
    const reportMonth = month as number
    const reportYear = year as number

    // Validate that the report is for the previous month
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    let expectedReportMonth = currentMonth - 1
    let expectedReportYear = currentYear
    if (expectedReportMonth === 0) {
      expectedReportMonth = 12
      expectedReportYear = currentYear - 1
    }

    if (reportMonth !== expectedReportMonth || reportYear !== expectedReportYear) {
      return NextResponse.json({
        success: false,
        error: `You can only submit reports for ${getMonthName(expectedReportMonth)} ${expectedReportYear}`,
      }, { status: 400 })
    }

    // Check if within submission window (1st to 3rd)
    if (currentDay > 3) {
      return NextResponse.json({
        success: false,
        error: 'Report submission window has closed. Reports can only be submitted between 1st and 3rd of each month.',
      }, { status: 400 })
    }

    // Check if already submitted
    const existing = await prisma.monthlyReport.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: employeeId as string,
          month: reportMonth,
          year: reportYear,
        },
      },
    })

    if (existing) {
      // Update existing report
      const updated = await prisma.monthlyReport.update({
        where: { id: existing.id },
        data: {
          title,
          content,
          highlights: highlights || null,
          challenges: challenges || null,
          nextMonthPlan: nextMonthPlan || null,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, data: updated, message: 'Report updated successfully' })
    }

    const report = await prisma.monthlyReport.create({
      data: {
        employeeId: employeeId as string,
        month: reportMonth,
        year: reportYear,
        title,
        content,
        highlights: highlights || null,
        challenges: challenges || null,
        nextMonthPlan: nextMonthPlan || null,
      },
    })

    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    console.error('POST /api/monthly-reports error:', error)
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
