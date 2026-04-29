import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

const markAttendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'WEEK_OFF', 'HOLIDAY', 'LEAVE']),
  inTime: z.string().optional(),
  outTime: z.string().optional(),
  hoursWorked: z.number().optional(),
  remarks: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    // EMPLOYEE role always sees only their own attendance
    const employeeId = userRole === 'EMPLOYEE'
      ? sessionEmployeeId
      : (searchParams.get('employeeId') || '')
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const month = searchParams.get('month') || ''
    const year = searchParams.get('year') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}

    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status

    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) }
    } else if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      const start = new Date(yearNum, monthNum - 1, 1)
      const end = new Date(yearNum, monthNum, 0)
      where.date = { gte: start, lte: end }
    }

    const [total, data] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
              designation: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/attendance error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = markAttendanceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const attendanceDate = new Date(data.date)

    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: attendanceDate,
        },
      },
      update: {
        status: data.status,
        inTime: data.inTime,
        outTime: data.outTime,
        hoursWorked: data.hoursWorked,
        remarks: data.remarks,
      },
      create: {
        employeeId: data.employeeId,
        date: attendanceDate,
        status: data.status,
        inTime: data.inTime,
        outTime: data.outTime,
        hoursWorked: data.hoursWorked,
        remarks: data.remarks,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId: data.employeeId,
        module: 'ATTENDANCE',
        action: 'CREATE',
        description: `Marked attendance for ${employee.employeeCode} on ${data.date} as ${data.status}`,
      },
    })

    return NextResponse.json({ success: true, data: attendance })
  } catch (error) {
    console.error('POST /api/attendance error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
