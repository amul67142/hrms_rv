import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import * as XLSX from 'xlsx'
import type { Role } from '@/types'

// Prevent formula injection by prefixing dangerous characters with a single quote
function sanitizeForCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Check if starts with formula-like characters
  if (/^[=+\-@\t\r\n"]/.test(str)) {
    return `'${str}`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (!userRole || userRole === 'EMPLOYEE') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId') || ''
    const leaveType = searchParams.get('leaveType') || ''
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const exportFormat = searchParams.get('export') || ''

    const where: any = {}

    if (employeeId) where.employeeId = employeeId
    if (leaveType) where.leaveType = leaveType
    if (status) where.status = status
    if (startDate || endDate) {
      where.startDate = {}
      if (startDate) where.startDate.gte = new Date(startDate)
      if (endDate) where.startDate.lte = new Date(endDate)
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const reportData = leaveRequests.map((lr) => ({
      'Employee Code': sanitizeForCSV(lr.employee?.employeeCode || ''),
      'Employee Name': sanitizeForCSV(`${lr.employee?.firstName || ''} ${lr.employee?.lastName || ''}`),
      'Department': sanitizeForCSV(lr.employee?.department || ''),
      'Designation': sanitizeForCSV(lr.employee?.designation || ''),
      'Leave Type': sanitizeForCSV(lr.leaveType),
      'Start Date': lr.startDate.toISOString().split('T')[0],
      'End Date': lr.endDate.toISOString().split('T')[0],
      'Total Days': lr.totalDays,
      'Reason': sanitizeForCSV(lr.reason || ''),
      'Status': sanitizeForCSV(lr.status),
      'Applied On': lr.appliedAt.toISOString().split('T')[0],
      'Approved By': sanitizeForCSV(lr.approvedBy || ''),
      'Remarks': sanitizeForCSV(lr.remarks || ''),
    }))

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(reportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Leave Report')
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) 
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="leave-report.xlsx"',
        },
      })
    }

    return NextResponse.json({ success: true, data: reportData, total: reportData.length })
  } catch (error) {
    console.error('Leave report error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
