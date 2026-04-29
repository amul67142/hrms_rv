import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getAuthCookieOptions, getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const userId = token.sub
    const ipAddress = (() => {
      const forwarded = request.headers.get('x-forwarded-for')
      if (forwarded) return forwarded.split(',')[0].trim()
      const realIp = request.headers.get('x-real-ip')
      if (realIp) return realIp.trim()
      return '127.0.0.1'
    })()
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    // Mark the most recent active session as logged out
    const latestSession = await prisma.loginSession.findFirst({
      where: { userId, isActive: true },
      orderBy: { loginAt: 'desc' },
    })

    if (latestSession) {
      await prisma.loginSession.update({
        where: { id: latestSession.id },
        data: { isActive: false, logoutAt: new Date() },
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        employeeId: token.employeeId || undefined,
        module: 'AUTH',
        action: 'LOGOUT',
        description: 'User logged out',
        ipAddress,
        userAgent,
      },
    })

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
    response.cookies.set(getAuthCookieOptions().name, '', {
      ...getAuthCookieOptions(),
      maxAge: 0,
    })
    return response
  } catch (error) {
    console.error('POST /api/auth/signout error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
