import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import bcrypt from 'bcryptjs'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role | undefined

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const newPassword = body?.password

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    if (!employee.user) {
      return NextResponse.json({ success: false, error: 'User account not found for this employee' }, { status: 404 })
    }

    // Hash and set the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: employee.user.id },
      data: { password: hashedPassword },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId: params.id,
        module: 'EMPLOYEE',
        action: 'PASSWORD_RESET',
        description: `Password reset for employee ${employee.employeeCode} by admin`,
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: `Password updated for ${employee.firstName} ${employee.lastName}`,
    })
  } catch (error) {
    console.error('POST /api/employees/[id]/reset-password error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
