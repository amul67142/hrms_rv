import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { format } from 'date-fns'

export function getMonthName(month: number): string {
  const date = new Date(2000, month - 1, 1)
  return format(date, 'MMMM')
}

export interface EmployeePayrollData {
  employeeCode: string
  firstName: string
  lastName: string
  department: string
  designation: string
  panNumber?: string | null
  bankName?: string | null
  accountNumber?: string | null
  ifscCode?: string | null
  joiningDate: Date | string
  fatherName?: string
}

export interface SalarySlipTemplate {
  showWatermark?: boolean
  watermarkText?: string
  showCompanyLogo?: boolean
  headerText?: string
  footerText?: string
  signatoryName?: string
  signatoryDesignation?: string
  primaryColor?: string
  showDualSignatures?: boolean
  secondSignatoryName?: string
  secondSignatoryDesignation?: string
}

export interface SalarySlipData {
  companyName: string
  companyAddress: string
  companyLogoBase64?: string
  signatoryName: string
  signatoryDesignation: string
  footerText: string
  employeeCode: string
  employeeName: string
  fatherName: string
  designation: string
  department: string
  joiningDate: string
  panNumber?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  month: number
  year: number
  basicSalary: number
  hra: number
  conveyanceAllowance: number
  medical: number
  special: number
  otherAllowance: number
  bonus: number
  incentives: number
  totalEarnings: number
  pfDeduction: number
  esiDeduction: number
  professionalTax: number
  tdsDeduction: number
  unpaidLeaveDeduction: number
  otherDeduction: number
  totalDeductions: number
  grossSalary: number
  netSalary: number
  workingDays: number
  paidDays: number
  absentDays: number
  halfDays: number
  weekOffs: number
  holidays: number
  unpaidLeaveDays: number
  template?: SalarySlipTemplate
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { r: 0.545, g: 0.361, b: 0.965 } // default purple
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  }
}

