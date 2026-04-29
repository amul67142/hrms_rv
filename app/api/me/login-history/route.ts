import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.sub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { prisma } = await import('@/lib/core/db')
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [sessions, total] = await Promise.all([
      prisma.loginSession.findMany({
        where: { userId: token.sub },
        orderBy: { loginAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loginSession.count({ where: { userId: token.sub } }),
    ])

    return NextResponse.json({
      success: true,
      data: sessions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('GET /api/me/login-history error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
