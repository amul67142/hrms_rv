import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)

    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    const holidays = await prisma.holiday.findMany({
      where: { year },
    })

    const calendarData = approvedLeaves.map((lr) => ({
      id: lr.id,
      employeeId: lr.employeeId,
      employeeCode: lr.employee.employeeCode,
      employeeName: `${lr.employee.firstName} ${lr.employee.lastName}`,
      department: lr.employee.department,
      leaveType: lr.leaveType,
      startDate: lr.startDate.toISOString().split('T')[0],
      endDate: lr.endDate.toISOString().split('T')[0],
      totalDays: lr.totalDays,
    }))

    const holidaysData = holidays.map((h) => ({
      date: h.date.toISOString().split('T')[0],
      name: h.name,
      description: h.description,
    }))

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        leaves: calendarData,
        holidays: holidaysData,
      },
    })
  } catch (error) {
    console.error('GET /api/leave/calendar error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
