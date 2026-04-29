import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'
import { sendLeaveApprovalEmail } from '@/lib/services/mail'

export const dynamic = 'force-dynamic'

const updateLeaveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  remarks: z.string().optional(),
  approvedBy: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getToken({ req: request })

    const leaveRequest = await prisma.leaveRequest.findUnique({
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
          },
        },
      },
    })

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: leaveRequest })
  } catch (error) {
    console.error('GET /api/leave/[id] error:', error)
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
    const sessionEmployeeId = token?.employeeId as string
    const userId = token?.sub as string

    const existing = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateLeaveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const year = existing.startDate.getFullYear()

    if (data.status === 'CANCELLED') {
      if (userRole === 'EMPLOYEE' && existing.employeeId !== sessionEmployeeId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      if (existing.status !== 'PENDING') {
        return NextResponse.json({ success: false, error: 'Can only cancel pending requests' }, { status: 400 })
      }

      if (existing.leaveType !== 'UNPAID' && existing.leaveType !== 'COMPENSATORY') {
        await prisma.leaveBalance.updateMany({
          where: {
            employeeId: existing.employeeId,
            leaveType: existing.leaveType,
            year,
          },
          data: { pending: { decrement: existing.totalDays } },
        })
      }

      const updated = await prisma.leaveRequest.update({
        where: { id: params.id },
        data: { status: 'CANCELLED', remarks: data.remarks || existing.remarks },
        include: { employee: true },
      })

      await prisma.auditLog.create({
        data: {
          userId,
          employeeId: existing.employeeId,
          module: 'LEAVE',
          action: 'CANCEL',
          description: `Cancelled leave request ${params.id}`,
        },
      })

      return NextResponse.json({ success: true, data: updated })
    }

    if (data.status === 'APPROVED' || data.status === 'REJECTED') {
      if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      if (existing.status !== 'PENDING') {
        return NextResponse.json({ success: false, error: 'Can only approve/reject pending requests' }, { status: 400 })
      }

      const updateData: any = {
        status: data.status,
        approvedBy: userId,
        approvedAt: new Date(),
        remarks: data.remarks || existing.remarks,
      }

      if (data.status === 'APPROVED' && existing.leaveType !== 'UNPAID' && existing.leaveType !== 'COMPENSATORY') {
        await prisma.$transaction([
          prisma.leaveBalance.update({
            where: {
              employeeId_leaveType_year: {
                employeeId: existing.employeeId,
                leaveType: existing.leaveType,
                year,
              },
            },
            data: {
              taken: { increment: existing.totalDays },
              pending: { decrement: existing.totalDays },
              available: { decrement: existing.totalDays },
            },
          }),
          prisma.leaveRequest.update({
            where: { id: params.id },
            data: updateData,
            include: { employee: true },
          }),
        ])
      } else {
        if (existing.leaveType !== 'UNPAID' && existing.leaveType !== 'COMPENSATORY') {
          await prisma.leaveBalance.update({
            where: {
              employeeId_leaveType_year: {
                employeeId: existing.employeeId,
                leaveType: existing.leaveType,
                year,
              },
            },
            data: { pending: { decrement: existing.totalDays } },
          })
        }

        await prisma.leaveRequest.update({
          where: { id: params.id },
          data: updateData,
        })
      }

      const updated = await prisma.leaveRequest.findUnique({
        where: { id: params.id },
        include: { employee: true },
      })

      await prisma.auditLog.create({
        data: {
          userId,
          employeeId: existing.employeeId,
          module: 'LEAVE',
          action: data.status === 'APPROVED' ? 'APPROVE' : 'REJECT',
          description: `${data.status} leave request ${params.id} for ${existing.employee.employeeCode}`,
          newValue: JSON.stringify({ status: data.status, remarks: data.remarks }),
        },
      })

      // Send email notification
      const employeeEmail = updated?.employee?.email || ''
      const employeeName = `${updated?.employee?.firstName || ''} ${updated?.employee?.lastName || ''}`.trim()
      if (employeeEmail) {
        sendLeaveApprovalEmail(
          employeeEmail,
          employeeName,
          existing.leaveType,
          data.status as 'APPROVED' | 'REJECTED',
          existing.startDate.toISOString().split('T')[0],
          existing.endDate.toISOString().split('T')[0],
          data.remarks
        ).catch(() => { /* silently ignore email failures */ })
      }

      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, error: 'No valid update provided' }, { status: 400 })
  } catch (error) {
    console.error('PUT /api/leave/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
