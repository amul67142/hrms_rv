import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getToken({ req: request })
    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
    })
    if (!announcement) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: announcement })
  } catch (error) {
    console.error('GET /api/announcements/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role
    if (!token || (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, type, priority, isActive } = body

    const updated = await prisma.announcement.update({
      where: { id: params.id },
      data: { title, content, type, priority, isActive },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PUT /api/announcements/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role
    if (!token || (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.announcement.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/announcements/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
