import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'

export const dynamic = 'force-dynamic'

// Status code labels for ATTLOG
const STATUS_LABELS: Record<number, string> = {
  0: 'CHECK_IN',
  1: 'CHECK_OUT',
  2: 'BREAK_OUT',
  3: 'BREAK_IN',
  4: 'OT_IN',
  5: 'OT_OUT',
}

// Verify mode labels
const VERIFY_LABELS: Record<number, string> = {
  0: 'PASSWORD',
  1: 'FINGERPRINT',
  2: 'CARD_FINGERPRINT',
  3: 'PASSWORD_FINGERPRINT',
  4: 'CARD',
  5: 'CARD_PASSWORD',
  6: 'FINGERPRINT_PASSWORD',
  7: 'CARD_FINGERPRINT_PASSWORD',
  8: 'PALM',
  9: 'FACE_FINGERPRINT',
  15: 'FACE',
}

// Attendance status mapping
const ATTENDANCE_STATUS: Record<string, string> = {
  PRESENT: 'PRESENT',
  HALF_DAY: 'HALF_DAY',
  ABSENT: 'ABSENT',
}

/**
 * GET /iclock/cdata — Device registration/handshake
 *
 * The device sends:  GET /iclock/cdata?SN=XXXX&options=all
 * We respond with configuration telling the device how to behave:
 *   - Realtime=1 → push each punch immediately
 *   - TransFlag → what data to transmit
 *   - Delay/ErrorDelay → retry timing
 *   - Stamp/OpStamp → sync watermarks (9999 = "send everything")
 */
