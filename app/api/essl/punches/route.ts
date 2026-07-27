import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

/**
 * GET /api/essl/punches — Recent punches feed
 *
 * Query params:
 *   - limit: number of punches to return (default 50, max 200)
 *   - deviceSn: filter by device SN (optional)
 *   - date: filter by date "YYYY-MM-DD" (optional, defaults to today)
 *   - page: pagination (default 1)
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const limit = Math.min(parseInt(params.get('limit') || '50', 10), 200)
    const page = Math.max(parseInt(params.get('page') || '1', 10), 1)
    const deviceSn = params.get('deviceSn') || undefined
    const dateStr = params.get('date') || undefined

    // Build where clause
    const where: any = {}

    if (deviceSn) {
      where.deviceSn = deviceSn
    }

    if (dateStr) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const dayStart = new Date(date)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(date)
        dayEnd.setHours(23, 59, 59, 999)
        where.punchTime = { gte: dayStart, lte: dayEnd }
      }
    }

    const [punches, total] = await Promise.all([
      prisma.biometricPunch.findMany({
        where,
        orderBy: { punchTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: true,
              profileImage: true,
            },
          },
        },
      }),
      prisma.biometricPunch.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        punches: punches.map(p => ({
          id: p.id,
          deviceSn: p.deviceSn,
          deviceUserId: p.deviceUserId,
          punchTime: p.punchTime,
          status: p.status,
          statusLabel: p.statusLabel,
          verifyMode: p.verifyMode,
          verifyLabel: p.verifyLabel,
          workCode: p.workCode,
          createdAt: p.createdAt,
          employee: p.employee ? {
            id: p.employee.id,
            name: `${p.employee.firstName} ${p.employee.lastName}`,
            code: p.employee.employeeCode,
            department: p.employee.department,
            profileImage: p.employee.profileImage,
          } : null,
          isMapped: !!p.employeeId,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('GET /api/essl/punches error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
