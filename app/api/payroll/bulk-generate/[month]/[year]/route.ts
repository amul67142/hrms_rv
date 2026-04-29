import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { month: string; year: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const month = parseInt(params.month)
    const year = parseInt(params.year)

    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salaryStructures: { where: { isActive: true }, orderBy: { effectiveFrom: 'desc' }, take: 1 },
      },
    })

    if (activeEmployees.length === 0) {
      return NextResponse.json({ success: false, error: 'No active employees found' }, { status: 404 })
    }

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)

    const holidays = await prisma.holiday.findMany({
      where: { year },
      select: { date: true },
    })

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: { in: activeEmployees.map((e) => e.id) },
        date: { gte: start, lte: end },
      },
    })

    const attendanceByEmployee = new Map<string, typeof attendance>()
    attendance.forEach((a) => {
      const existing = attendanceByEmployee.get(a.employeeId) || []
      existing.push(a)
      attendanceByEmployee.set(a.employeeId, existing)
    })

    const results: { employeeCode: string; success: boolean; payrollItemId?: string; error?: string }[] = []

    for (const employee of activeEmployees) {
      try {
        const empAttendance = attendanceByEmployee.get(employee.id) || []
        const salaryStructure = employee.salaryStructures[0]

        let present = 0
        let halfDay = 0
        let weekOff = 0
        let holiday = 0

        empAttendance.forEach((a) => {
          switch (a.status) {
            case 'PRESENT': present++; break
            case 'HALF_DAY': halfDay++; break
            case 'WEEK_OFF': weekOff++; break
            case 'HOLIDAY': holiday++; break
          }
        })

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
          where: { employeeId_month_year: { employeeId: employee.id, month, year } },
        })

        let payrollItem
        if (existing) {
          payrollItem = await prisma.payrollItem.update({
            where: { id: existing.id },
            data: {
              basicSalary, hra, conveyanceAllowance: conveyance, medicalAllowance: medical,
              specialAllowance: special, otherAllowance, grossSalary, pfDeduction,
              esiDeduction, professionalTax, otherDeduction, totalDeduction, netSalary,
              paidDays, status: 'CALCULATED',
            },
          })
        } else {
          payrollItem = await prisma.payrollItem.create({
            data: {
              employeeId: employee.id, month, year, basicSalary, hra,
              conveyanceAllowance: conveyance, medicalAllowance: medical,
              specialAllowance: special, otherAllowance, grossSalary, pfDeduction,
              esiDeduction, professionalTax, otherDeduction, totalDeduction, netSalary,
              paidDays, status: 'CALCULATED',
            },
          })
        }

        results.push({ employeeCode: employee.employeeCode, success: true, payrollItemId: payrollItem.id })
      } catch (err: any) {
        results.push({ employeeCode: employee.employeeCode, success: false, error: err.message })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failedCount = results.filter((r) => !r.success).length

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'PAYROLL',
        action: 'CREATE',
        description: `Bulk generated payroll for ${month}/${year}: ${successCount} successful, ${failedCount} failed`,
      },
    })

    return NextResponse.json({
      success: true,
      data: { results },
      totalProcessed: activeEmployees.length,
      totalSuccessful: successCount,
      totalFailed: failedCount,
    })
  } catch (error) {
    console.error('POST /api/payroll/bulk-generate/[month]/[year] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
