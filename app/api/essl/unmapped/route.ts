import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

/**
 * GET /api/essl/unmapped — List unmapped punches for admin review
 *
 * Query params:
 *   - resolved: "true" | "false" (default "false")
 *   - deviceSn: filter by device (optional)
 *   - limit: default 50
 *   - page: default 1
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const resolved = params.get('resolved') === 'true'
    const deviceSn = params.get('deviceSn') || undefined
    const limit = Math.min(parseInt(params.get('limit') || '50', 10), 200)
    const page = Math.max(parseInt(params.get('page') || '1', 10), 1)

    const where: any = { resolved }
    if (deviceSn) where.deviceSn = deviceSn

    // Group unmapped punches by (deviceSn, deviceUserId) to show unique unmapped users
    const [items, total] = await Promise.all([
      prisma.unmappedPunch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.unmappedPunch.count({ where }),
    ])

    // Get distinct unmapped user IDs with their punch counts
    const unmappedUsers = await prisma.unmappedPunch.groupBy({
      by: ['deviceSn', 'deviceUserId'],
      where: { resolved: false },
      _count: { id: true },
      _max: { punchTime: true, createdAt: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        punches: items,
        unmappedUsers: unmappedUsers.map(u => ({
          deviceSn: u.deviceSn,
          deviceUserId: u.deviceUserId,
          punchCount: u._count.id,
          lastPunch: u._max.punchTime,
          lastSeen: u._max.createdAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('GET /api/essl/unmapped error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/essl/unmapped — Resolve unmapped punches by creating a mapping
 *
 * Body: { deviceSn, deviceUserId, employeeId }
 *
 * This:
 * 1. Creates a DeviceUserMap entry
 * 2. Marks all UnmappedPunch records for this (deviceSn, deviceUserId) as resolved
 * 3. Retroactively processes all unmapped punches: updates BiometricPunch with employeeId
 *    and creates Attendance records
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { deviceSn, deviceUserId, employeeId } = body

    if (!deviceSn || !deviceUserId || !employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: deviceSn, deviceUserId, employeeId',
      }, { status: 400 })
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    // Create or update the mapping
    await prisma.deviceUserMap.upsert({
      where: {
        deviceSn_deviceUserId: { deviceSn, deviceUserId },
      },
      create: { deviceSn, deviceUserId, employeeId },
      update: { employeeId },
    })

    // Mark all unmapped punches as resolved
    await prisma.unmappedPunch.updateMany({
      where: { deviceSn, deviceUserId, resolved: false },
      data: { resolved: true },
    })

    // Retroactively update BiometricPunch records with the employee ID
    await prisma.biometricPunch.updateMany({
      where: { deviceSn, deviceUserId, employeeId: null },
      data: { employeeId },
    })

    // Retroactively create Attendance records for past punches
    const pastPunches = await prisma.biometricPunch.findMany({
      where: { deviceSn, deviceUserId, employeeId },
      orderBy: { punchTime: 'asc' },
      select: { punchTime: true, status: true },
    })

    let attendanceUpdated = 0
    for (const punch of pastPunches) {
      try {
        if (punch.status === 0 || punch.status === 1) {
          const attendanceDate = new Date(punch.punchTime)
          attendanceDate.setHours(0, 0, 0, 0)
          const timeStr = `${String(punch.punchTime.getHours()).padStart(2, '0')}:${String(punch.punchTime.getMinutes()).padStart(2, '0')}`

          const existing = await prisma.attendance.findUnique({
            where: { employeeId_date: { employeeId, date: attendanceDate } },
          })

          if (existing) {
            const updates: Record<string, any> = {}
            if (punch.status === 0 && (!existing.inTime || timeStr < existing.inTime)) {
              updates.inTime = timeStr
            }
            if (punch.status === 1 && (!existing.outTime || timeStr > existing.outTime)) {
              updates.outTime = timeStr
            }
            const finalIn = updates.inTime || existing.inTime
            const finalOut = updates.outTime || existing.outTime
            if (finalIn && finalOut) {
              const inParts = finalIn.split(':').map(Number)
              const outParts = finalOut.split(':').map(Number)
              const hours = Math.max(0, Math.round(((outParts[0] * 60 + outParts[1]) - (inParts[0] * 60 + inParts[1])) / 60 * 100) / 100)
              updates.hoursWorked = hours
              updates.status = hours >= 4 ? 'PRESENT' : hours > 0 ? 'HALF_DAY' : existing.status
            }
            if (Object.keys(updates).length > 0) {
              await prisma.attendance.update({ where: { id: existing.id }, data: updates })
              attendanceUpdated++
            }
          } else {
            await prisma.attendance.create({
              data: {
                employeeId,
                date: attendanceDate,
                status: 'PRESENT',
                inTime: punch.status === 0 ? timeStr : null,
                outTime: punch.status === 1 ? timeStr : null,
                remarks: 'Auto-recorded via biometric device (retroactive)',
              },
            })
            attendanceUpdated++
          }
        }
      } catch (e: any) {
        if (e?.code !== 'P2002') {
          console.error('[unmapped resolve] Attendance upsert error:', e)
        }
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: token.sub as string,
        module: 'ESSL',
        action: 'MAP_DEVICE_USER',
        description: `Mapped device user ${deviceUserId} (SN: ${deviceSn}) to ${employee.firstName} ${employee.lastName} (${employee.employeeCode}). ${attendanceUpdated} attendance records updated retroactively.`,
        newValue: JSON.stringify({ deviceSn, deviceUserId, employeeId, attendanceUpdated }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Mapped ${deviceUserId} → ${employee.firstName} ${employee.lastName}. ${attendanceUpdated} attendance records updated.`,
      data: { deviceSn, deviceUserId, employeeId, attendanceUpdated },
    })
  } catch (error: any) {
    console.error('POST /api/essl/unmapped error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
