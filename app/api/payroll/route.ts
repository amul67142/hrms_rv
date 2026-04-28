import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const month = searchParams.get('month') || ''
    const year = searchParams.get('year') || ''
    const status = searchParams.get('status') || ''
    const employeeId = searchParams.get('employeeId') || ''

    const where: any = {}
    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)
    if (status) where.status = status
    if (employeeId) where.employeeId = employeeId

    const [total, data] = await Promise.all([
      prisma.payrollItem.count({ where }),
      prisma.payrollItem.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
              bankName: true,
              accountNumber: true,
              ifscCode: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
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
    console.error('GET /api/payroll error:', error)
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
    const { employeeId, month, year } = body

    if (!employeeId || month === undefined || !year) {
      return NextResponse.json({ success: false, error: 'employeeId, month, and year are required' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        salaryStructures: { where: { isActive: true }, orderBy: { effectiveFrom: 'desc' }, take: 1 },
      },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const salaryStructure = employee.salaryStructures[0]

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)

    const attendance = await prisma.attendance.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
    })

    const holidays = await prisma.holiday.findMany({
      where: { year },
      select: { date: true },
    })

    let present = 0
    let absent = 0
    let halfDay = 0
    let weekOff = 0
    let holiday = 0

    attendance.forEach((a) => {
      switch (a.status) {
        case 'PRESENT': present++; break
        case 'ABSENT': absent++; break
        case 'HALF_DAY': halfDay++; break
        case 'WEEK_OFF': weekOff++; break
        case 'HOLIDAY': holiday++; break
      }
    })

    const totalDays = end.getDate()
    const paidDays = present + (halfDay * 0.5) + weekOff + holiday

    const basicSalary = salaryStructure?.basicSalary || 0
    const hra = salaryStructure?.hra || 0
    const conveyance = salaryStructure?.conveyanceAllowance || 0
    const medical = salaryStructure?.medicalAllowance || 0
    const special = salaryStructure?.specialAllowance || 0
    const otherAllowance = salaryStructure?.otherAllowance || 0
    const grossSalary = basicSalary + hra + conveyance + medical + special + otherAllowance

    const pfDeduction = salaryStructure?.pfDeduction || Math.round(basicSalary * 0.12 * 100) / 100
    const esiDeduction = salaryStructure?.esiDeduction || Math.round(grossSalary * 0.0075 * 100) / 100
    const professionalTax = salaryStructure?.professionalTax || 200
    const otherDeduction = salaryStructure?.otherDeduction || 0

    const totalDeduction = pfDeduction + esiDeduction + professionalTax + otherDeduction
    const netSalary = Math.max(0, grossSalary - totalDeduction)

    const existing = await prisma.payrollItem.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } },
    })

    let payrollItem
    if (existing) {
      payrollItem = await prisma.payrollItem.update({
        where: { id: existing.id },
        data: {
          basicSalary,
          hra,
          conveyanceAllowance: conveyance,
          medicalAllowance: medical,
          specialAllowance: special,
          otherAllowance,
          grossSalary,
          pfDeduction,
          esiDeduction,
          professionalTax,
          otherDeduction,
          totalDeduction,
          netSalary,
          paidDays,
          status: 'CALCULATED',
        },
      })
    } else {
      payrollItem = await prisma.payrollItem.create({
        data: {
          employeeId,
          month,
          year,
          basicSalary,
          hra,
          conveyanceAllowance: conveyance,
          medicalAllowance: medical,
          specialAllowance: special,
          otherAllowance,
          grossSalary,
          pfDeduction,
          esiDeduction,
          professionalTax,
          otherDeduction,
          totalDeduction,
          netSalary,
          paidDays,
          status: 'CALCULATED',
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId,
        module: 'PAYROLL',
        action: 'CREATE',
        description: `Generated payroll for ${employee.employeeCode} - ${month}/${year}`,
        newValue: JSON.stringify({ payrollItemId: payrollItem.id, netSalary }),
      },
    })

    return NextResponse.json({ success: true, data: payrollItem })
  } catch (error) {
    console.error('POST /api/payroll error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
