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
    const department = searchParams.get('department') || ''
    const status = searchParams.get('status') || ''
    const employmentType = searchParams.get('employmentType') || ''
    const exportFormat = searchParams.get('export') || ''

    const where: any = {}
    if (department) where.department = department
    if (status) where.status = status
    if (employmentType) where.employmentType = employmentType

    const employees = await prisma.employee.findMany({
      where,
      include: {
        salaryStructures: {
          where: { isActive: true },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
      },
      orderBy: { employeeCode: 'asc' },
    })

    const reportData = employees.map((e) => {
      const salary = e.salaryStructures[0]
      return {
        'Employee Code': e.employeeCode,
        'First Name': e.firstName,
        'Last Name': e.lastName,
        'Email': e.email,
        'Phone': e.phone || '',
        'Department': e.department,
        'Designation': e.designation,
        'Employment Type': e.employmentType,
        'Joining Date': e.joiningDate.toISOString().split('T')[0],
        'Status': e.status,
        'Gender': e.gender || '',
        'Date of Birth': e.dateOfBirth?.toISOString().split('T')[0] || '',
        'PAN': e.panNumber || '',
        'Aadhaar': e.aadhaarNumber || '',
        'Bank Name': e.bankName || '',
        'Account Number': e.accountNumber || '',
        'IFSC Code': e.ifscCode || '',
        'UAN': e.uanNumber || '',
        'PF Number': e.pfNumber || '',
        'ESI Number': e.esiNumber || '',
        'City': e.city || '',
        'State': e.state || '',
        'Current Basic Salary': salary?.basicSalary || 0,
        'Current HRA': salary?.hra || 0,
        'Current Conveyance': salary?.conveyanceAllowance || 0,
        'Current Medical': salary?.medicalAllowance || 0,
        'Current Special': salary?.specialAllowance || 0,
      }
    })

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(reportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Employee Master')
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="employee_master_report_${department || 'all'}.xlsx"`,
        },
      })
    }

    const deptSummary = employees.reduce((acc, e) => {
      acc[e.department] = (acc[e.department] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const statusSummary = employees.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      data: reportData,
      summary: {
        totalEmployees: employees.length,
        byDepartment: deptSummary,
        byStatus: statusSummary,
      },
    })
  } catch (error) {
    console.error('GET /api/reports/employees error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
