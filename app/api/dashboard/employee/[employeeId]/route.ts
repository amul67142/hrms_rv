import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    if (userRole === 'EMPLOYEE' && sessionEmployeeId !== params.employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.employeeId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const currentYear = new Date().getFullYear()

    const [leaveBalance, recentAttendance, recentLeaveRequests, salarySlips] = await Promise.all([
      prisma.leaveBalance.findMany({
        where: { employeeId: params.employeeId, year: currentYear },
      }),
      prisma.attendance.findMany({
        where: { employeeId: params.employeeId },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      prisma.leaveRequest.findMany({
        where: { employeeId: params.employeeId },
        orderBy: { appliedAt: 'desc' },
        take: 5,
      }),
      prisma.payrollItem.findMany({
        where: { employeeId: params.employeeId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 6,
      }),
    ])

    const monthStart = startOfMonth(new Date())
    const monthEnd = endOfMonth(new Date())

    const monthAttendance = await prisma.attendance.findMany({
      where: {
        employeeId: params.employeeId,
        date: { gte: monthStart, lte: monthEnd },
      },
    })

    const presentThisMonth = monthAttendance.filter((a) => a.status === 'PRESENT').length
    const absentThisMonth = monthAttendance.filter((a) => a.status === 'ABSENT').length

    return NextResponse.json({
      success: true,
      data: {
        employee,
        leaveBalance,
        recentAttendance,
        recentLeaveRequests,
        salarySlips,
        monthSummary: {
          present: presentThisMonth,
          absent: absentThisMonth,
          total: monthEnd.getDate(),
        },
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard/employee/[employeeId] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
