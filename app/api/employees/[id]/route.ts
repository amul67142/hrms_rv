import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

// GET — fetch single employee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        salaryStructures: {
          where: { isActive: true },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
        leaveBalances: { where: { year: new Date().getFullYear() } },
      },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    console.error('GET /api/employees/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — update employee (status change, profile update, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Build update data — only include fields that are provided
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'employeeCode', 'esslCode', 'firstName', 'lastName', 'fatherName', 'email', 'phone',
      'department', 'designation', 'employmentType', 'status', 'gender',
      'dateOfBirth', 'maritalStatus', 'address', 'city', 'state', 'pincode',
      'emergencyContactName', 'emergencyContactPhone',
      'panNumber', 'aadhaarNumber', 'pfNumber', 'uanNumber', 'esiNumber',
      'bankName', 'accountNumber', 'ifscCode',
      'profileCompleted',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Handle date fields
    if (body.dateOfBirth) {
      updateData.dateOfBirth = new Date(body.dateOfBirth)
    } else if (body.dateOfBirth === '' || body.dateOfBirth === null) {
      updateData.dateOfBirth = null
    }

    if (body.joiningDate) {
      updateData.joiningDate = new Date(body.joiningDate)
    }

    // If status changed to INACTIVE/TERMINATED/RESIGNED, set deletedAt
    if (body.status && ['INACTIVE', 'TERMINATED', 'RESIGNED'].includes(body.status)) {
      updateData.deletedAt = new Date()
    } else if (body.status === 'ACTIVE') {
      updateData.deletedAt = null
    }

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, role: true } },
      },
    })

    // If role is being updated, only allow ADMIN or HR_MANAGER to change it
    if (body.role && body.role !== employee.user?.role) {
      const userRole = token.role as Role
      if (userRole === 'ADMIN' || userRole === 'HR_MANAGER') {
        await prisma.user.update({
          where: { employeeId: params.id },
          data: { role: body.role }
        })
        // Update the returned object to reflect the new role
        if (employee.user) {
          employee.user.role = body.role
        }
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: token.sub as string,
        employeeId: params.id,
        module: 'EMPLOYEE',
        action: 'UPDATE',
        description: `Updated employee ${employee.employeeCode}`,
        newValue: JSON.stringify(updateData),
      },
    }).catch((_e) => {})

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    console.error('PATCH /api/employees/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — soft delete (set inactive) or hard delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const role = token?.role as Role
    if (role !== 'ADMIN' && role !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const hard = searchParams.get('hard') === 'true'

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    // --- ADMIN PROTECTION ---
    // Check if the target employee is an ADMIN
    const targetUser = await prisma.user.findUnique({
      where: { employeeId: params.id },
      select: { role: true },
    })

    if (targetUser?.role === 'ADMIN') {
      // Only ADMIN can delete another ADMIN
      if (role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Only an Admin can delete another Admin account' },
          { status: 403 }
        )
      }

      // Prevent deleting yourself
      if (token?.sub && (await prisma.user.findUnique({ where: { id: token.sub as string }, select: { employeeId: true } }))?.employeeId === params.id) {
        return NextResponse.json(
          { success: false, error: 'You cannot delete your own Admin account' },
          { status: 403 }
        )
      }

      // Ensure at least one ADMIN remains after deletion
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the last Admin. Create a new Admin before deleting this one.' },
          { status: 403 }
        )
      }
    }
    // --- END ADMIN PROTECTION ---

    if (hard) {
      // Hard delete — database cascade will remove all related data
      await prisma.$transaction(async (tx) => {
        const users = await tx.user.findMany({ where: { employeeId: params.id }, select: { id: true } })
        if (users.length > 0) {
          await tx.loginSession.deleteMany({ where: { userId: { in: users.map(u => u.id) } } })
        }
        await tx.user.deleteMany({ where: { employeeId: params.id } })
        await tx.employee.delete({ where: { id: params.id } })
      }, { timeout: 30000 })
    } else {
      // Soft delete — mark as inactive
      await prisma.employee.update({
        where: { id: params.id },
        data: { status: 'INACTIVE', deletedAt: new Date() },
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: token?.sub as string,
        employeeId: hard ? undefined : params.id,
        module: 'EMPLOYEE',
        action: 'DELETE',
        description: `${hard ? 'Hard' : 'Soft'} deleted employee ${employee.employeeCode} - ${employee.firstName} ${employee.lastName}`,
      },
    }).catch((_e) => {})

    return NextResponse.json({ success: true, message: hard ? 'Employee permanently deleted' : 'Employee deactivated' })
  } catch (error) {
    console.error('DELETE /api/employees/[id] error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
