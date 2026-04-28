import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { getMonthDateRange } from '@/lib/core/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string | undefined
    const sessionEmployeeId = token?.employeeId as string | undefined

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole === 'EMPLOYEE' && sessionEmployeeId !== params.employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const employee = await prisma.employee.findUnique({
      where: { id: params.employeeId },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: true,
        joiningDate: true,
      },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const { start, end } = getMonthDateRange(month, year)

    const holidays = await prisma.holiday.findMany({
      where: { year },
      select: { date: true },
    })

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: params.employeeId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    })

    const attendanceMap = new Map(
      attendance.map((a) => [a.date.toISOString().split('T')[0], a])
    )

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: params.employeeId,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
    })

    let present = 0
    let absent = 0
    let halfDay = 0
    let weekOff = 0
    let holiday = 0
    let leave = 0

    const days = attendance.length > 0 ? attendance : []
    let current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const isWeekendDay = current.getDay() === 0 || current.getDay() === 6
      const isHolidayDay = holidays.some((h) => h.date.toISOString().split('T')[0] === dateStr)

      if (isWeekendDay) {
        weekOff++
      } else if (isHolidayDay) {
        holiday++
      } else {
        const att = attendanceMap.get(dateStr)
        if (att) {
          switch (att.status) {
            case 'PRESENT': present++; break
            case 'ABSENT': absent++; break
            case 'HALF_DAY': halfDay++; break
            case 'LEAVE': leave++; break
          }
        } else if (current >= new Date(employee.joiningDate)) {
          absent++
        }
      }

      current.setDate(current.getDate() + 1)
    }

    const totalDays = end.getDate()
    const workingDays = totalDays - weekOff - holiday
    const paidDays = present + (halfDay * 0.5) + leave + weekOff + holiday

    const dayByDay = attendance.map((a) => ({
      date: a.date.toISOString().split('T')[0],
      status: a.status,
      inTime: a.inTime,
      outTime: a.outTime,
      hoursWorked: a.hoursWorked,
      remarks: a.remarks,
    }))

    return NextResponse.json({
      success: true,
      data: {
        employee,
        month,
        year,
        summary: {
          totalDays,
          workingDays,
          present,
          absent,
          halfDay,
          weekOff,
          holiday,
          leave,
          paidDays: Math.round(paidDays * 2) / 2,
        },
        dayByDay,
      },
    })
  } catch (error) {
    console.error('GET /api/attendance/monthly/[employeeId] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
