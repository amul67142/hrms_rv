import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = token.employeeId as string
    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee profile not linked to this account' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

    const where: Record<string, unknown> = { employeeId }
    if (year) where.year = year

    const data = await prisma.payrollItem.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/salary-slips/me error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
