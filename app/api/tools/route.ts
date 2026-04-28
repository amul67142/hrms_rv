import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import { encrypt } from '@/lib/core/crypto'
import { maskPassword } from '@/lib/core/crypto'

const createToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().default('OTHER'),
  url: z.string().url().optional().or(z.literal('')),
  username: z.string().optional(),
  password: z.string().optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  isShared: z.boolean().default(false),
})

function sanitizeTool(tool: any) {
  const { password, encryptedPassword, ...rest } = tool
  // Return masked password — never expose plain text
  return {
    ...rest,
    password: password ? maskPassword(password) : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const type = searchParams.get('type') || ''

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ]
    }
    if (category) where.category = category
    if (type) where.type = type

    if (userRole === 'EMPLOYEE') {
      where.isShared = true
    }

    const tools = await prisma.tool.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    const sanitized = tools.map(sanitizeTool)
    return NextResponse.json({ success: true, data: sanitized })
  } catch (error) {
    console.error('GET /api/tools error:', error)
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
    const parsed = createToolSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { password, ...rest } = parsed.data
    const encryptedPassword = password ? encrypt(password) : null

    const tool = await prisma.tool.create({
      data: {
        ...rest,
        password: null,
        encryptedPassword,
        createdBy: userId || 'system',
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'TOOL',
        action: 'CREATE',
        description: `Created tool: ${tool.name}`,
        newValue: JSON.stringify({ toolId: tool.id, name: tool.name }),
      },
    })

    return NextResponse.json({ success: true, data: sanitizeTool(tool) })
  } catch (error) {
    console.error('POST /api/tools error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
