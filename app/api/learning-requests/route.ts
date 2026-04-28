import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'

const createRequestSchema = z.object({
  courseName: z.string().min(1),
  reason: z.string().optional(),
  projectRelevance: z.string().optional(),
  skillCategory: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  courseLink: z.string().url().optional().or(z.literal('')),
  expectedBenefit: z.string().optional(),
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

    const requests = await prisma.learningRequest.findMany({
      where,
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeCode: true, department: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    console.error('GET /api/learning-requests error:', error)
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

    const learningRequest = await prisma.learningRequest.create({
      data: {
        employeeId,
        courseName: parsed.data.courseName,
        reason: parsed.data.reason,
        projectRelevance: parsed.data.projectRelevance,
        skillCategory: parsed.data.skillCategory,
        priority: parsed.data.priority,
        courseLink: parsed.data.courseLink,
        expectedBenefit: parsed.data.expectedBenefit,
        status: 'PENDING',
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId,
        module: 'LEARNING',
        action: 'CREATE',
        description: `Requested learning: ${parsed.data.courseName}`,
        newValue: JSON.stringify({ learningRequestId: learningRequest.id }),
      }
    })

    return NextResponse.json({ success: true, data: learningRequest })
  } catch (error) {
    console.error('POST /api/learning-requests error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
