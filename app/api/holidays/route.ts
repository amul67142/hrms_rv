import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

const createHolidaySchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await getToken({ req: request })

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') || String(new Date().getFullYear())

    const holidays = await prisma.holiday.findMany({
      where: { year: parseInt(year) },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ success: true, data: holidays })
  } catch (error) {
    console.error('GET /api/holidays error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createHolidaySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const holidayDate = new Date(data.date)
    const holidayYear = holidayDate.getFullYear()

    const existing = await prisma.holiday.findFirst({
      where: {
        OR: [
          { date: holidayDate },
          { name: { equals: data.name }, year: holidayYear },
        ],
      },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: 'Holiday with this name or date already exists for this year' }, { status: 400 })
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: data.name,
        date: holidayDate,
        year: holidayYear,
        description: data.description,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'HOLIDAY',
        action: 'CREATE',
        description: `Created holiday: ${data.name} on ${data.date}`,
        newValue: JSON.stringify({ holidayId: holiday.id, name: data.name, date: data.date }),
      },
    })

    return NextResponse.json({ success: true, data: holiday })
  } catch (error) {
    console.error('POST /api/holidays error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
