import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createRequestSchema = z.object({
  toolName: z.string().min(1),
  reason: z.string().min(1),
  projectName: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  requiredByDate: z.string().optional(),
  remarks: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token?.role as string
    const employeeId = token?.employeeId as string

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''

    const where: any = {}
    if (userRole === 'EMPLOYEE') {
      where.employeeId = employeeId
    }
    if (status) where.status = status

    const requests = await prisma.toolRequest.findMany({
      where,
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeCode: true, department: true }
        },
        assignedTool: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error('GET /api/tool-requests error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = token?.employeeId as string
    const body = await request.json()
    const parsed = createRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const toolRequest = await prisma.toolRequest.create({
      data: {
        employeeId,
        toolName: parsed.data.toolName,
        reason: parsed.data.reason,
        projectName: parsed.data.projectName,
        priority: parsed.data.priority,
        requiredByDate: parsed.data.requiredByDate ? new Date(parsed.data.requiredByDate) : null,
        remarks: parsed.data.remarks,
        status: 'PENDING',
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId,
        module: 'TOOL',
        action: 'CREATE',
        description: `Requested tool: ${parsed.data.toolName}`,
        newValue: JSON.stringify({ toolRequestId: toolRequest.id }),
      }
    })

    return NextResponse.json({ success: true, data: toolRequest })
  } catch (error) {
    console.error('POST /api/tool-requests error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
