import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const targetModule = await prisma.learningModule.findUnique({ where: { id: params.id } })
    if (!targetModule) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 })
    }

    // Only increment views for actual user requests (not prefetches/crawlers)
    // Use a lightweight approach - increment async without blocking response
    const acceptHeader = request.headers.get('accept') || ''
    if (!acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')) {
      // This appears to be a page navigation, increment views
      prisma.learningModule.update({
        where: { id: params.id },
        data: { views: { increment: 1 } },
      }).catch(() => { /* silent fail */ })
    }

    return NextResponse.json({ success: true, data: targetModule })
  } catch (error) {
    console.error('GET /api/learning/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string
    const userId = token?.sub as string

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateModuleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const updatedModule = await prisma.learningModule.update({
      where: { id: params.id },
      data: parsed.data,
    })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'LEARNING',
        action: 'UPDATE',
        description: `Updated learning module: ${updatedModule.title}`,
        newValue: JSON.stringify({ moduleId: updatedModule.id, ...parsed.data }),
      },
    })

    return NextResponse.json({ success: true, data: updatedModule })
  } catch (error) {
    console.error('PUT /api/learning/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string
    const userId = token?.sub as string

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const targetModule = await prisma.learningModule.findUnique({ where: { id: params.id } })
    if (!targetModule) {
      return NextResponse.json({ success: false, error: 'Module not found' }, { status: 404 })
    }

    await prisma.learningModule.delete({ where: { id: params.id } })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'LEARNING',
        action: 'DELETE',
        description: `Deleted learning module: ${targetModule.title}`,
        oldValue: JSON.stringify({ moduleId: targetModule.id, title: targetModule.title }),
      },
    })

    return NextResponse.json({ success: true, message: 'Module deleted' })
  } catch (error) {
    console.error('DELETE /api/learning/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
