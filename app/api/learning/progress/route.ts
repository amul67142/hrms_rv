import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const employeeId = token?.employeeId as string

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 400 })
    }

    const progress = await prisma.learningProgress.findMany({
      where: { employeeId },
      orderBy: { lastAccessedAt: 'desc' },
    })

    const moduleIds = progress.map(p => p.moduleId)
    const modules = await prisma.learningModule.findMany({
      where: { id: { in: moduleIds } },
    })

    const moduleMap = new Map(modules.map(m => [m.id, m]))
    const data = progress.map(p => ({
      ...p,
      module: moduleMap.get(p.moduleId),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/learning/progress error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
