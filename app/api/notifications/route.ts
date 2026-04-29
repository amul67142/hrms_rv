import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

// GET — fetch notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const role = token.role as string
    const employeeId = token.employeeId as string | null

    // Admin/HR sees admin-broadcast (employeeId IS NULL)
    // Employee sees their own (employeeId = their id)
    const where =
      role === 'ADMIN' || role === 'HR_MANAGER'
        ? { employeeId: null }
        : { employeeId: employeeId ?? undefined }

    const data = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: { ...where, isRead: false },
    })

    return NextResponse.json({ success: true, data, unreadCount })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
