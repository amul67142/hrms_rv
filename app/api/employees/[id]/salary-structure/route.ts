import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

const salaryStructureSchema = z.object({
  effectiveFrom: z.string().or(z.date()),
  effectiveTo: z.string().or(z.date()).optional(),
  basicSalary: z.number().min(0),
  hra: z.number().min(0).default(0),
  conveyanceAllowance: z.number().min(0).default(0),
  medicalAllowance: z.number().min(0).default(0),
  specialAllowance: z.number().min(0).default(0),
  otherAllowance: z.number().min(0).default(0),
  pfDeduction: z.number().min(0).default(0),
  esiDeduction: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(0),
  otherDeduction: z.number().min(0).default(0),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getToken({ req: request })

    const structures = await prisma.salaryStructure.findMany({
      where: { employeeId: params.id },
      orderBy: [{ isActive: 'desc' }, { effectiveFrom: 'desc' }],
    })

    return NextResponse.json({ success: true, data: structures })
  } catch (error) {
    console.error('GET /api/employees/[id]/salary-structure error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const employee = await prisma.employee.findUnique({ where: { id: params.id } })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = salaryStructureSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      await tx.salaryStructure.updateMany({
        where: { employeeId: params.id, isActive: true },
        data: { isActive: false, effectiveTo: new Date(data.effectiveFrom) },
      })

      const structure = await tx.salaryStructure.create({
        data: {
          employeeId: params.id,
          effectiveFrom: new Date(data.effectiveFrom),
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
          basicSalary: data.basicSalary,
          hra: data.hra,
          conveyanceAllowance: data.conveyanceAllowance,
          medicalAllowance: data.medicalAllowance,
          specialAllowance: data.specialAllowance,
          otherAllowance: data.otherAllowance,
          pfDeduction: data.pfDeduction,
          esiDeduction: data.esiDeduction,
          professionalTax: data.professionalTax,
          otherDeduction: data.otherDeduction,
          isActive: true,
        },
      })

      return structure
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId: params.id,
        module: 'EMPLOYEE',
        action: 'CREATE',
        description: `Created new salary structure for employee ${employee.employeeCode}`,
        newValue: JSON.stringify(data),
      },
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/employees/[id]/salary-structure error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
