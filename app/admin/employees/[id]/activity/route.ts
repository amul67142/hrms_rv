import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

interface ActivityEntry {
  id: string
  module: string
  action: string
  description: string
  timestamp: string
  userEmail?: string
  userRole?: string
  ipAddress?: string
  oldValue?: any
  newValue?: any
}

interface GroupedActivity {
  date: string
  entries: ActivityEntry[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, email: true, role: true } } },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const logs = await prisma.auditLog.findMany({
      where: { employeeId: params.id },
      include: {
        user: { select: { email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const loginSessions = employee.user
      ? await prisma.loginSession.findMany({
          where: { userId: employee.user.id },
          orderBy: { loginAt: 'desc' },
          take: 10,
        })
      : []

    const activities: ActivityEntry[] = []

    for (const log of logs) {
      activities.push({
        id: log.id,
        module: log.module,
        action: log.action,
        description: log.description,
        timestamp: log.createdAt.toISOString(),
        userEmail: log.user?.email || employee.user?.email,
        userRole: log.user?.role || employee.user?.role,
        ipAddress: log.ipAddress || undefined,
        oldValue: log.oldValue ? JSON.parse(log.oldValue) : undefined,
        newValue: log.newValue ? JSON.parse(log.newValue) : undefined,
      })
    }

    for (const session of loginSessions) {
      const deviceType = session.deviceType || 'Unknown'
      activities.push({
        id: `login-${session.id}`,
        module: 'AUTH',
        action: session.logoutAt ? 'LOGOUT' : 'LOGIN',
        description: session.logoutAt
          ? `Logged out from ${deviceType} (${session.browser || 'Unknown'})`
          : `Logged in from ${deviceType} (${session.browser || 'Unknown'})`,
        timestamp: (session.logoutAt || session.loginAt).toISOString(),
        ipAddress: session.ipAddress || undefined,
      })
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const groupedByDate: GroupedActivity[] = []
    const dateMap = new Map<string, ActivityEntry[]>()

    for (const activity of activities) {
      const date = activity.timestamp.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, [])
      }
      dateMap.get(date)!.push(activity)
    }

    for (const [date, entries] of dateMap) {
      groupedByDate.push({ date, entries })
    }

    return NextResponse.json({
      success: true,
      data: {
        activities: groupedByDate,
        total: activities.length,
      },
    })
  } catch (error) {
    console.error('GET /admin/employees/[id]/activity error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
