import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

const updateHolidaySchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  description: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const holiday = await prisma.holiday.findUnique({ where: { id: params.id } })

    if (!holiday) {
      return NextResponse.json({ success: false, error: 'Holiday not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: holiday })
  } catch (error) {
    console.error('GET /api/holidays/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.holiday.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Holiday not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateHolidaySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const updateData: any = { ...data }
    if (data.date) {
      updateData.date = new Date(data.date)
      updateData.year = updateData.date.getFullYear()
    }

    const updated = await prisma.holiday.update({
      where: { id: params.id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'HOLIDAY',
        action: 'UPDATE',
        description: `Updated holiday ${params.id}`,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PUT /api/holidays/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.holiday.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Holiday not found' }, { status: 404 })
    }

    await prisma.holiday.delete({ where: { id: params.id } })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'HOLIDAY',
        action: 'DELETE',
        description: `Deleted holiday: ${existing.name}`,
        oldValue: JSON.stringify(existing),
      },
    })

    return NextResponse.json({ success: true, message: 'Holiday deleted' })
  } catch (error) {
    console.error('DELETE /api/holidays/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
