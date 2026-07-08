import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/core/db'

export const dynamic = 'force-dynamic'

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return '127.0.0.1'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = String(body?.token || '').trim()
    const password = String(body?.password || '')

    if (!token) {
      return NextResponse.json({ success: false, error: 'Reset token is required' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    // Find the user with a valid, non-expired reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // Hash the new password using bcryptjs with 12 salt rounds (as done in seeding)
    const passwordHash = await bcrypt.hash(password, 12)

    // Update user password and clear token columns
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    // Create Audit Log
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        employeeId: user.employeeId || undefined,
        module: 'AUTH',
        action: 'PASSWORD_RESET',
        description: `Password reset successfully via email token from IP ${ipAddress}`,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Your password has been successfully reset.',
    })
  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
