import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'

const updateSettingsSchema = z.object({
  portalUrl: z.string().url().optional().or(z.literal('')),
  apiKey: z.string().optional(),
  deviceIp: z.string().optional(),
  departmentMapping: z.string().optional(),
  autoSyncEnabled: z.boolean().optional(),
  syncInterval: z.number().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await prisma.eSSLSettings.findFirst()

    if (!settings) {
      settings = await prisma.eSSLSettings.create({
        data: {},
      })
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('GET /api/essl/settings error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as string
    const userId = token?.sub as string

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    let settings = await prisma.eSSLSettings.findFirst()

    if (!settings) {
      settings = await prisma.eSSLSettings.create({
        data: parsed.data,
      })
    } else {
      settings = await prisma.eSSLSettings.update({
        where: { id: settings.id },
        data: parsed.data,
      })
    }

    await prisma.auditLog.create({
      data: {
        userId,
        module: 'ESSL',
        action: 'UPDATE_SETTINGS',
        description: 'Updated ESSL settings',
        newValue: JSON.stringify(parsed.data),
      },
    })

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('PUT /api/essl/settings error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
