import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

const DOCUMENT_TYPES = ['AADHAR', 'PAN', 'BANK_PROOF', 'ADDRESS_PROOF', 'EXPERIENCE', 'EDUCATION', 'OTHER'] as const
const DOCUMENT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const

const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  isLocked: z.boolean().optional(),
  rejectionNote: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const userEmployeeId = token?.employeeId as string | null

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.employeeDocument.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: {
            id: true,
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

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
    }

    // Employees can only view their own documents
    if (userRole === 'EMPLOYEE' && document.employeeId !== userEmployeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    console.error('GET /api/documents/[id] error:', error)
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
    const userEmployeeId = token?.employeeId as string | null

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.employeeDocument.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateDocumentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data

    // Status update (verify/reject) � admin/HR only
    if (data.status !== undefined) {
      if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
        return NextResponse.json({ success: false, error: 'Forbidden � only admin/HR can update document status' }, { status: 403 })
      }
      if (existing.isLocked) {
        return NextResponse.json({ success: false, error: 'Cannot change status of a locked document' }, { status: 400 })
      }
      if (data.status === 'VERIFIED') {
        data.isLocked = true
      }
    }

    // Lock/unlock � admin/HR only
    if (data.isLocked !== undefined) {
      if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
        return NextResponse.json({ success: false, error: 'Forbidden � only admin/HR can lock/unlock documents' }, { status: 403 })
      }
    }

    // Title update � employee can update their own unverified/unlocked document
    if (data.title !== undefined) {
      if (userRole === 'EMPLOYEE' && existing.employeeId !== userEmployeeId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      if (existing.isLocked) {
        return NextResponse.json({ success: false, error: 'Cannot update a locked document' }, { status: 400 })
      }
      if (existing.status === 'VERIFIED') {
        return NextResponse.json({ success: false, error: 'Cannot update a verified document' }, { status: 400 })
      }
    }

    // Rejection note
    if (data.rejectionNote !== undefined) {
      if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    const updateData: any = { ...data }
    if (data.status === 'VERIFIED') {
      updateData.verifiedAt = new Date()
      updateData.verifiedBy = userId
    }
    if (data.status === 'REJECTED') {
      updateData.verifiedAt = null
      updateData.verifiedBy = null
    }

    const updated = await prisma.employeeDocument.update({
      where: { id: params.id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
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

    const action = data.status === 'VERIFIED' ? 'VERIFY' : data.status === 'REJECTED' ? 'REJECT' : 'UPDATE'
    await prisma.auditLog.create({
      data: {
        userId,
        employeeId: existing.employeeId,
        module: 'DOCUMENT' as any,
        action: action as any,
        description: `${action} document "${existing.title}" � ${data.status || ''}`,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/documents/[id] error:', error)
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
    const userEmployeeId = token?.employeeId as string | null
    const userId = token?.sub as string

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.employeeDocument.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 })
    }

    // Admin/HR can delete any document
    if (userRole === 'ADMIN' || userRole === 'HR_MANAGER') {
      await prisma.employeeDocument.delete({ where: { id: params.id } })

      await prisma.auditLog.create({
        data: {
          userId,
          employeeId: existing.employeeId,
          module: 'DOCUMENT' as any,
          action: 'DELETE',
          description: `Deleted document "${existing.title}"`,
          oldValue: JSON.stringify(existing),
        },
      })

      return NextResponse.json({ success: true, message: 'Document deleted' })
    }

    // Employee: only delete own documents that are NOT locked and NOT verified
    if (existing.employeeId !== userEmployeeId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (existing.isLocked) {
      return NextResponse.json({ success: false, error: 'Cannot delete a locked document' }, { status: 400 })
    }

    if (existing.status === 'VERIFIED') {
      return NextResponse.json({ success: false, error: 'Cannot delete a verified document' }, { status: 400 })
    }

    await prisma.employeeDocument.delete({ where: { id: params.id } })

    await prisma.auditLog.create({
      data: {
        userId,
        employeeId: existing.employeeId,
        module: 'DOCUMENT' as any,
        action: 'DELETE',
        description: `Deleted document "${existing.title}"`,
        oldValue: JSON.stringify(existing),
      },
    })

    return NextResponse.json({ success: true, message: 'Document deleted' })
  } catch (error) {
    console.error('DELETE /api/documents/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
