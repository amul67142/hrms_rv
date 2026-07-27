import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'
import { cached, TTL } from '@/lib/core/cache'

export const dynamic = 'force-dynamic'

async function computeDashboard() {
  const today = startOfDay(new Date())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const weekStartDate = startOfDay(subDays(new Date(), 6))
  const weekEndDate = endOfDay(new Date())

  // Everything the DB can count, it counts — we no longer ship raw rows to
  // Node just to run `.filter().length` on them. All independent, so parallel.
  const [
    totalEmployees,
    activeEmployees,
    pendingLeaveRequests,
    employeesByDeptRaw,
    attendanceTodayByStatus,
    weekAttendanceByDay,
    latestPayroll,
    recentLeaveRequests,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.employee.groupBy({
      by: ['department'],
      _count: { department: true },
    }),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { date: { gte: today, lt: tomorrow } },
      _count: { status: true },
    }),
    prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: { date: { gte: weekStartDate, lte: weekEndDate } },
      _count: { _all: true },
    }),
    prisma.payrollItem.findFirst({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { month: true, year: true },
    }),
    prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 5,
    }),
  ])

  const countFor = (status: string) =>
    attendanceTodayByStatus.find((r) => r.status === status)?._count.status ?? 0
  const presentToday = countFor('PRESENT')
  const absentToday = countFor('ABSENT')

  const employeesByDepartment = employeesByDeptRaw.map((d) => ({
    department: d.department,
    count: d._count.department,
  }))

  // Bucket the pre-counted week rows by day. Far less data than before —
  // one row per (day, status) instead of one row per attendance record.
  const attendanceTrend: { date: string; present: number; absent: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i)
    const dayStart = startOfDay(date).getTime()
    const dayEnd = endOfDay(date).getTime()

    let present = 0
    let absent = 0
    for (const row of weekAttendanceByDay) {
      const t = row.date.getTime()
      if (t >= dayStart && t <= dayEnd) {
        if (row.status === 'PRESENT') present += row._count._all
        else if (row.status === 'ABSENT') absent += row._count._all
      }
    }
    attendanceTrend.push({ date: format(date, 'dd MMM'), present, absent })
  }

  return {
    totalEmployees,
    activeEmployees,
    presentToday,
    absentToday,
    pendingLeaveRequests,
    totalDepartments: employeesByDeptRaw.length,
    latestPayrollMonth: latestPayroll
      ? { month: latestPayroll.month, year: latestPayroll.year }
      : null,
    employeesByDepartment,
    attendanceTrend,
    recentLeaveRequests,
  }
}

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Admins hitting the dashboard repeatedly share a 15s-cached snapshot
    // instead of firing ~8 cross-continent queries every single load.
    const data = await cached('dashboard:summary', TTL.short, computeDashboard)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
