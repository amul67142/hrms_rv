import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import * as XLSX from 'xlsx'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const department = searchParams.get('department') || ''
    const month = searchParams.get('month') || ''
    const year = searchParams.get('year') || ''
    const exportFormat = searchParams.get('export') || ''

    const where: any = {}

    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) }
    } else if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      where.date = {
        gte: new Date(yearNum, monthNum - 1, 1),
        lte: new Date(yearNum, monthNum, 0),
      }
    }

    const employees = await prisma.employee.findMany({
      where: department ? { ...(where.employee || {}), department } : {},
      select: { id: true, employeeCode: true, firstName: true, lastName: true, department: true },
    })

    const empIds = employees.map((e) => e.id)
    const empIdSet = new Set(empIds)

    if (empIds.length > 0) {
      where.employeeId = { in: empIds }
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'asc' }, { employeeId: 'asc' }],
    })

    const summaryByEmployee = new Map<string, {
      present: number
      absent: number
      halfDay: number
      weekOff: number
      holiday: number
      leave: number
    }>()

    employees.forEach((e) => {
      summaryByEmployee.set(e.id, { present: 0, absent: 0, halfDay: 0, weekOff: 0, holiday: 0, leave: 0 })
    })

    attendance.forEach((a) => {
      if (!empIdSet.has(a.employeeId)) return
      const s = summaryByEmployee.get(a.employeeId)
      if (!s) return
      switch (a.status) {
        case 'PRESENT': s.present++; break
        case 'ABSENT': s.absent++; break
        case 'HALF_DAY': s.halfDay++; break
        case 'WEEK_OFF': s.weekOff++; break
        case 'HOLIDAY': s.holiday++; break
        case 'LEAVE': s.leave++; break
      }
    })

    const reportData = employees.map((e) => {
      const s = summaryByEmployee.get(e.id) || { present: 0, absent: 0, halfDay: 0, weekOff: 0, holiday: 0, leave: 0 }
      return {
        'Employee Code': e.employeeCode,
        'Employee Name': `${e.firstName} ${e.lastName}`,
        'Department': e.department,
        'Present': s.present,
        'Absent': s.absent,
        'Half Day': s.halfDay,
        'Week Off': s.weekOff,
        'Holiday': s.holiday,
        'Leave': s.leave,
        'Total Working Days': s.present + s.absent + s.halfDay + s.leave,
      }
    })

    const totals = reportData.reduce(
      (acc, r) => {
        acc.present += r.Present
        acc.absent += r.Absent
        acc.halfDay += r['Half Day']
        acc.weekOff += r['Week Off']
        acc.holiday += r['Holiday']
        acc.leave += r['Leave']
        return acc
      },
      { present: 0, absent: 0, halfDay: 0, weekOff: 0, holiday: 0, leave: 0 }
    )

    reportData.push({
      'Employee Code': '',
      'Employee Name': 'TOTAL',
      'Department': '',
      'Present': totals.present,
      'Absent': totals.absent,
      'Half Day': totals.halfDay,
      'Week Off': totals.weekOff,
      'Holiday': totals.holiday,
      'Leave': totals.leave,
      'Total Working Days': totals.present + totals.absent + totals.halfDay + totals.leave,
    } as any)

    if (exportFormat === 'excel') {
      const ws = XLSX.utils.json_to_sheet(reportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report')
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="attendance_report_${month || startDate}_${year || endDate}.xlsx"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: reportData,
      summary: {
        totalEmployees: employees.length,
        totalPresent: totals.present,
        totalAbsent: totals.absent,
        totalHalfDay: totals.halfDay,
      },
    })
  } catch (error) {
    console.error('GET /api/reports/attendance error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
