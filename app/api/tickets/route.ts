import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    const userRole = token?.role
    const employeeId = token?.employeeId
    const where = (userRole === 'ADMIN' || userRole === 'HR_MANAGER')
      ? {}
      : { employeeId: employeeId as string }
    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    })
    return NextResponse.json({ success: true, data: tickets })
  } catch (error) {
    console.error('GET /api/tickets error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const employeeId = token?.employeeId
    if (!employeeId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { title, description, category, priority } = body
    if (!title || !description) return NextResponse.json({ success: false, error: 'Title and description required' }, { status: 400 })
    const ticket = await prisma.ticket.create({
      data: { employeeId: employeeId as string, title, description, category: category || 'GENERAL', priority: priority || 'MEDIUM' },
    })
    return NextResponse.json({ success: true, data: ticket })
  } catch (error) {
    console.error('POST /api/tickets error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
