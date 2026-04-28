import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import * as XLSX from 'xlsx'
import type { Role } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || ''
    const year = searchParams.get('year') || ''
    const status = searchParams.get('status') || ''
    const department = searchParams.get('department') || ''
    const exportFormat = searchParams.get('export') || ''

    const where: any = {}

    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)
    if (status) where.status = status

    const payrollItems = await prisma.payrollItem.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
            panNumber: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    let filteredItems = payrollItems
    if (department) {
      filteredItems = payrollItems.filter((p) => p.employee.department === department)
    }

    const reportData = filteredItems.map((p) => ({
      'Employee Code': p.employee.employeeCode,
      'Employee Name': `${p.employee.firstName} ${p.employee.lastName}`,
      'Department': p.employee.department,
      'Designation': p.employee.designation,
      'PAN': p.employee.panNumber || 'N/A',
      'Month': `${p.month}/${p.year}`,
      'Basic Salary': p.basicSalary,
      'HRA': p.hra,
      'Conveyance': p.conveyanceAllowance,
      'Medical': p.medicalAllowance,
      'Special': p.specialAllowance,
      'Other Allowance': p.otherAllowance,
      'Gross Salary': p.grossSalary,
      'PF': p.pfDeduction,
      'ESI': p.esiDeduction,
      'PT': p.professionalTax,
      'Other Deduction': p.otherDeduction,
      'Total Deduction': p.totalDeduction,
      'Net Salary': p.netSalary,
      'Paid Days': p.paidDays,
      'Status': p.status,
    }))

    const totals = filteredItems.reduce(
      (acc, p) => {
        acc.grossSalary += p.grossSalary
        acc.netSalary += p.netSalary
        acc.totalDeduction += p.totalDeduction
        return acc
      },
      { grossSalary: 0, netSalary: 0, totalDeduction: 0 }
    )

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(reportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Payroll Report')
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="payroll_report_${month || 'all'}_${year || 'all'}.xlsx"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      summary: {
        totalEmployees: filteredItems.length,
        totalGrossSalary: totals.grossSalary,
        totalNetSalary: totals.netSalary,
        totalDeductions: totals.totalDeduction,
      },
    })
  } catch (error) {
    console.error('GET /api/reports/payroll error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
