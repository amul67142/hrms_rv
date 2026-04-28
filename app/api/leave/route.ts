import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'
import { differenceInCalendarDays } from 'date-fns'
import { calculateLeaveDays } from '@/lib/services/leave-utils'

const createLeaveSchema = z.object({
  employeeId: z.string().optional(),
  leaveType: z.enum(['CASUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'UNPAID', 'COMPENSATORY', 'WFH']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    // EMPLOYEE role always sees only their own leave requests
    const employeeId = userRole === 'EMPLOYEE'
      ? sessionEmployeeId
      : (searchParams.get('employeeId') || '')
    const status = searchParams.get('status') || ''
    const leaveType = searchParams.get('leaveType') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const where: any = {}

    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status
    if (leaveType) where.leaveType = leaveType
    if (startDate && endDate) {
      where.OR = [
        {
          startDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        {
          endDate: { gte: new Date(startDate), lte: new Date(endDate) },
        },
        {
          startDate: { lte: new Date(startDate) },
          endDate: { gte: new Date(endDate) },
        },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.leaveRequest.count({ where }),
      prisma.leaveRequest.findMany({
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
              user: { select: { email: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
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
    console.error('GET /api/leave error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    const body = await request.json()
    const parsed = createLeaveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const employeeId = data.employeeId || sessionEmployeeId

    if (userRole === 'EMPLOYEE' && sessionEmployeeId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    if (endDate < startDate) {
      return NextResponse.json({ success: false, error: 'End date cannot be before start date' }, { status: 400 })
    }

    // Fetch holidays for the leave period to exclude them from leave days calculation
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { date: true },
    })

    const holidayDates = holidays.map(h => h.date)
    const totalDays = calculateLeaveDays(startDate, endDate, true, holidayDates)

    if (totalDays === 0) {
      return NextResponse.json({ success: false, error: 'Leave request falls entirely on weekends or holidays' }, { status: 400 })
    }

    // Wrap in serializable transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.leaveRequest.findFirst({
        where: {
          employeeId,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            { startDate: { lte: endDate }, endDate: { gte: startDate } },
          ],
        },
      })

      if (overlapping) {
        throw new Error('Leave request overlaps with existing request')
      }

      if (data.leaveType !== 'UNPAID' && data.leaveType !== 'COMPENSATORY') {
        const year = startDate.getFullYear()
        const leaveBalance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveType_year: {
              employeeId,
              leaveType: data.leaveType as any,
              year,
            },
          },
        })

        if (!leaveBalance) {
          throw new Error('Leave balance not found. Please contact HR.')
        }

        const available = leaveBalance.available - leaveBalance.pending
        if (totalDays > available) {
          throw new Error(`Insufficient leave balance. Available: ${available}, Requested: ${totalDays}`)
        }

        await tx.leaveBalance.update({
          where: {
            employeeId_leaveType_year: {
              employeeId,
              leaveType: data.leaveType as any,
              year,
            },
          },
          data: { pending: { increment: totalDays } },
        })
      }

      const leaveRequest = await tx.leaveRequest.create({
        data: {
          employeeId,
          leaveType: data.leaveType as any,
          startDate,
          endDate,
          totalDays,
          reason: data.reason,
          status: 'PENDING',
        },
        include: {
          employee: {
            select: {
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      return leaveRequest
    }, {
      isolationLevel: 'Serializable',
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId,
        module: 'LEAVE',
        action: 'CREATE',
        description: `Created leave request for ${result.employee.employeeCode} - ${data.leaveType} for ${totalDays} days`,
        newValue: JSON.stringify({ leaveRequestId: result.id, leaveType: data.leaveType, totalDays }),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof Error && (
      error.message === 'Leave request overlaps with existing request' ||
      error.message.startsWith('Insufficient leave balance') ||
      error.message === 'Leave balance not found. Please contact HR.'
    )) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }
    console.error('POST /api/leave error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
