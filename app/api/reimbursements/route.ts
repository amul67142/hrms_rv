import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

const createReimbursementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  category: z.enum(['TRAVEL', 'MEALS', 'EQUIPMENT', 'MEDICAL', 'OTHER']),
  receiptUrl: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    const employeeId = searchParams.get('employeeId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const where: any = {}

    // Role-based filtering: employees see only their own, admins see all
    if (userRole === 'EMPLOYEE') {
      where.employeeId = sessionEmployeeId
    } else if (employeeId) {
      where.employeeId = employeeId
    }

    if (status) where.status = status
    if (category) where.category = category

    if (startDate && endDate) {
      where.submittedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const [total, data] = await Promise.all([
      prisma.reimbursement.count({ where }),
      prisma.reimbursement.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
              designation: true,
              user: { select: { email: true } },
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Compute stats for admin view
    let stats: any = null
    if (userRole !== 'EMPLOYEE') {
      const [totalCount, pendingCount, approvedCount, rejectedCount, paidCount] = await Promise.all([
        prisma.reimbursement.count(),
        prisma.reimbursement.count({ where: { status: 'PENDING' } }),
        prisma.reimbursement.count({ where: { status: 'APPROVED' } }),
        prisma.reimbursement.count({ where: { status: 'REJECTED' } }),
        prisma.reimbursement.count({ where: { status: 'PAID' } }),
      ])
      stats = {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        paid: paidCount,
      }
    }

    return NextResponse.json({
      success: true,
      data,
      stats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/reimbursements error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const sessionEmployeeId = token?.employeeId as string
    const userId = token?.sub as string

    if (!sessionEmployeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createReimbursementSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data

    const reimbursement = await prisma.reimbursement.create({
      data: {
        employeeId: sessionEmployeeId,
        title: data.title,
        description: data.description,
        amount: data.amount,
        category: data.category,
        receiptUrl: data.receiptUrl,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        employeeId: sessionEmployeeId,
        module: 'REIMBURSEMENT',
        action: 'CREATE',
        description: `Submitted reimbursement request: ${data.title} for ${data.amount}`,
        newValue: JSON.stringify({ reimbursementId: reimbursement.id, category: data.category, amount: data.amount }),
      },
    })

    return NextResponse.json({ success: true, data: reimbursement }, { status: 201 })
  } catch (error) {
    console.error('POST /api/reimbursements error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
