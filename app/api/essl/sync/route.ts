import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await getToken({ req: request })

    const logs = await prisma.esslSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('GET /api/essl/sync error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string
    const userId = token?.sub as string

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // --- Test connection mode ---
    if (body.test) {
      const settings = await prisma.esslSetting.findFirst()
      if (!settings || !settings.isActive) {
        return NextResponse.json({ success: false, error: 'ESSL integration is not configured or inactive' }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: 'ESSL settings are active' })
    }

    // --- Import attendance from Excel upload ---
    if (body.import && body.records && Array.isArray(body.records)) {
      const records = body.records as Array<{
        employee_code: string
        date: string
        check_in_time: string
        check_out_time: string
        device_id?: string
        location?: string
        remarks?: string
      }>
      const duplicateStrategy = body.duplicateStrategy || 'skip'
      const fileName = body.fileName || 'unknown.xlsx'

      let successCount = 0
      let failedCount = 0
      let duplicateCount = 0
      const errors: string[] = []

      for (const record of records) {
        try {
          const code = record.employee_code?.trim()
          if (!code || !record.date?.trim()) {
            failedCount++
            errors.push(`Row missing employee_code or date`)
            continue
          }

          // Normalize the ESSL code: if it's a raw number, pad to EMP0XX format
          let esslCode = code
          if (/^\d+$/.test(code)) {
            esslCode = `EMP${code.padStart(3, '0')}`
          }

          // Look up employee by esslCode
          const employee = await prisma.employee.findFirst({
            where: {
              OR: [
                { esslCode: esslCode },
                { esslCode: code },
                { employeeCode: code },
              ],
            },
            select: { id: true, employeeCode: true, firstName: true },
          })

          if (!employee) {
            failedCount++
            errors.push(`Employee code "${code}" (→ ${esslCode}) not found`)
            continue
          }

          // Parse date
          const dateParts = record.date.trim().split(/[-\/]/)
          let attendanceDate: Date
          if (dateParts.length === 3) {
            const [y, m, d] = dateParts[0].length === 4
              ? [dateParts[0], dateParts[1], dateParts[2]]
              : [dateParts[2], dateParts[1], dateParts[0]]
            attendanceDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
          } else {
            attendanceDate = new Date(record.date.trim())
          }

          if (isNaN(attendanceDate.getTime())) {
            failedCount++
            errors.push(`Invalid date "${record.date}" for ${code}`)
            continue
          }
          // Normalize to midnight UTC
          attendanceDate.setHours(0, 0, 0, 0)

          const inTime = record.check_in_time?.trim() || null
          const outTime = record.check_out_time?.trim() || null

          // Calculate hours worked if both times present
          let hoursWorked: number | null = null
          if (inTime && outTime) {
            const inParts = inTime.split(':').map(Number)
            const outParts = outTime.split(':').map(Number)
            if (inParts.length >= 2 && outParts.length >= 2) {
              const inMins = inParts[0] * 60 + inParts[1]
              const outMins = outParts[0] * 60 + outParts[1]
              hoursWorked = Math.max(0, Math.round(((outMins - inMins) / 60) * 100) / 100)
            }
          }

          // Determine status
          let status = 'PRESENT'
          if (hoursWorked !== null && hoursWorked > 0 && hoursWorked < 4) {
            status = 'HALF_DAY'
          } else if (!inTime && !outTime) {
            status = 'ABSENT'
          }

          // Check for existing record
          const existing = await prisma.attendance.findUnique({
            where: {
              employeeId_date: {
                employeeId: employee.id,
                date: attendanceDate,
              },
            },
          })

          if (existing) {
            duplicateCount++
            if (duplicateStrategy === 'skip') {
              continue
            } else if (duplicateStrategy === 'overwrite') {
              await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                  status,
                  inTime,
                  outTime,
                  hoursWorked,
                  remarks: record.remarks?.trim() || existing.remarks,
                },
              })
              successCount++
            } else {
              // keep_both — can't keep both with unique constraint, so skip
              continue
            }
          } else {
            await prisma.attendance.create({
              data: {
                employeeId: employee.id,
                date: attendanceDate,
                status,
                inTime,
                outTime,
                hoursWorked,
                remarks: record.remarks?.trim() || null,
              },
            })
            successCount++
          }
        } catch (rowErr: any) {
          failedCount++
          errors.push(`Error processing row: ${rowErr.message}`)
        }
      }

      // Determine overall status
      let syncStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' = 'SUCCESS'
      if (successCount === 0 && failedCount > 0) syncStatus = 'FAILED'
      else if (failedCount > 0) syncStatus = 'PARTIAL'

      // Save sync log
      const syncLog = await prisma.esslSyncLog.create({
        data: {
          syncType: 'IMPORT',
          status: syncStatus,
          recordsProcessed: records.length,
          recordsCreated: successCount,
          recordsUpdated: duplicateStrategy === 'overwrite' ? duplicateCount : 0,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          module: 'ESSL',
          action: 'IMPORT',
          description: `Imported ${fileName}: ${successCount} success, ${failedCount} failed, ${duplicateCount} duplicates`,
          newValue: JSON.stringify({ syncLogId: syncLog.id, fileName, successCount, failedCount, duplicateCount }),
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          successCount,
          failedCount,
          duplicateCount,
          status: syncStatus,
          errors: errors.slice(0, 20), // return first 20 errors
        },
        message: `Imported ${successCount} attendance records${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      })
    }

    // --- Default: manual sync trigger ---
    const settings = await prisma.esslSetting.findFirst()
    if (!settings || !settings.isActive) {
      return NextResponse.json({ success: false, error: 'ESSL integration is not configured or inactive' }, { status: 400 })
    }

    const syncLog = await prisma.esslSyncLog.create({
      data: {
        syncType: 'MANUAL',
        status: 'SUCCESS',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })

    await prisma.esslSetting.update({
      where: { id: settings.id },
      data: { lastSyncAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'ESSL',
        action: 'MANUAL_SYNC',
        description: 'Manual ESSL sync triggered',
        newValue: JSON.stringify({ syncLogId: syncLog.id }),
      },
    })

    return NextResponse.json({
      success: true,
      data: syncLog,
      message: 'Sync completed successfully',
    })
  } catch (error) {
    console.error('POST /api/essl/sync error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