function fmt(n: number): string {
  if (n === 0) return 'Rs. —'
  return (
    'Rs. ' +
    n.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function fmtOrDash(n: number): string {
  if (n === 0) return '—'
  return fmt(n)
}

export async function generateSalarySlipPDF(
  data: SalarySlipData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const { width, height } = page.getSize()

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const primaryHex = data.template?.primaryColor || '#8B5CF6'
  const primary = hexToRgb(primaryHex)

  const primaryColor = rgb(primary.r, primary.g, primary.b)
  const darkGray = rgb(0.2, 0.2, 0.2)
  const lightGray = rgb(0.95, 0.95, 0.95)
  const white = rgb(1, 1, 1)
  const green = rgb(0.1, 0.5, 0.1)
  const red = rgb(0.7, 0.1, 0.1)
  const midGray = rgb(0.5, 0.5, 0.5)

  let y = height - 30
  const leftMargin = 30
  const rightMargin = width - 30

  // --- Watermark ---
  if (data.template?.showWatermark && data.template?.watermarkText) {
    page.drawText(data.template.watermarkText, {
      x: width / 2 - 100,
      y: height / 2,
      size: 48,
      font: boldFont,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.08,
      rotate: degrees(-45),
    })
  }

  // --- Company Logo Placeholder ---
  if (data.template?.showCompanyLogo && data.companyLogoBase64) {
    try {
      const logoImage = await pdfDoc.embedPng(
        Buffer.from(data.companyLogoBase64, 'base64')
      )
      page.drawImage(logoImage, {
        x: leftMargin,
        y: y - 55,
        width: 50,
        height: 50,
      })
    } catch {
      // skip logo if invalid base64
    }
  }

  // --- Header ---
  page.drawRectangle({
    x: 0,
    y: y - 60,
    width,
    height: 70,
    color: primaryColor,
  })

  if (data.template?.headerText) {
    page.drawText(data.template.headerText, {
      x: leftMargin,
      y: y - 25,
      size: 14,
      font: boldFont,
      color: white,
    })
  } else {
    page.drawText(data.companyName.toUpperCase(), {
      x: leftMargin,
      y: y - 25,
      size: 20,
      font: boldFont,
      color: white,
    })
    page.drawText(data.companyAddress || '', {
      x: leftMargin,
      y: y - 45,
      size: 10,
      font: regularFont,
      color: white,
    })
  }

  y -= 80

  const monthName = format(new Date(data.year, data.month - 1), 'MMMM yyyy')
  page.drawText(`SALARY SLIP - ${monthName}`, {
    x: leftMargin,
    y,
    size: 16,
    font: boldFont,
    color: darkGray,
  })

  const slipNo = `SLIP-${data.employeeCode}-${data.month
    .toString()
    .padStart(2, '0')}${data.year}`
  page.drawText(`Slip No: ${slipNo}`, {
    x: rightMargin - 150,
    y,
    size: 9,
    font: regularFont,
    color: darkGray,
  })

  y -= 20
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 1,
    color: primaryColor,
  })
  y -= 15

  page.drawRectangle({
    x: leftMargin,
    y: y - 90,
    width: rightMargin - leftMargin,
    height: 90,
    color: lightGray,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.5,
  })

  const col1X = leftMargin + 10
  const col2X = leftMargin + 200
  const col3X = leftMargin + 400
  let dy = y - 15

  const drawField = (
    label: string,
    value: string,
    x: number,
    yPos: number
  ) => {
    page.drawText(label + ':', {
      x,
      y: yPos,
      size: 9,
      font: boldFont,
      color: darkGray,
    })
    page.drawText(value || '-', {
      x: x + 80,
      y: yPos,
      size: 9,
      font: regularFont,
      color: darkGray,
    })
  }

  drawField('Employee Code', data.employeeCode, col1X, dy)
  drawField('Employee Name', data.employeeName, col1X, dy - 15)
  drawField('Father Name', data.fatherName || '-', col1X, dy - 30)
  drawField('Designation', data.designation, col1X, dy - 45)
  drawField('Department', data.department, col1X, dy - 60)

  drawField('Joining Date', data.joiningDate, col2X, dy)
  drawField('PAN No', data.panNumber || '-', col2X, dy - 15)
  drawField('Bank Name', data.bankName || '-', col2X, dy - 30)
  drawField(
    'Account No',
    data.accountNumber ? '****' + data.accountNumber.slice(-4) : '-',
    col2X,
    dy - 45
  )

  drawField('Working Days', data.workingDays.toString(), col3X, dy)
  drawField('Paid Days', data.paidDays.toFixed(1), col3X, dy - 15)
  drawField('Absent Days', data.absentDays > 0 ? data.absentDays.toFixed(1) : '-', col3X, dy - 30)
  drawField('Unpaid Leave', data.unpaidLeaveDays > 0 ? data.unpaidLeaveDays.toFixed(1) : '-', col3X, dy - 45)

  y -= 110

  const tableWidth = (rightMargin - leftMargin) / 2 - 5
  const earningsSectionY = y - 15

  // --- Earnings Table ---
  page.drawRectangle({
    x: leftMargin,
    y: y - 195,
    width: tableWidth,
    height: 195,
    color: lightGray,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.5,
  })
  page.drawText('EARNINGS', {
    x: leftMargin + 5,
    y,
    size: 10,
    font: boldFont,
    color: green,
  })
  y -= 15

  const earningsRows: [string, number][] = ([
    ['Basic Salary', data.basicSalary],
    ['HRA', data.hra],
    ['Conveyance Allowance', data.conveyanceAllowance],
    ['Medical Allowance', data.medical],
    ['Special Allowance', data.special],
    ['Other Allowances', data.otherAllowance],
    ['Bonus', data.bonus],
    ['Incentives', data.incentives],
  ] as [string, number][]).filter(([, v]) => v > 0)

  for (const [label, value] of earningsRows) {
    page.drawText(label, {
      x: leftMargin + 5,
      y,
      size: 8.5,
      font: regularFont,
      color: darkGray,
    })
    page.drawText(fmt(value), {
      x: leftMargin + tableWidth - 85,
      y,
      size: 8.5,
      font: regularFont,
      color: darkGray,
    })
    y -= 12
  }

  y -= 3
  page.drawLine({
    start: { x: leftMargin + 5, y },
    end: { x: leftMargin + tableWidth - 5, y },
    thickness: 1,
    color: darkGray,
  })
  y -= 12
  page.drawText('GROSS EARNINGS', {
    x: leftMargin + 5,
    y,
    size: 9,
    font: boldFont,
    color: darkGray,
  })
  page.drawText(fmt(data.totalEarnings), {
    x: leftMargin + tableWidth - 85,
    y,
    size: 9,
    font: boldFont,
    color: green,
  })

  y = earningsSectionY
  y -= 15

  // --- Deductions Table ---
  page.drawRectangle({
    x: leftMargin + tableWidth + 10,
    y: y - 195,
    width: tableWidth,
    height: 195,
    color: lightGray,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 0.5,
  })
  page.drawText('DEDUCTIONS', {
    x: leftMargin + tableWidth + 15,
    y,
    size: 10,
    font: boldFont,
    color: red,
  })
  y -= 15

  const deductionRows: [string, number][] = ([
    ['Provident Fund (PF)', data.pfDeduction],
    ['ESI', data.esiDeduction],
    ['Professional Tax', data.professionalTax],
    ['TDS', data.tdsDeduction],
    ['Unpaid Leave Deduction', data.unpaidLeaveDeduction],
    ['Other Deductions', data.otherDeduction],
  ] as [string, number][]).filter(([, v]) => v > 0)

  for (const [label, value] of deductionRows) {
    page.drawText(label, {
      x: leftMargin + tableWidth + 15,
      y,
      size: 8.5,
      font: regularFont,
      color: darkGray,
    })
    page.drawText(fmtOrDash(value), {
      x: leftMargin + tableWidth * 2 + 10 - 85,
      y,
      size: 8.5,
      font: regularFont,
      color: darkGray,
    })
    y -= 12
  }

  y -= 3
  page.drawLine({
    start: { x: leftMargin + tableWidth + 15, y },
    end: { x: leftMargin + tableWidth * 2 + 10 - 5, y },
    thickness: 1,
    color: darkGray,
  })
  y -= 12
  page.drawText('TOTAL DEDUCTIONS', {
    x: leftMargin + tableWidth + 15,
    y,
    size: 9,
    font: boldFont,
    color: darkGray,
  })
  page.drawText(fmtOrDash(data.totalDeductions), {
    x: leftMargin + tableWidth * 2 + 10 - 85,
    y,
    size: 9,
    font: boldFont,
    color: red,
  })

  y = earningsSectionY - 210

  // --- Net Salary Bar ---
  page.drawRectangle({
    x: leftMargin,
    y: y - 30,
    width: rightMargin - leftMargin,
    height: 30,
    color: primaryColor,
  })
  page.drawText('NET SALARY', {
    x: leftMargin + 10,
    y: y - 20,
    size: 12,
    font: boldFont,
    color: white,
  })
  const netWords = numberToWords(Math.round(data.netSalary))
  page.drawText(`Rupees ${netWords} Only`, {
    x: leftMargin + 150,
    y: y - 20,
    size: 9,
    font: italicFont,
    color: white,
  })
  page.drawText(fmt(data.netSalary), {
    x: rightMargin - 100,
    y: y - 20,
    size: 14,
    font: boldFont,
    color: white,
  })

  y -= 45

  // --- Attendance Summary ---
  page.drawText('ATTENDANCE SUMMARY', {
    x: leftMargin,
    y,
    size: 10,
    font: boldFont,
    color: darkGray,
  })
  y -= 15
  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 12

  const attSummary: [string, string][] = [
    ['Working Days', data.workingDays.toString()],
    ['Present', data.paidDays.toFixed(1)],
    ['Absent', data.absentDays > 0 ? data.absentDays.toFixed(1) : '-'],
    ['Half Days', data.halfDays > 0 ? data.halfDays.toFixed(1) : '-'],
    ['Week Offs', data.weekOffs > 0 ? data.weekOffs.toFixed(1) : '-'],
    ['Holidays', data.holidays > 0 ? data.holidays.toFixed(1) : '-'],
    ['Unpaid Leave', data.unpaidLeaveDays > 0 ? data.unpaidLeaveDays.toFixed(1) : '-'],
  ]

  const attColWidth = (rightMargin - leftMargin) / 7
  for (let i = 0; i < attSummary.length; i++) {
    const [label, value] = attSummary[i]
    page.drawText(label, {
      x: leftMargin + i * attColWidth,
      y,
      size: 8,
      font: regularFont,
      color: darkGray,
    })
    page.drawText(value, {
      x: leftMargin + i * attColWidth,
      y: y - 12,
      size: 9,
      font: boldFont,
      color: darkGray,
    })
  }

  y -= 35

  page.drawLine({
    start: { x: leftMargin, y },
    end: { x: rightMargin, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 12
  page.drawText(
    'This is a computer-generated document. No signature is required.',
    {
      x: leftMargin,
      y,
      size: 7,
      font: italicFont,
      color: midGray,
    }
  )

  if (data.template?.footerText || data.footerText) {
    page.drawText(data.template?.footerText || data.footerText, {
      x: leftMargin,
      y: y - 10,
      size: 7,
      font: regularFont,
      color: midGray,
    })
  }

  // --- Signatory Block ---
  const showDual = data.template?.showDualSignatures
  const sig1Name = data.template?.signatoryName || data.signatoryName || ''
  const sig1Desig = data.template?.signatoryDesignation || data.signatoryDesignation || ''

  if (showDual && data.template?.secondSignatoryName) {
    // Dual signature: left and right
    const midX = (leftMargin + rightMargin) / 2

    page.drawText(`Authorised Signatory: ${sig1Name}`, {
      x: leftMargin,
      y: y - 25,
      size: 8,
      font: regularFont,
      color: darkGray,
    })
    page.drawText(sig1Desig, {
      x: leftMargin,
      y: y - 37,
      size: 7,
      font: italicFont,
      color: darkGray,
    })

    page.drawLine({
      start: { x: midX - 80, y: y - 10 },
      end: { x: midX + 80, y: y - 10 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    })

    page.drawText(`Authorised Signatory: ${data.template.secondSignatoryName}`, {
      x: midX + 10,
      y: y - 25,
      size: 8,
      font: regularFont,
      color: darkGray,
    })
    page.drawText(data.template.secondSignatoryDesignation || '', {
      x: midX + 10,
      y: y - 37,
      size: 7,
      font: italicFont,
      color: darkGray,
    })
  } else {
    // Single signature: right aligned
    page.drawText(`Authorised Signatory: ${sig1Name}`, {
      x: rightMargin - 200,
      y: y - 25,
      size: 8,
      font: regularFont,
      color: darkGray,
    })
    page.drawText(sig1Desig, {
      x: rightMargin - 200,
      y: y - 37,
      size: 7,
      font: italicFont,
      color: darkGray,
    })
  }

  // Page number at bottom
  page.drawText('Page 1', {
    x: rightMargin - 50,
    y: 15,
    size: 8,
    font: regularFont,
    color: midGray,
  })

  return await pdfDoc.save()
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero'
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ]
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ]

  if (num < 20) return ones[num]
  if (num < 100)
    return (
      tens[Math.floor(num / 10)] +
      (num % 10 ? ' ' + ones[num % 10] : '')
    )
  if (num < 1000)
    return (
      ones[Math.floor(num / 100)] +
      ' Hundred' +
      (num % 100 ? ' ' + numberToWords(num % 100) : '')
    )
  if (num < 100000)
    return (
      numberToWords(Math.floor(num / 1000)) +
      ' Thousand' +
      (num % 1000 ? ' ' + numberToWords(num % 1000) : '')
    )
  if (num < 10000000)
    return (
      numberToWords(Math.floor(num / 100000)) +
      ' Lakh' +
      (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
    )
  return (
    numberToWords(Math.floor(num / 10000000)) +
    ' Crore' +
    (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
  )
}
