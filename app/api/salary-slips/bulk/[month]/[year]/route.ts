import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { generateSalarySlipPDF } from '@/lib/services/pdf-generator'
import { rgb } from 'pdf-lib'
import type { Role } from '@/types'

export async function GET(
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

    const payrollItems = await prisma.payrollItem.findMany({
      where: { month, year },
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

    if (payrollItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No payroll items found' }, { status: 404 })
    }

    const companySettings = await prisma.companySetting.findFirst()

    const { PDFDocument, StandardFonts } = await import('pdf-lib')
    const combinedPdf = await PDFDocument.create()
    const regularFont = await combinedPdf.embedFont(StandardFonts.Helvetica)

    for (let i = 0; i < payrollItems.length; i++) {
      const item = payrollItems[i]

      const slipData = {
        companyName: companySettings?.companyName || 'Company Name',
        companyAddress: companySettings?.companyAddress || '',
        companyLogoBase64: undefined,
        signatoryName: companySettings?.salarySlipSignatoryName || '',
        signatoryDesignation: companySettings?.salarySlipSignatoryDesig || '',
        footerText: companySettings?.footerText || '',
        employeeCode: item.employee.employeeCode,
        employeeName: `${item.employee.firstName} ${item.employee.lastName}`,
        fatherName: '',
        designation: item.employee.designation,
        department: item.employee.department,
        joiningDate: item.employee.joiningDate.toString(),
        panNumber: item.employee.panNumber || undefined,
        bankName: item.employee.bankName || undefined,
        accountNumber: item.employee.accountNumber || undefined,
        ifscCode: item.employee.ifscCode || undefined,
        month,
        year,
        basicSalary: Number(item.basicSalary),
        hra: Number(item.hra),
        conveyanceAllowance: Number(item.conveyanceAllowance),
        medical: Number(item.medicalAllowance),
        special: Number(item.specialAllowance),
        otherAllowance: Number(item.otherAllowance),
        bonus: Number(item.bonus),
        incentives: Number(item.incentives),
        totalEarnings: Number(item.grossSalary),
        pfDeduction: Number(item.pfDeduction),
        esiDeduction: Number(item.esiDeduction),
        professionalTax: Number(item.professionalTax),
        tdsDeduction: Number(item.tdsDeduction),
        unpaidLeaveDeduction: Number(item.unpaidLeaveDeduction),
        otherDeduction: Number(item.otherDeduction),
        totalDeductions: Number(item.totalDeduction),
        grossSalary: Number(item.grossSalary),
        netSalary: Number(item.netSalary),
        workingDays: item.paidDays,
        paidDays: item.paidDays,
        absentDays: 0,
        halfDays: 0,
        weekOffs: 0,
        holidays: 0,
        unpaidLeaveDays: 0,
      }

      const singlePdfBytes = await generateSalarySlipPDF(slipData)
      const singlePdfDoc = await PDFDocument.load(singlePdfBytes)
      const [page] = await combinedPdf.copyPages(singlePdfDoc, [0])
      combinedPdf.addPage(page)
    }

    const totalPages = payrollItems.length
    for (let i = 0; i < totalPages; i++) {
      const page = combinedPdf.getPage(i)
      const { width } = page.getSize()
      page.drawText(`Page ${i + 1} of ${totalPages}`, {
        x: width - 80,
        y: 15,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    const pdfBytes = await combinedPdf.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="salary_slips_${month}_${year}.pdf"`,
      },
    })
  } catch (error) {
    console.error('GET /api/salary-slips/bulk/[month]/[year] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
