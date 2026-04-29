import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { generateSalarySlipPDF } from '@/lib/services/pdf-generator'
import { formatDate } from '@/lib/core/utils'
import type { Role } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    const payrollItem = await prisma.payrollItem.findUnique({
      where: { id: params.id },
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

    if (userRole === 'EMPLOYEE' && sessionEmployeeId !== payrollItem.employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
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
      joiningDate: formatDate(payrollItem.employee.joiningDate, 'dd MMM yyyy'),
      panNumber: payrollItem.employee.panNumber || undefined,
      bankName: payrollItem.employee.bankName || undefined,
      accountNumber: payrollItem.employee.accountNumber || undefined,
      ifscCode: payrollItem.employee.ifscCode || undefined,
      month: payrollItem.month,
      year: payrollItem.year,
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
        'Content-Disposition': `attachment; filename="salary_slip_${payrollItem.employee.employeeCode}_${payrollItem.month}_${payrollItem.year}.pdf"`,
      },
    })
  } catch (error) {
    console.error('GET /api/salary-slips/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
