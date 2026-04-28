import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'

const createModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.string().optional(),
  isFeatured: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const userRole = token?.role as string

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''

    const where: any = {}

    if (userRole === 'EMPLOYEE') {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }
    if (category) where.category = category

    const modules = await prisma.learningModule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: modules })
  } catch (error) {
    console.error('GET /api/learning error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string
    const userId = token?.sub as string

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createModuleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const createdModule = await prisma.learningModule.create({
      data: {
        ...parsed.data,
        createdBy: userId || 'system',
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'LEARNING',
        action: 'CREATE',
        description: `Created learning module: ${createdModule.title}`,
        newValue: JSON.stringify({ moduleId: createdModule.id, title: createdModule.title }),
      },
    })

    return NextResponse.json({ success: true, data: createdModule })
  } catch (error) {
    console.error('POST /api/learning error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
