import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { generateSalarySlipPDF } from '@/lib/services/pdf-generator'
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
            panNumber: true,
            bankName: true,
            accountNumber: true,
            ifscCode: true,
            joiningDate: true,
          },
        },
      },
    })

    if (!payrollItem) {
      return NextResponse.json({ success: false, error: 'Payroll item not found' }, { status: 404 })
    }

    const companySettings = await prisma.companySetting.findFirst()

    const slipData = {
      companyName: companySettings?.companyName || 'Company Name',
      companyAddress: companySettings?.companyAddress || '',
      companyLogoBase64: undefined,
      signatoryName: companySettings?.salarySlipSignatoryName || '',
      signatoryDesignation: companySettings?.salarySlipSignatoryDesig || '',
      footerText: companySettings?.footerText || '',
      employeeCode: payrollItem.employee.employeeCode,
      employeeName: `${payrollItem.employee.firstName} ${payrollItem.employee.lastName}`,
      fatherName: '',
      designation: payrollItem.employee.designation,
      department: payrollItem.employee.department,
      joiningDate: payrollItem.employee.joiningDate.toString(),
      panNumber: payrollItem.employee.panNumber || undefined,
      bankName: payrollItem.employee.bankName || undefined,
      accountNumber: payrollItem.employee.accountNumber || undefined,
      ifscCode: payrollItem.employee.ifscCode || undefined,
      month,
      year,
      basicSalary: Number(payrollItem.basicSalary),
      hra: Number(payrollItem.hra),
      conveyanceAllowance: Number(payrollItem.conveyanceAllowance),
      medical: Number(payrollItem.medicalAllowance),
      special: Number(payrollItem.specialAllowance),
      otherAllowance: Number(payrollItem.otherAllowance),
      bonus: Number(payrollItem.bonus),
      incentives: Number(payrollItem.incentives),
      totalEarnings: Number(payrollItem.grossSalary),
      pfDeduction: Number(payrollItem.pfDeduction),
      esiDeduction: Number(payrollItem.esiDeduction),
      professionalTax: Number(payrollItem.professionalTax),
      tdsDeduction: Number(payrollItem.tdsDeduction),
      unpaidLeaveDeduction: Number(payrollItem.unpaidLeaveDeduction),
      otherDeduction: Number(payrollItem.otherDeduction),
      totalDeductions: Number(payrollItem.totalDeduction),
      grossSalary: Number(payrollItem.grossSalary),
      netSalary: Number(payrollItem.netSalary),
      workingDays: payrollItem.paidDays,
      paidDays: payrollItem.paidDays,
      absentDays: 0,
      halfDays: 0,
      weekOffs: 0,
      holidays: 0,
      unpaidLeaveDays: 0,
    }

    const pdfBytes = await generateSalarySlipPDF(slipData)

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="salary_slip_${payrollItem.employee.employeeCode}_${month}_${year}.pdf"`,
      },
    })
  } catch (error) {
    console.error('GET /api/salary-slips/employees/[employeeId]/[month]/[year] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
