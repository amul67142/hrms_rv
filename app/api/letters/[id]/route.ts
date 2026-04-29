import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request })
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const userRole = token?.role
    const employeeId = token?.employeeId
    const letter = await prisma.hRLetter.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            department: true,
            designation: true,
            joiningDate: true,
          }
        }
      },
    })
    if (!letter) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (userRole === 'EMPLOYEE' && letter.employeeId !== employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ success: true, data: letter })
  } catch (error) {
    console.error('GET /api/letters/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request })
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const userRole = token?.role
    const employeeId = token?.employeeId
    const body = await request.json()
    const letter = await prisma.hRLetter.findUnique({ where: { id: params.id } })
    if (!letter) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (userRole === 'EMPLOYEE') {
      if (letter.employeeId !== employeeId) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      if (letter.status !== 'ISSUED') return NextResponse.json({ success: false, error: 'Can only respond to issued letters' }, { status: 400 })
      const updated = await prisma.hRLetter.update({
        where: { id: params.id },
        data: { status: body.status, responseAt: new Date() },
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
      return NextResponse.json({ success: true, data: updated })
    }

    if (body.status) {
      const data: any = { status: body.status }
      if (body.status === 'ISSUED' && !letter.issuedAt) data.issuedAt = new Date()
      const updated = await prisma.hRLetter.update({
        where: { id: params.id },
        data,
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
      return NextResponse.json({ success: true, data: updated })
    }

    const { employeeId: _, status: __, ...updateData } = body
    const updated = await prisma.hRLetter.update({
      where: { id: params.id },
      data: updateData,
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
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/letters/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token?.role !== 'ADMIN' && token?.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    await prisma.hRLetter.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/letters/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
