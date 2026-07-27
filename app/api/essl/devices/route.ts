import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

/**
 * GET /api/essl/devices — Device status dashboard
 *
 * Returns:
 * - List of registered devices (unique SNs from biometric_punches)
 * - Last punch time per device
 * - Total punches today per device
 * - Total unmapped user IDs per device
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Get today's date range
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // Get all unique device SNs from punches
    const deviceSns = await prisma.biometricPunch.findMany({
      select: { deviceSn: true },
      distinct: ['deviceSn'],
    })

    // Also get SNs from raw logs (devices that registered but haven't sent punches yet)
    const rawLogSns = await prisma.biometricRawLog.findMany({
      where: { deviceSn: { not: null } },
      select: { deviceSn: true },
      distinct: ['deviceSn'],
    })

    // Merge unique SNs
    const allSns = [...new Set([
      ...deviceSns.map(d => d.deviceSn),
      ...rawLogSns.map(d => d.deviceSn).filter((sn): sn is string => sn !== null && sn !== 'UNKNOWN'),
    ])]

    // Build device status for each SN
    const devices = await Promise.all(
      allSns.map(async (sn) => {
        // Last punch
        const lastPunch = await prisma.biometricPunch.findFirst({
          where: { deviceSn: sn },
          orderBy: { createdAt: 'desc' },
          select: {
            punchTime: true,
            createdAt: true,
            deviceUserId: true,
            statusLabel: true,
            verifyLabel: true,
            employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          },
        })

        // Today's punch count
        const todayCount = await prisma.biometricPunch.count({
          where: {
            deviceSn: sn,
            punchTime: { gte: todayStart, lte: todayEnd },
          },
        })

        // Total punch count
        const totalCount = await prisma.biometricPunch.count({
          where: { deviceSn: sn },
        })

        // Unmapped user count
        const unmappedCount = await prisma.unmappedPunch.count({
          where: { deviceSn: sn, resolved: false },
        })

        // Last contact (from raw logs)
        const lastContact = await prisma.biometricRawLog.findFirst({
          where: { deviceSn: sn },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })

        // Mapped user count
        const mappedUsers = await prisma.deviceUserMap.count({
          where: { deviceSn: sn },
        })

        return {
          sn,
          lastPunch: lastPunch ? {
            time: lastPunch.punchTime,
            receivedAt: lastPunch.createdAt,
            deviceUserId: lastPunch.deviceUserId,
            status: lastPunch.statusLabel,
            verifyMode: lastPunch.verifyLabel,
            employeeName: lastPunch.employee
              ? `${lastPunch.employee.firstName} ${lastPunch.employee.lastName}`
              : null,
            employeeCode: lastPunch.employee?.employeeCode || null,
          } : null,
          todayPunches: todayCount,
          totalPunches: totalCount,
          unmappedUsers: unmappedCount,
          mappedUsers,
          lastContact: lastContact?.createdAt || null,
          isOnline: lastContact
            ? (Date.now() - new Date(lastContact.createdAt).getTime()) < 5 * 60 * 1000 // online if contacted within 5 min
            : false,
        }
      })
    )

    // Summary stats
    const totalPunchesToday = devices.reduce((sum, d) => sum + d.todayPunches, 0)
    const totalUnmapped = devices.reduce((sum, d) => sum + d.unmappedUsers, 0)

    return NextResponse.json({
      success: true,
      data: {
        devices,
        summary: {
          totalDevices: devices.length,
          onlineDevices: devices.filter(d => d.isOnline).length,
          totalPunchesToday,
          totalUnmapped,
        },
      },
    })
  } catch (error) {
    console.error('GET /api/essl/devices error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
