import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { cached, TTL } from '@/lib/core/cache'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    // Active-employee dropdown list — used by many pages, changes at most a few
    // times a day. 1m cache keeps dropdowns snappy without going stale.
    const employees = await cached('employees:activeList', TTL.medium, () =>
      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true, designation: true },
        orderBy: { firstName: 'asc' },
      })
    )
    return NextResponse.json({ success: true, data: employees })
  } catch (error) {
    console.error('GET /api/employees/list error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
