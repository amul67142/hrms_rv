import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'
import { prisma } from '@/lib/core/db'
import type { Role } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const employee = await prisma.employee.findUnique({ where: { id: params.id } })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({ where: { employeeId: params.id } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'No user account for this employee' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [sessions, total] = await Promise.all([
      prisma.loginSession.findMany({
        where: { userId: user.id },
        orderBy: { loginAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loginSession.count({ where: { userId: user.id } }),
    ])

    // Also get audit log entries for this employee's auth events
    const auditLogs = await prisma.auditLog.findMany({
      where: { employeeId: params.id, module: 'AUTH' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        auditLogs,
        summary: {
          totalLogins: total,
          activeSessions: sessions.filter((s) => s.isActive).length,
          lastLogin: sessions[0]?.loginAt || null,
        },
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('GET /api/admin/employees/[id]/login-history error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (!token || (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId, action } = body

    if (action === 'force-logout') {
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 })
      }

      const session = await prisma.loginSession.findUnique({ where: { id: sessionId } })
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
      }

      await prisma.loginSession.update({
        where: { id: sessionId },
        data: { isActive: false, logoutAt: new Date() },
      })

      await prisma.auditLog.create({
        data: {
          userId: token!.sub,
          employeeId: token!.employeeId || undefined,
          module: 'AUTH',
          action: 'FORCE_LOGOUT',
          description: `Force logout of session ${sessionId} (user: ${session.userId})`,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
        },
      })

      return NextResponse.json({ success: true, message: 'Session terminated' })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/admin/employees/[id]/login-history error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
