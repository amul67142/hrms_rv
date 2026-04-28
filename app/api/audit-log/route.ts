import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token?.role as Role
    const userEmployeeId = token?.employeeId as string | null

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const moduleFilter = searchParams.get('module') || ''
    const action = searchParams.get('action') || ''
    const userIdFilter = searchParams.get('userId') || ''
    const employeeId = searchParams.get('employeeId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const search = searchParams.get('search') || ''

    // Employees can only see their own audit logs
    if (userRole === 'EMPLOYEE') {
      if (!userEmployeeId) {
        return NextResponse.json({ success: false, error: 'No employee profile associated with this user' }, { status: 403 })
      }
    }

    const where: any = {}

    // Employees can only see their own audit logs - force employeeId filter
    if (userRole === 'EMPLOYEE') {
      where.employeeId = userEmployeeId
    } else {
      // Only allow employeeId filter for non-employees
      if (employeeId) {
        where.employeeId = employeeId
      }
    }

    if (moduleFilter) where.module = moduleFilter
    if (action) where.action = action
    if (userIdFilter) where.userId = userIdFilter

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { user: { email: { contains: search } } },
      ]
    }

    if (dateFrom && dateTo) {
      where.createdAt = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo + 'T23:59:59.999Z'),
      }
    } else if (dateFrom) {
      where.createdAt = { gte: new Date(dateFrom) }
    } else if (dateTo) {
      where.createdAt = { lte: new Date(dateTo + 'T23:59:59.999Z') }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { email: true } },
          employee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const data = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.user?.email ?? null,
      employeeId: log.employeeId,
      employeeName: log.employee
        ? `${log.employee.firstName} ${log.employee.lastName}`.trim()
        : null,
      module: log.module,
      action: log.action,
      description: log.description,
      oldValue: log.oldValue,
      newValue: log.newValue,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/audit-log error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
