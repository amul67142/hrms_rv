import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import { encrypt } from '@/lib/core/crypto'
import { maskPassword } from '@/lib/core/crypto'

export const dynamic = 'force-dynamic'

function sanitizeTool(tool: any) {
  const { password, encryptedPassword, ...rest } = tool
  return {
    ...rest,
    password: password ? maskPassword(password) : null,
  }
}

const updateToolSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  username: z.string().optional(),
  password: z.string().optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  isShared: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tool = await prisma.tool.findUnique({ where: { id: params.id } })
    if (!tool) {
      return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: sanitizeTool(tool) })
  } catch (error) {
    console.error('GET /api/tools/[id] error:', error)
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
    const parsed = updateToolSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { password, ...rest } = parsed.data
    const encryptedPassword = password ? encrypt(password) : undefined

    const updateData: any = { ...rest }
    if (encryptedPassword) {
      updateData.encryptedPassword = encryptedPassword
      updateData.password = null // clear old plain text if any
    }

    const tool = await prisma.tool.update({
      where: { id: params.id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'TOOL',
        action: 'UPDATE',
        description: `Updated tool: ${tool.name}`,
        newValue: JSON.stringify({ toolId: tool.id, ...parsed.data }),
      },
    })

    return NextResponse.json({ success: true, data: sanitizeTool(tool) })
  } catch (error) {
    console.error('PUT /api/tools/[id] error:', error)
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

    const tool = await prisma.tool.findUnique({ where: { id: params.id } })
    if (!tool) {
      return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 })
    }

    await prisma.tool.delete({ where: { id: params.id } })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'TOOL',
        action: 'DELETE',
        description: `Deleted tool: ${tool.name}`,
        oldValue: JSON.stringify({ toolId: tool.id, name: tool.name }),
      },
    })

    return NextResponse.json({ success: true, message: 'Tool deleted' })
  } catch (error) {
    console.error('DELETE /api/tools/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
