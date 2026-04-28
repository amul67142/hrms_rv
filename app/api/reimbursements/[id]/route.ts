import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

const updateReimbursementSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PAID']).optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const sessionEmployeeId = token?.employeeId as string

    const reimbursement = await prisma.reimbursement.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true,
            email: true,
          },
        },
      },
    })

    if (!reimbursement) {
      return NextResponse.json({ success: false, error: 'Reimbursement not found' }, { status: 404 })
    }

    // Employees can only view their own reimbursements
    if (userRole === 'EMPLOYEE' && reimbursement.employeeId !== sessionEmployeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: reimbursement })
  } catch (error) {
    console.error('GET /api/reimbursements/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const userId = token?.sub as string

    if (userRole === 'EMPLOYEE') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.reimbursement.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Reimbursement not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateReimbursementSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data

    if (data.status === 'APPROVED' || data.status === 'REJECTED' || data.status === 'PAID') {
      if (existing.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Can only update status of pending reimbursements' },
          { status: 400 }
        )
      }

      const updated = await prisma.reimbursement.update({
        where: { id: params.id },
        data: {
          status: data.status,
          notes: data.notes || existing.notes,
          reviewedAt: new Date(),
          reviewedBy: userId,
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
          employeeId: existing.employeeId,
          module: 'REIMBURSEMENT',
          action: data.status === 'APPROVED' ? 'APPROVE' : data.status === 'REJECTED' ? 'REJECT' : 'PAY',
          description: `${data.status} reimbursement request "${existing.title}" for ${existing.amount}`,
          oldValue: JSON.stringify({ status: existing.status }),
          newValue: JSON.stringify({ status: data.status, notes: data.notes }),
        },
      })

      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, error: 'No valid update provided' }, { status: 400 })
  } catch (error) {
    console.error('PATCH /api/reimbursements/[id] error:', error)
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
    const sessionEmployeeId = token?.employeeId as string
    const userId = token?.sub as string

    const existing = await prisma.reimbursement.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Reimbursement not found' }, { status: 404 })
    }

    // Employee can cancel their own PENDING reimbursement
    if (userRole === 'EMPLOYEE') {
      if (existing.employeeId !== sessionEmployeeId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      if (existing.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'Can only cancel pending reimbursements' },
          { status: 400 }
        )
      }
    }

    // Admin can delete any reimbursement
    await prisma.reimbursement.delete({
      where: { id: params.id },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        employeeId: existing.employeeId,
        module: 'REIMBURSEMENT',
        action: 'DELETE',
        description: `Deleted reimbursement request "${existing.title}" for ${existing.amount}`,
        oldValue: JSON.stringify({ status: existing.status, amount: existing.amount }),
      },
    })

    return NextResponse.json({ success: true, message: 'Reimbursement deleted' })
  } catch (error) {
    console.error('DELETE /api/reimbursements/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
