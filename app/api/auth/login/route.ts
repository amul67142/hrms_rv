import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/core/db'
import { createAuthToken, getAuthCookieOptions } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

function parseUserAgent(userAgent: string): { deviceType: string; browser: string; os: string } {
  const ua = userAgent.toLowerCase()
  let deviceType = 'Desktop'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) deviceType = 'Mobile'

  let browser = 'Unknown'
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('edg')) browser = 'Edge'

  let os = 'Unknown'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('iphone') || ua.includes('ios')) os = 'iOS'

  return { deviceType, browser, os }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    const authToken = await createAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: user.employee?.department ?? null,
      status: user.employee?.status ?? null,
    })

    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const { deviceType, browser, os } = parseUserAgent(userAgent)

    // Create login session
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`
    await prisma.loginSession.create({
      data: {
        userId: user.id,
        ipAddress,
        deviceType,
        browser,
        os,
        userAgent,
        sessionId,
        loginAt: new Date(),
        isActive: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        employeeId: user.employeeId || undefined,
        module: 'AUTH',
        action: 'LOGIN',
        description: `Login from ${deviceType} (${browser} on ${os})`,
        ipAddress,
        userAgent,
      },
    })

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
        },
        sessionId,
        ipAddress,
        deviceType,
        browser,
        os,
        loginAt: new Date().toISOString(),
      },
      message: 'Login tracked',
    })

    response.cookies.set(getAuthCookieOptions().name, authToken, getAuthCookieOptions())
    return response
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
