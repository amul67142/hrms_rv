import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'
import { prisma } from '@/lib/core/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const targetModule = await prisma.learningModule.findUnique({ where: { id: params.id } })
    if (!targetModule) return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 })

    const raw = targetModule.enrollmentRequests || '[]'
    const requests = typeof raw === 'string' ? JSON.parse(raw) : (raw as any[])
    const existing = requests.find((r: any) => r.employeeId === token.employeeId)
    if (existing) {
      return NextResponse.json({ success: false, error: 'Request already exists' }, { status: 400 })
    }

    requests.push({
      employeeId: token.employeeId,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    })

    await prisma.learningModule.update({
      where: { id: params.id },
      data: { enrollmentRequests: requests as any }
    })

    return NextResponse.json({ success: true, message: 'Enrollment request submitted' })
  } catch (error) {
    console.error('POST /api/learning/[id]/request error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token || !token.employeeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const targetModule = await prisma.learningModule.findUnique({ where: { id: params.id } })
    if (!targetModule) return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 })

    const raw = targetModule.enrollmentRequests || '[]'
    const requests = typeof raw === 'string' ? JSON.parse(raw) : (raw as any[])
    const myRequest = requests.find((r: any) => r.employeeId === token.employeeId)

    return NextResponse.json({ success: true, data: myRequest || null })
  } catch (error) {
    console.error('GET /api/learning/[id]/request error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { employeeId, action } = body // action: 'APPROVED' | 'REJECTED'

    const targetModule = await prisma.learningModule.findUnique({ where: { id: params.id } })
    if (!targetModule) return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 })

    const raw = targetModule.enrollmentRequests || '[]'
    const requests = typeof raw === 'string' ? JSON.parse(raw) : (raw as any[])
    const idx = requests.findIndex((r: any) => r.employeeId === employeeId)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })

    requests[idx].status = action
    requests[idx].reviewedBy = token.sub
    requests[idx].reviewedAt = new Date().toISOString()

    await prisma.learningModule.update({
      where: { id: params.id },
      data: { enrollmentRequests: requests as any }
    })

    await prisma.auditLog.create({
      data: {
        userId: token.sub,
        module: 'LEARNING',
        action,
        description: `${action} enrollment for employee ${employeeId} on module "${targetModule.title}"`,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/learning/[id]/request error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
