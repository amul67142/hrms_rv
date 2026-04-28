import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { Role } from '@/types'

// In-memory store for reset tokens (expires in 15 minutes)
const resetTokens = new Map<string, { employeeId: string; userId: string; expiresAt: number }>()

function cleanupExpiredTokens() {
  const now = Date.now()
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now) {
      resetTokens.delete(token)
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    cleanupExpiredTokens()

    const token = await getToken({ req: request })
    const userRole = token?.role as Role | undefined

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
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

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('base64url')
    const expiresAt = Date.now() + 15 * 60 * 1000 // 15 minutes

    resetTokens.set(resetToken, {
      employeeId: params.id,
      userId: employee.user.id,
      expiresAt,
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId: params.id,
        module: 'EMPLOYEE',
        action: 'PASSWORD_RESET_TOKEN',
        description: `Password reset token generated for employee ${employee.employeeCode}`,
      },
    })

    // In production, send this token via email
    // For now, return the token to be shared securely through a different channel
    return NextResponse.json({
      success: true,
      message: 'Password reset token generated. Share the token securely with the employee.',
      // NOTE: In production, send via email instead of returning in response
      // The employee should use /api/auth/set-password with this token
      resetToken,
    })
  } catch (error) {
    console.error('POST /api/employees/[id]/reset-password error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
