import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userRole = token?.role
    const employeeId = token?.employeeId
    const where = (userRole === 'ADMIN' || userRole === 'HR_MANAGER')
      ? {}
      : { employeeId: employeeId as string }
    const letters = await prisma.hRLetter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            designation: true,
            joiningDate: true,
            email: true,
          }
        }
      },
    })
    return NextResponse.json({ success: true, data: letters })
  } catch (error) {
    console.error('GET /api/letters error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token?.role !== 'ADMIN' && token?.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { employeeId, type, title, content, status } = body

    if (!type || !title) {
      return NextResponse.json({ success: false, error: 'Missing required fields: type and title are required' }, { status: 400 })
    }

    const letterData: any = {
      type,
      title,
      content: content || null,
      status: status || 'DRAFT',
      createdBy: token?.sub || 'admin',
    }

    if (employeeId && employeeId !== 'none') {
      letterData.employeeId = employeeId
      if (status === 'ISSUED') {
        letterData.issuedAt = new Date()
      }
    }

    const letter = await prisma.hRLetter.create({
      data: letterData,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            designation: true,
            joiningDate: true,
          }
        }
      },
    })
    return NextResponse.json({ success: true, data: letter })
  } catch (error) {
    console.error('POST /api/letters error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
