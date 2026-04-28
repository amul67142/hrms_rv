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

    const tool = await prisma.tool.findUnique({ where: { id: params.id } })
    if (!tool) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const raw = tool.accessRequests || '[]'
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

    await prisma.tool.update({
      where: { id: params.id },
      data: { accessRequests: requests as any }
    })

    return NextResponse.json({ success: true, message: 'Access request submitted' })
  } catch (error) {
    console.error('POST /api/tools/[id]/request error:', error)
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

    const tool = await prisma.tool.findUnique({ where: { id: params.id } })
    if (!tool) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const raw = tool.accessRequests || '[]'
    const requests = typeof raw === 'string' ? JSON.parse(raw) : (raw as any[])
    const myRequest = requests.find((r: any) => r.employeeId === token.employeeId)

    return NextResponse.json({ success: true, data: myRequest || null })
  } catch (error) {
    console.error('GET /api/tools/[id]/request error:', error)
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

    const tool = await prisma.tool.findUnique({ where: { id: params.id } })
    if (!tool) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const raw = tool.accessRequests || '[]'
    const requests = typeof raw === 'string' ? JSON.parse(raw) : (raw as any[])
    const idx = requests.findIndex((r: any) => r.employeeId === employeeId)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 })

    requests[idx].status = action
    requests[idx].reviewedBy = token.sub
    requests[idx].reviewedAt = new Date().toISOString()

    await prisma.tool.update({
      where: { id: params.id },
      data: { accessRequests: requests as any }
    })

    await prisma.auditLog.create({
      data: {
        userId: token.sub,
        module: 'TOOLS',
        action,
        description: `${action} tool access for employee ${employeeId} on tool "${tool.name}"`,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/tools/[id]/request error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
