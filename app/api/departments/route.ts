import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

// GET — list all departments
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: true } },
      },
    })

    return NextResponse.json({ success: true, data: departments })
  } catch (error) {
    console.error('GET /api/departments error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a new department
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const role = token?.role as string
    if (role !== 'ADMIN' && role !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { name, description } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Department name is required' }, { status: 400 })
    }

    const existing = await prisma.department.findFirst({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Department already exists' }, { status: 400 })
    }

    // Auto-generate a code from the name
    const code = name.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code,
        description: description?.trim() || null,
      },
    })

    return NextResponse.json({ success: true, data: department })
  } catch (error) {
    console.error('POST /api/departments error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
