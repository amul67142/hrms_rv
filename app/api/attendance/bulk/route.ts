import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import * as XLSX from 'xlsx'
import type { Role } from '@/types'

const VALID_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'WEEK_OFF', 'HOLIDAY', 'LEAVE']

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    if (rawData.length === 0) {
      return NextResponse.json({ success: false, error: 'No data found in file' }, { status: 400 })
    }

    const requiredCols = ['employeeCode', 'date', 'status']
    const headers = Object.keys(rawData[0])
    const missing = requiredCols.filter((col) => !headers.includes(col))
    if (missing.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required columns: ${missing.join(', ')}`,
      }, { status: 400 })
    }

    const employeeCodes = [...new Set(rawData.map((r) => String(r.employeeCode || '').trim()).filter(Boolean))]
    const employees = await prisma.employee.findMany({
      where: { employeeCode: { in: employeeCodes } },
      select: { id: true, employeeCode: true },
    })
    const empMap = new Map(employees.map((e) => [e.employeeCode, e.id]))

    const processed: { employeeCode: string; date: string; status: string }[] = []
    const errors: { row: number; employeeCode: string; date: string; error: string }[] = []

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNum = i + 2
      const employeeCode = String(row.employeeCode || '').trim()
      const dateStr = String(row.date || '').trim()
      const status = String(row.status || '').trim().toUpperCase()

      if (!employeeCode) {
        errors.push({ row: rowNum, employeeCode, date: dateStr, error: 'Employee code is required' })
        continue
      }
      if (!dateStr) {
        errors.push({ row: rowNum, employeeCode, date: dateStr, error: 'Date is required' })
        continue
      }
      if (!VALID_STATUSES.includes(status)) {
        errors.push({ row: rowNum, employeeCode, date: dateStr, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` })
        continue
      }

      const employeeId = empMap.get(employeeCode)
      if (!employeeId) {
        errors.push({ row: rowNum, employeeCode, date: dateStr, error: 'Employee not found' })
        continue
      }

      const dateVal = new Date(dateStr)
      if (isNaN(dateVal.getTime())) {
        errors.push({ row: rowNum, employeeCode, date: dateStr, error: 'Invalid date format' })
        continue
      }

      try {
        await prisma.attendance.upsert({
          where: {
            employeeId_date: { employeeId, date: dateVal },
          },
          update: {
            status: status as any,
            inTime: row.inTime ? String(row.inTime) : undefined,
            outTime: row.outTime ? String(row.outTime) : undefined,
            remarks: row.remarks ? String(row.remarks) : undefined,
          },
          create: {
            employeeId,
            date: dateVal,
            status: status as any,
            inTime: row.inTime ? String(row.inTime) : undefined,
            outTime: row.outTime ? String(row.outTime) : undefined,
            hoursWorked: row.hoursWorked ? parseFloat(row.hoursWorked) : undefined,
            remarks: row.remarks ? String(row.remarks) : undefined,
          },
        })
        processed.push({ employeeCode, date: dateStr, status })
      } catch (err: any) {
        errors.push({ row: rowNum, employeeCode, date: dateStr, error: err.message })
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'ATTENDANCE',
        action: 'IMPORT',
        description: `Bulk uploaded ${processed.length} attendance records, ${errors.length} failed`,
        newValue: JSON.stringify({ processed, errors }),
      },
    })

    return NextResponse.json({
      success: true,
      data: { processed, errors },
      totalProcessed: processed.length,
      totalErrors: errors.length,
    })
  } catch (error) {
    console.error('POST /api/attendance/bulk error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
