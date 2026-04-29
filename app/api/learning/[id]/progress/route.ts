import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const progressSchema = z.object({
  progress: z.number().min(0).max(100),
  isCompleted: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userId = token?.sub as string
    const employeeId = token?.employeeId as string

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 400 })
    }

    const progress = await prisma.learningProgress.findUnique({
      where: {
        employeeId_moduleId: {
          employeeId,
          moduleId: params.id,
        },
      },
    })

    return NextResponse.json({ success: true, data: progress })
  } catch (error) {
    console.error('GET /api/learning/[id]/progress error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userId = token?.sub as string
    const employeeId = token?.employeeId as string

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = progressSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const progress = await prisma.learningProgress.upsert({
      where: {
        employeeId_moduleId: {
          employeeId,
          moduleId: params.id,
        },
      },
      create: {
        employeeId,
        moduleId: params.id,
        progress: parsed.data.progress,
        isCompleted: parsed.data.isCompleted || parsed.data.progress >= 100,
        completedAt: parsed.data.isCompleted || parsed.data.progress >= 100 ? new Date() : null,
        lastAccessedAt: new Date(),
      },
      update: {
        progress: parsed.data.progress,
        isCompleted: parsed.data.isCompleted || parsed.data.progress >= 100,
        completedAt: parsed.data.isCompleted || parsed.data.progress >= 100 ? new Date() : undefined,
        lastAccessedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: progress })
  } catch (error) {
    console.error('POST /api/learning/[id]/progress error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
