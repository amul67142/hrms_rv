import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

const createRegularizationSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  type: z.enum(['LATE_ARRIVAL', 'MISSED_PUNCH_IN', 'MISSED_PUNCH_OUT', 'OTHER']),
  reason: z.string().min(1),
  deductions: z.number().optional(),
})

const updateRegularizationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  managerRemarks: z.string().optional(),
  deductions: z.number().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const employeeId = searchParams.get('employeeId') || ''
    const status = searchParams.get('status') || ''

    const where: any = {}
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status

    const [total, data] = await Promise.all([
      prisma.attendanceRegularization.count({ where }),
      prisma.attendanceRegularization.findMany({
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
        orderBy: { createdAt: 'desc' },
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
    console.error('GET /api/attendance/regularization error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    const body = await request.json()
    const parsed = createRegularizationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const employeeId = data.employeeId || sessionEmployeeId

    if (userRole === 'EMPLOYEE' && sessionEmployeeId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const regularizationDate = new Date(data.date)

    const regularization = await prisma.attendanceRegularization.create({
      data: {
        employeeId,
        date: regularizationDate,
        type: data.type,
        reason: data.reason,
        deductions: data.deductions ?? 0,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId,
        module: 'ATTENDANCE',
        action: 'CREATE',
        description: `Created attendance regularization for ${employee.employeeCode} on ${data.date} - ${data.type}: ${data.reason}`,
      },
    })

    return NextResponse.json({ success: true, data: regularization })
  } catch (error) {
    console.error('POST /api/attendance/regularization error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const userId = token?.sub as string

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateRegularizationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const { searchParams } = new URL(request.url)
    const regularizationId = searchParams.get('id')

    if (!regularizationId) {
      return NextResponse.json({ success: false, error: 'Regularization ID is required' }, { status: 400 })
    }

    const existing = await prisma.attendanceRegularization.findUnique({
      where: { id: regularizationId },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Regularization not found' }, { status: 404 })
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Only pending regularizations can be updated' }, { status: 400 })
    }

    const updated = await prisma.attendanceRegularization.update({
      where: { id: regularizationId },
      data: {
        status: data.status,
        approvedBy: userId,
        approvedAt: new Date(),
        managerRemarks: data.managerRemarks,
        deductions: data.deductions ?? existing.deductions,
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
    })

    await prisma.auditLog.create({
      data: {
        userId,
        employeeId: existing.employeeId,
        module: 'ATTENDANCE',
        action: data.status === 'APPROVED' ? 'APPROVE' : 'REJECT',
        description: `${data.status} attendance regularization for ${updated.employee?.employeeCode} on ${existing.date.toISOString().split('T')[0]}`,
        newValue: JSON.stringify({ status: data.status, managerRemarks: data.managerRemarks, deductions: data.deductions }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/attendance/regularization error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
