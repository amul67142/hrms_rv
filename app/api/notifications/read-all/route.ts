import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

// POST — mark all notifications as read for the current user
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const role = token.role as string
    const employeeId = token.employeeId as string | null

    const where =
      role === 'ADMIN' || role === 'HR_MANAGER'
        ? { employeeId: null, isRead: false }
        : { employeeId: employeeId ?? undefined, isRead: false }

    await prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/notifications/read-all error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
