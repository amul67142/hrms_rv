import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [totalActive, attendanceToday] = await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.attendance.findMany({
        where: { date: { gte: today, lt: tomorrow } },
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
      }),
    ])

    const attendedIds = new Set(attendanceToday.map((a) => a.employeeId))

    const present = attendanceToday.filter((a) => a.status === 'PRESENT').length
    const absent = attendanceToday.filter((a) => a.status === 'ABSENT').length
    const halfDay = attendanceToday.filter((a) => a.status === 'HALF_DAY').length
    const weekOff = attendanceToday.filter((a) => a.status === 'WEEK_OFF').length
    const holiday = attendanceToday.filter((a) => a.status === 'HOLIDAY').length
    const leave = attendanceToday.filter((a) => a.status === 'LEAVE').length

    const notMarked = totalActive - attendanceToday.length

    return NextResponse.json({
      success: true,
      data: {
        date: today.toISOString().split('T')[0],
        totalActive,
        present,
        absent,
        halfDay,
        weekOff,
        holiday,
        leave,
        notMarked,
        details: attendanceToday,
      },
    })
  } catch (error) {
    console.error('GET /api/attendance/today error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
