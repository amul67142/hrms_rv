import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

// GET /api/sessions/[id]
// EMPLOYEE  -> own session only
// ADMIN/HR_MANAGER -> any session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token?.role as Role
    const isPrivileged = userRole === 'ADMIN' || userRole === 'HR_MANAGER'

    const session = await prisma.loginSession.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    // Non-privileged users can only view their own sessions
    if (!isPrivileged && session.userId !== token.sub) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const enriched = {
      id: session.id,
      userId: session.userId,
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      city: session.city,
      country: session.country,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      userAgent: session.userAgent,
      loginAt: session.loginAt,
      logoutAt: session.logoutAt,
      isActive: session.isActive,
      employeeName: session.user?.employee
        ? `${session.user.employee.firstName} ${session.user.employee.lastName}`
        : null,
      employeeCode: session.user?.employee?.employeeCode ?? null,
      userEmail: session.user?.email ?? null,
      userRole: session.user?.role ?? null,
    }

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('GET /api/sessions/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/sessions/[id]
// ADMIN only - force logout a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token?.role as Role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.loginSession.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            email: true,
            employee: {
              select: { employeeCode: true, firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    if (!existing.isActive) {
      return NextResponse.json(
        { success: false, error: 'Session is already inactive' },
        { status: 400 }
      )
    }

    const ipAddress = (() => {
      const forwarded = request.headers.get('x-forwarded-for')
      if (forwarded) return forwarded.split(',')[0].trim()
      const realIp = request.headers.get('x-real-ip')
      if (realIp) return realIp.trim()
      return '127.0.0.1'
    })()
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    const [updated] = await Promise.all([
      prisma.loginSession.update({
        where: { id: params.id },
        data: { isActive: false, logoutAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          userId: token.sub,
          employeeId: token.employeeId || undefined,
          module: 'AUTH',
          action: 'FORCE_LOGOUT',
          description: `Forced logout of session ${existing.sessionId ?? params.id} for user ${existing.user?.email ?? existing.userId}`,
          ipAddress,
          userAgent,
          oldValue: JSON.stringify({
            sessionId: existing.sessionId,
            deviceType: existing.deviceType,
            browser: existing.browser,
            os: existing.os,
            loginAt: existing.loginAt,
          }),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Session force-logged out successfully',
    })
  } catch (error) {
    console.error('DELETE /api/sessions/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
