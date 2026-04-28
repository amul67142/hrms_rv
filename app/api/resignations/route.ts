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
    const resignations = await prisma.resignation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
    })
    return NextResponse.json({ success: true, data: resignations })
  } catch (error) {
    console.error('GET /api/resignations error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const employeeId = token?.employeeId
    if (!employeeId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { reason, intendedLastDay } = body
    if (!intendedLastDay) return NextResponse.json({ success: false, error: 'Intended last day is required' }, { status: 400 })

    const existing = await prisma.resignation.findFirst({ where: { employeeId, status: { notIn: ['COMPLETED', 'REJECTED'] } } })
    if (existing) return NextResponse.json({ success: false, error: 'You already have an active resignation' }, { status: 400 })

    const resignation = await prisma.resignation.create({
      data: { employeeId, reason, intendedLastDay: new Date(intendedLastDay) },
    })
    return NextResponse.json({ success: true, data: resignation })
  } catch (error) {
    console.error('POST /api/resignations error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
