import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

const LEAVE_TYPES = ['CASUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'UNPAID', 'COMPENSATORY', 'WFH'] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: params.employeeId, year },
      orderBy: { leaveType: 'asc' },
    })

    const allBalances = LEAVE_TYPES.map((lt) => {
      const existing = balances.find((b) => b.leaveType === lt)
      return existing || { id: null, employeeId: params.employeeId, leaveType: lt, year, entitled: 0, taken: 0, pending: 0, available: 0 }
    })

    const totalEntitled = allBalances.reduce((sum, b) => sum + b.entitled, 0)
    const totalTaken = allBalances.reduce((sum, b) => sum + b.taken, 0)
    const totalPending = allBalances.reduce((sum, b) => sum + b.pending, 0)
    const totalAvailable = allBalances.reduce((sum, b) => sum + b.available, 0)

    return NextResponse.json({
      success: true,
      data: {
        balances: allBalances,
        summary: { year, totalEntitled, totalTaken, totalPending, totalAvailable },
      },
    })
  } catch (error) {
    console.error('GET /api/leave/balance/[employeeId] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

const updateBalanceSchema = z.object({
  leaveType: z.enum(['CASUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'UNPAID', 'COMPENSATORY', 'WFH']),
  entitled: z.number().min(0).optional(),
  taken: z.number().min(0).optional(),
  available: z.number().min(0).optional(),
  year: z.number().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateBalanceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { leaveType, entitled, taken, available, year: requestYear } = parsed.data
    const year = requestYear || new Date().getFullYear()

    const employee = await prisma.employee.findUnique({
      where: { id: params.employeeId },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const existingBalance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: params.employeeId,
          leaveType,
          year,
        },
      },
    })

    const oldValues = existingBalance
      ? { entitled: existingBalance.entitled, taken: existingBalance.taken, available: existingBalance.available }
      : { entitled: 0, taken: 0, available: 0 }

    const updateData: any = {}
    if (entitled !== undefined) updateData.entitled = entitled
    if (taken !== undefined) updateData.taken = taken
    if (available !== undefined) updateData.available = available

    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveType_year: {
          employeeId: params.employeeId,
          leaveType,
          year,
        },
      },
      create: {
        employeeId: params.employeeId,
        leaveType,
        year,
        entitled: entitled ?? 0,
        taken: taken ?? 0,
        pending: 0,
        available: available ?? 0,
      },
      update: updateData,
    })

    const newValues = { entitled: balance.entitled, taken: balance.taken, available: balance.available }

    await prisma.auditLog.create({
      data: {
        userId: token.sub,
        employeeId: params.employeeId,
        module: 'LEAVE',
        action: 'UPDATE',
        description: `Updated leave balance for ${employee.employeeCode} - ${leaveType} (${year})`,
        oldValue: JSON.stringify({ leaveType, ...oldValues }),
        newValue: JSON.stringify({ leaveType, ...newValues }),
      },
    })

    return NextResponse.json({ success: true, data: balance })
  } catch (error) {
    console.error('PUT /api/leave/balance/[employeeId] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
