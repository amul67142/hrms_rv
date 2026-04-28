import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

const createSessionSchema = z.object({
  userId: z.string().min(1),
  ipAddress: z.string().optional(),
  deviceType: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().min(1),
})

// GET /api/sessions
// EMPLOYEE  -> own sessions only
// ADMIN/HR_MANAGER -> all sessions with filters
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token?.role as Role
    const userId = token.sub
    const isPrivileged = userRole === 'ADMIN' || userRole === 'HR_MANAGER'

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const filterUserId = searchParams.get('userId') || ''
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const device = searchParams.get('device') || ''
    const browser = searchParams.get('browser') || ''

    // Non-privileged users can only see their own sessions
    const where: any = isPrivileged
      ? (filterUserId ? { userId: filterUserId } : {})
      : { userId }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'expired') {
      where.isActive = false
    }

    if (dateFrom && dateTo) {
      where.loginAt = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo + 'T23:59:59.999Z'),
      }
    } else if (dateFrom) {
      where.loginAt = { gte: new Date(dateFrom) }
    } else if (dateTo) {
      where.loginAt = { lte: new Date(dateTo + 'T23:59:59.999Z') }
    }

    if (device) where.deviceType = device
    if (browser) where.browser = browser

    const [total, data] = await Promise.all([
      prisma.loginSession.count({ where }),
      prisma.loginSession.findMany({
        where,
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
        orderBy: { loginAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const sessions = data.map((session) => ({
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
    }))

    return NextResponse.json({
      success: true,
      data: sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/sessions error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sessions
// Called from the login flow to create a new session record
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createSessionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Only admins can create sessions on behalf of other users
    const userRole = token?.role as Role
    const isPrivileged = userRole === 'ADMIN' || userRole === 'HR_MANAGER'
    if (data.userId !== token.sub && !isPrivileged) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({ where: { id: data.userId } })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Prevent duplicate active session IDs
    if (data.sessionId) {
      const existing = await prisma.loginSession.findUnique({ where: { sessionId: data.sessionId } })
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Session already exists' },
          { status: 409 }
        )
      }
    }

    const session = await prisma.loginSession.create({
      data: {
        userId: data.userId,
        ipAddress: data.ipAddress ?? null,
        deviceType: data.deviceType ?? null,
        browser: data.browser ?? null,
        os: data.os ?? null,
        userAgent: data.userAgent ?? null,
        sessionId: data.sessionId,
        loginAt: new Date(),
        isActive: true,
      },
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

    return NextResponse.json({
      success: true,
      data: session,
      message: 'Session created',
    })
  } catch (error) {
    console.error('POST /api/sessions error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
