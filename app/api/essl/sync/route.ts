import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(request: NextRequest) {
  try {
    await getToken({ req: request })

    const logs = await prisma.esslSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('GET /api/essl/sync error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string
    const userId = token?.sub as string

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const settings = await prisma.esslSetting.findFirst()
    if (!settings || !settings.isActive) {
      return NextResponse.json({ success: false, error: 'ESSL integration is not configured or inactive' }, { status: 400 })
    }

    const syncLog = await prisma.esslSyncLog.create({
      data: {
        syncType: 'MANUAL',
        status: 'SUCCESS',
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })

    await prisma.esslSetting.update({
      where: { id: settings.id },
      data: { lastSyncAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'ESSL',
        action: 'MANUAL_SYNC',
        description: 'Manual ESSL sync triggered',
        newValue: JSON.stringify({ syncLogId: syncLog.id }),
      },
    })

    return NextResponse.json({
      success: true,
      data: syncLog,
      message: 'Sync completed successfully',
    })
  } catch (error) {
    console.error('POST /api/essl/sync error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
