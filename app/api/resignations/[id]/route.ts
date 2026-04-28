import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role
    if (!token || (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { status, reviewNotes, actualLastDay } = body
    const updateData: any = { status, reviewedBy: token?.sub, reviewedAt: new Date() }
    if (reviewNotes) updateData.reviewNotes = reviewNotes
    if (actualLastDay) updateData.actualLastDay = new Date(actualLastDay)

    const resignation = await prisma.resignation.update({ where: { id: params.id }, data: updateData })
    return NextResponse.json({ success: true, data: resignation })
  } catch (error) {
    console.error('PATCH /api/resignations/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