export async function GET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get('SN') || 'UNKNOWN'

  // Log every request for debugging
  try {
    await prisma.biometricRawLog.create({
      data: {
        deviceSn: sn,
        endpoint: '/iclock/cdata',
        method: 'GET',
        queryParams: request.nextUrl.search,
        body: null,
      },
    })
  } catch (e) {
    console.error('[iclock/cdata GET] Failed to log raw request:', e)
  }

  // Respond with device configuration
  const config = [
    `GET OPTION FROM: ${sn}`,
    `Stamp=9999`,
    `OpStamp=9999`,
    `PhotoStamp=9999`,
    `ErrorDelay=30`,
    `Delay=10`,
    `TransTimes=00:00;14:05`,
    `TransInterval=1`,
    `TransFlag=TransData AttLog OpLog AttPhoto`,
    `Realtime=1`,
    `Encrypt=0`,
    `ServerVer=2.4.1`,
    `PushProtVer=2.4.1`,
    `TimeZone=5.5`,
  ].join('\n')

  return new NextResponse(config, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

/**
 * POST /iclock/cdata — Attendance/operation log push
 *
 * The device sends:
 *   POST /iclock/cdata?SN=XXXX&table=ATTLOG&Stamp=9999
 *   Body: tab-separated records, one per line
 *
 * ATTLOG format (tab-separated):
 *   user_id \t timestamp \t status \t verify_mode \t work_code \t reserved1 \t reserved2 \t reserved3 \t reserved4 \t reserved5
 *
 * OPERLOG format: operation logs (user enrollment, settings changes, etc.)
 *   We just acknowledge these.
 *
 * CRITICAL: Never return HTTP errors to the device. Always 200 OK.
 * The device will retry forever on errors, creating a thundering herd.
 */
export async function POST(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get('SN') || 'UNKNOWN'
  const table = request.nextUrl.searchParams.get('table') || ''
  const stamp = request.nextUrl.searchParams.get('Stamp') || ''

  // Read raw body — device may send text/plain, multipart, or no content-type
  let rawBody = ''
  try {
    rawBody = await request.text()
  } catch (e) {
    console.error('[iclock/cdata POST] Failed to read body:', e)
  }

  // Log raw request FIRST before any parsing
  try {
    await prisma.biometricRawLog.create({
      data: {
        deviceSn: sn,
        endpoint: '/iclock/cdata',
        method: 'POST',
        queryParams: request.nextUrl.search,
        body: rawBody.substring(0, 10000), // cap at 10KB to prevent DB bloat
      },
    })
  } catch (e) {
    console.error('[iclock/cdata POST] Failed to log raw request:', e)
  }

  // Handle OPERLOG — just acknowledge
  if (table.toUpperCase() === 'OPERLOG') {
    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Handle ATTLOG
  if (table.toUpperCase() === 'ATTLOG') {
    let processedCount = 0

    try {
      const lines = rawBody
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)

      if (lines.length === 0) {
        return new NextResponse('OK: 0', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        })
      }

      // Pre-fetch all device user mappings for this device SN to avoid N+1
      const mappings = await prisma.deviceUserMap.findMany({
        where: { deviceSn: sn },
        include: { employee: { select: { id: true, employeeCode: true } } },
      })
      const mappingLookup = new Map(
        mappings.map(m => [m.deviceUserId, m])
      )

      for (const line of lines) {
        try {
          // Parse tab-separated fields
          // Format: user_id \t timestamp \t status \t verify_mode \t work_code \t ...
          // Some devices use tabs, some use \t literal, some use spaces
          const fields = line.split('\t').map(f => f.trim())

          if (fields.length < 2) {
            console.warn(`[iclock/cdata] Malformed line (${fields.length} fields): ${line}`)
            continue
          }

          const deviceUserId = fields[0]
          const timestampStr = fields[1]
          const statusCode = parseInt(fields[2] || '0', 10)
          const verifyModeCode = parseInt(fields[3] || '0', 10)
          const workCode = fields[4] || null

          // Validate user_id
          if (!deviceUserId || deviceUserId.trim() === '') {
            console.warn(`[iclock/cdata] Empty user_id in line: ${line}`)
            continue
          }

          // Parse timestamp — device sends "YYYY-MM-DD HH:MM:SS"
          const punchTime = parseDeviceTimestamp(timestampStr)
          if (!punchTime) {
            console.warn(`[iclock/cdata] Invalid timestamp "${timestampStr}" in line: ${line}`)
            continue
          }

          const statusLabel = STATUS_LABELS[statusCode] || `UNKNOWN_${statusCode}`
          const verifyLabel = VERIFY_LABELS[verifyModeCode] || `UNKNOWN_${verifyModeCode}`

          // Look up mapping
          const mapping = mappingLookup.get(deviceUserId)

          if (mapping) {
            // Mapped user — insert BiometricPunch and update Attendance
            try {
              await prisma.biometricPunch.create({
                data: {
                  deviceSn: sn,
                  deviceUserId,
                  employeeId: mapping.employeeId,
                  punchTime,
                  status: statusCode,
                  statusLabel,
                  verifyMode: verifyModeCode,
                  verifyLabel,
                  workCode,
                  rawLine: line.substring(0, 500),
                },
              })
            } catch (e: any) {
              // P2002 = unique constraint violation → duplicate punch, skip silently
              if (e?.code === 'P2002') {
                processedCount++
                continue
              }
              throw e
            }

            // Update Attendance table — merge strategy (first-in, last-out)
            await upsertAttendance(mapping.employeeId, punchTime, statusCode)
            processedCount++
          } else {
            // Unmapped user — log for admin review
            try {
              await prisma.unmappedPunch.create({
                data: {
                  deviceSn: sn,
                  deviceUserId,
                  punchTime,
                  status: statusCode,
                  verifyMode: verifyModeCode,
                  rawLine: line.substring(0, 500),
                },
              })
            } catch (e: any) {
              // If duplicate unmapped punch, silently skip
              if (e?.code !== 'P2002') {
                console.error('[iclock/cdata] Failed to log unmapped punch:', e)
              }
            }

            // Also store in BiometricPunch without employeeId for record-keeping
            try {
              await prisma.biometricPunch.create({
                data: {
                  deviceSn: sn,
                  deviceUserId,
                  employeeId: null,
                  punchTime,
                  status: statusCode,
                  statusLabel,
                  verifyMode: verifyModeCode,
                  verifyLabel,
                  workCode,
                  rawLine: line.substring(0, 500),
                },
              })
            } catch (e: any) {
              if (e?.code !== 'P2002') {
                console.error('[iclock/cdata] Failed to create unmapped BiometricPunch:', e)
              }
            }

            processedCount++
          }
        } catch (lineErr) {
          // Never fail on a single line — log and continue
          console.error(`[iclock/cdata] Error processing line: ${line}`, lineErr)
          processedCount++ // still count it to avoid device retry
        }
      }
    } catch (err) {
      console.error('[iclock/cdata] Fatal error processing ATTLOG:', err)
      // STILL return OK to avoid device retry loop
    }

    return new NextResponse(`OK: ${processedCount}`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Unknown table or no table — acknowledge anyway
  return new NextResponse('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}

/**
 * Parse device timestamp string into a Date object.
 * Handles multiple formats:
 *   "2026-07-11 09:00:00"
 *   "2026-07-11T09:00:00"
 *   "2026/07/11 09:00:00"
 */
function parseDeviceTimestamp(str: string): Date | null {
  if (!str || str.trim() === '') return null

  try {
    // Normalize separators
    const normalized = str.trim().replace(/\//g, '-').replace('T', ' ')

    // Match "YYYY-MM-DD HH:MM:SS"
    const match = normalized.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/
    )

    if (match) {
      const [, year, month, day, hour, minute, second] = match
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      )
      if (!isNaN(date.getTime())) return date
    }

    // Fallback: try native Date parser
    const fallback = new Date(str.trim())
    if (!isNaN(fallback.getTime())) return fallback

    return null
  } catch {
    return null
  }
}

/**
 * Upsert the Attendance table with punch data.
 *
 * Strategy: MERGE (first-in, last-out)
 * - Status 0 (CHECK_IN): If no record exists, create one. If record exists and inTime is null
 *   or new time is earlier, update inTime.
 * - Status 1 (CHECK_OUT): If no record exists, create one. If record exists and outTime is null
 *   or new time is later, update outTime. Recalculate hoursWorked.
 * - Status 2-5 (break/OT): Logged in BiometricPunch but we don't modify the Attendance record.
 *   These can be extended later.
 */
async function upsertAttendance(
  employeeId: string,
  punchTime: Date,
  statusCode: number
) {
  try {
    // Only process check-in (0) and check-out (1)
    if (statusCode !== 0 && statusCode !== 1) return

    // Compute the date at midnight for the attendance record
    const attendanceDate = new Date(punchTime)
    attendanceDate.setHours(0, 0, 0, 0)

    // Format time as HH:MM string
    const timeStr = `${String(punchTime.getHours()).padStart(2, '0')}:${String(punchTime.getMinutes()).padStart(2, '0')}`

    // Find existing attendance record for this employee + date
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
    })

    if (existing) {
      const updates: Record<string, any> = {}

      if (statusCode === 0) {
        // CHECK_IN: use earliest time
        if (!existing.inTime || timeStr < existing.inTime) {
          updates.inTime = timeStr
        }
      } else if (statusCode === 1) {
        // CHECK_OUT: use latest time
        if (!existing.outTime || timeStr > existing.outTime) {
          updates.outTime = timeStr
        }
      }

      // Recalculate hours worked if we have both times
      const finalIn = updates.inTime || existing.inTime
      const finalOut = updates.outTime || existing.outTime

      if (finalIn && finalOut) {
        const inParts = finalIn.split(':').map(Number)
        const outParts = finalOut.split(':').map(Number)
        const inMins = inParts[0] * 60 + inParts[1]
        const outMins = outParts[0] * 60 + outParts[1]
        const hours = Math.max(0, Math.round(((outMins - inMins) / 60) * 100) / 100)
        updates.hoursWorked = hours

        // Determine status
        if (hours >= 4) {
          updates.status = ATTENDANCE_STATUS.PRESENT
        } else if (hours > 0) {
          updates.status = ATTENDANCE_STATUS.HALF_DAY
        }
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length > 0) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: updates,
        })
      }
    } else {
      // No existing record — create new one
      const inTime = statusCode === 0 ? timeStr : null
      const outTime = statusCode === 1 ? timeStr : null

      await prisma.attendance.create({
        data: {
          employeeId,
          date: attendanceDate,
          status: ATTENDANCE_STATUS.PRESENT,
          inTime,
          outTime,
          hoursWorked: null,
          remarks: 'Auto-recorded via biometric device',
        },
      })
    }
  } catch (err: any) {
    // P2002 = unique constraint violation — race condition, another punch already created the record
    if (err?.code === 'P2002') {
      // Retry as an update
      try {
        const attendanceDate = new Date(punchTime)
        attendanceDate.setHours(0, 0, 0, 0)
        const timeStr = `${String(punchTime.getHours()).padStart(2, '0')}:${String(punchTime.getMinutes()).padStart(2, '0')}`

        const updateData: Record<string, any> = {}
        if (statusCode === 0) updateData.inTime = timeStr
        if (statusCode === 1) updateData.outTime = timeStr

        await prisma.attendance.update({
          where: {
            employeeId_date: { employeeId, date: attendanceDate },
          },
          data: updateData,
        })
      } catch (retryErr) {
        console.error('[iclock/cdata] Retry update attendance failed:', retryErr)
      }
    } else {
      console.error('[iclock/cdata] Failed to upsert attendance:', err)
    }
  }
}
