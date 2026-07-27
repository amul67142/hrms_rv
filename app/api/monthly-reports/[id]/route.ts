import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const report = await prisma.monthlyReport.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            designation: true,
            email: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }

    // Employees can only view their own reports
    if (token.role === 'EMPLOYEE' && report.employeeId !== token.employeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    console.error('GET /api/monthly-reports/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const report = await prisma.monthlyReport.findUnique({
      where: { id: params.id },
    })

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }

    const body = await request.json()

    // Admin/HR can review reports
    if (token.role === 'ADMIN' || token.role === 'HR_MANAGER' || token.role === 'MANAGER') {
      const { status, reviewNotes } = body

      if (status && (status === 'REVIEWED' || status === 'NEEDS_REVISION')) {
        const updated = await prisma.monthlyReport.update({
          where: { id: params.id },
          data: {
            status,
            reviewedBy: token.employeeId || token.sub,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        })
        return NextResponse.json({ success: true, data: updated })
      }
    }

    // Employee can edit their own report only if it's still in SUBMITTED or NEEDS_REVISION status
    if (token.role === 'EMPLOYEE') {
      if (report.employeeId !== token.employeeId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      if (report.status !== 'SUBMITTED' && report.status !== 'NEEDS_REVISION') {
        return NextResponse.json({ success: false, error: 'Cannot edit a reviewed report' }, { status: 400 })
      }

      const { title, content, highlights, challenges, nextMonthPlan } = body
      const updated = await prisma.monthlyReport.update({
        where: { id: params.id },
        data: {
          title: title || report.title,
          content: content || report.content,
          highlights: highlights !== undefined ? highlights : report.highlights,
          challenges: challenges !== undefined ? challenges : report.challenges,
          nextMonthPlan: nextMonthPlan !== undefined ? nextMonthPlan : report.nextMonthPlan,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('PUT /api/monthly-reports/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
