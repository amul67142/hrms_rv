import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request })
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!ticket) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('GET /api/tickets/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()

    const updateData: any = {}
    if (body.status && (userRole === 'ADMIN' || userRole === 'HR_MANAGER')) updateData.status = body.status
    if (body.priority && (userRole === 'ADMIN' || userRole === 'HR_MANAGER')) updateData.priority = body.priority
    if (body.assignedTo && (userRole === 'ADMIN' || userRole === 'HR_MANAGER')) updateData.assignedTo = body.assignedTo
    if (body.resolution !== undefined && (userRole === 'ADMIN' || userRole === 'HR_MANAGER')) updateData.resolution = body.resolution

    const ticket = await prisma.ticket.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('PATCH /api/tickets/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
