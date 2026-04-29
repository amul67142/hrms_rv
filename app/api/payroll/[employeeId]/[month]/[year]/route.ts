import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string; month: string; year: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole === 'EMPLOYEE' && sessionEmployeeId !== params.employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const month = parseInt(params.month)
    const year = parseInt(params.year)

    const payrollItem = await prisma.payrollItem.findUnique({
      where: { employeeId_month_year: { employeeId: params.employeeId, month, year } },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
            bankName: true,
            accountNumber: true,
            ifscCode: true,
            panNumber: true,
          },
        },
      },
    })

    if (!payrollItem) {
      return NextResponse.json({ success: false, error: 'Payroll item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: payrollItem })
  } catch (error) {
    console.error('GET /api/payroll/[employeeId]/[month]/[year] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

const overrideSchema = z.object({
  basicSalary: z.number().optional(),
  hra: z.number().optional(),
  conveyanceAllowance: z.number().optional(),
  medicalAllowance: z.number().optional(),
  specialAllowance: z.number().optional(),
  otherAllowance: z.number().optional(),
  pfDeduction: z.number().optional(),
  esiDeduction: z.number().optional(),
  professionalTax: z.number().optional(),
  otherDeduction: z.number().optional(),
  paidDays: z.number().optional(),
  reason: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { employeeId: string; month: string; year: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const month = parseInt(params.month)
    const year = parseInt(params.year)

    const existing = await prisma.payrollItem.findUnique({
      where: { employeeId_month_year: { employeeId: params.employeeId, month, year } },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Payroll item not found' }, { status: 404 })
    }

    if (existing.status === 'LOCKED' || existing.status === 'PAID') {
      return NextResponse.json({ success: false, error: 'Cannot modify locked or paid payroll' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = overrideSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const overrides = (existing.overrides as unknown as Record<string, any>[]) || []

    overrides.push({
      ...data,
      reason: data.reason,
      overriddenBy: token?.sub,
      overriddenAt: new Date().toISOString(),
    })

    const basicSalary = data.basicSalary ?? existing.basicSalary
    const hra = data.hra ?? existing.hra
    const conveyanceAllowance = data.conveyanceAllowance ?? existing.conveyanceAllowance
    const medicalAllowance = data.medicalAllowance ?? existing.medicalAllowance
    const specialAllowance = data.specialAllowance ?? existing.specialAllowance
    const otherAllowance = data.otherAllowance ?? existing.otherAllowance
    const grossSalary = basicSalary + hra + conveyanceAllowance + medicalAllowance + specialAllowance + otherAllowance

    const pfDeduction = data.pfDeduction ?? existing.pfDeduction
    const esiDeduction = data.esiDeduction ?? existing.esiDeduction
    const professionalTax = data.professionalTax ?? existing.professionalTax
    const otherDeduction = data.otherDeduction ?? existing.otherDeduction
    const totalDeduction = pfDeduction + esiDeduction + professionalTax + otherDeduction
    const netSalary = Math.max(0, grossSalary - totalDeduction)

    const updated = await prisma.payrollItem.update({
      where: { id: existing.id },
      data: {
        basicSalary,
        hra,
        conveyanceAllowance,
        medicalAllowance,
        specialAllowance,
        otherAllowance,
        grossSalary,
        pfDeduction,
        esiDeduction,
        professionalTax,
        otherDeduction,
        totalDeduction,
        netSalary,
        paidDays: data.paidDays ?? existing.paidDays,
        overrides: overrides as any,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId: params.employeeId,
        module: 'PAYROLL',
        action: 'UPDATE',
        description: `Overrode payroll for ${params.employeeId} - ${month}/${year}`,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify({ overrides: data }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PUT /api/payroll/[employeeId]/[month]/[year] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
