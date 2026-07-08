import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const [
      totalEmployees,
      activeEmployees,
      pendingLeaveRequests,
      totalDepartments,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.employee.groupBy({
        by: ['department'],
        _count: { department: true },
      }),
    ])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const attendanceToday = await prisma.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      select: { status: true },
    })

    const presentToday = attendanceToday.filter((a) => a.status === 'PRESENT').length
    const absentToday = attendanceToday.filter((a) => a.status === 'ABSENT').length

    const latestPayroll = await prisma.payrollItem.findFirst({
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: { month: true, year: true },
    })

    const employeesByDepartment = totalDepartments.map((d) => ({
      department: d.department,
      count: d._count.department,
    }))

    const weekStartDate = startOfDay(subDays(new Date(), 6))
    const weekEndDate = endOfDay(new Date())
    
    const weekAttendance = await prisma.attendance.findMany({
      where: { date: { gte: weekStartDate, lte: weekEndDate } },
      select: { date: true, status: true },
    })

    const attendanceTrend: { date: string; present: number; absent: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date).getTime()
      const dayEnd = endOfDay(date).getTime()

      const dayAttendance = weekAttendance.filter((a) => {
        const time = a.date.getTime()
        return time >= dayStart && time <= dayEnd
      })

      attendanceTrend.push({
        date: format(date, 'dd MMM'),
        present: dayAttendance.filter((a) => a.status === 'PRESENT').length,
        absent: dayAttendance.filter((a) => a.status === 'ABSENT').length,
      })
    }

    const recentLeaveRequests = await prisma.leaveRequest.findMany({
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
    })

    return NextResponse.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        presentToday,
        absentToday,
        pendingLeaveRequests,
        totalDepartments: totalDepartments.length,
        latestPayrollMonth: latestPayroll
          ? { month: latestPayroll.month, year: latestPayroll.year }
          : null,
        employeesByDepartment,
        attendanceTrend,
        recentLeaveRequests,
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
