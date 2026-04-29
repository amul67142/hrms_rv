import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { month: string; year: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const month = parseInt(params.month)
    const year = parseInt(params.year)
    const userId = token?.sub

    const payrollItems = await prisma.payrollItem.findMany({
      where: { month, year },
    })

    if (payrollItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No payroll items found for this month/year' }, { status: 404 })
    }

    await prisma.payrollItem.updateMany({
      where: { month, year },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
        lockedBy: userId,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'PAYROLL',
        action: 'LOCK',
        description: `Locked payroll for ${month}/${year} - ${payrollItems.length} employees`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Payroll for ${month}/${year} locked successfully`,
      data: { month, year, lockedCount: payrollItems.length },
    })
  } catch (error) {
    console.error('POST /api/payroll/lock/[month]/[year] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { month: string; year: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Only admin can unlock payroll' }, { status: 403 })
    }

    const month = parseInt(params.month)
    const year = parseInt(params.year)

    const lockedItems = await prisma.payrollItem.findMany({
      where: { month, year, status: 'LOCKED' },
    })

    if (lockedItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No locked payroll items found for this month/year' }, { status: 404 })
    }

    await prisma.payrollItem.updateMany({
      where: { month, year, status: 'LOCKED' },
      data: {
        status: 'CALCULATED',
        lockedAt: null,
        lockedBy: null,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'PAYROLL',
        action: 'UNLOCK',
        description: `Unlocked payroll for ${month}/${year}`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Payroll for ${month}/${year} unlocked successfully`,
    })
  } catch (error) {
    console.error('DELETE /api/payroll/lock/[month]/[year] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
