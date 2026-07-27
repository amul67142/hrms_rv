import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { cached, invalidate, TTL } from '@/lib/core/cache'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

const COMPANY_SETTINGS_CACHE_KEY = 'company:settings'

export async function GET() {
  try {
    // Company settings are read on nearly every page but change almost never.
    const data = await cached(COMPANY_SETTINGS_CACHE_KEY, TTL.long, async () => {
      let settings = await prisma.companySetting.findFirst()

      if (!settings) {
        settings = await prisma.companySetting.create({
        data: {
          companyName: 'My Company',
          workingDaysPerWeek: 5,
          shiftStartTime: '09:00',
          shiftEndTime: '18:00',
          halfDayHours: 4,
          monthlyLeaveEntitlement: 1,
          pfRate: 12,
          esiRate: 0.75,
          professionalTaxRate: 200,
          tdsRate: 10,
          leaveEncashmentRate: 30,
          },
        })
      }

      return settings
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('GET /api/company-settings error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    const existing = await prisma.companySetting.findFirst()

    let updated
    if (existing) {
      updated = await prisma.companySetting.update({
        where: { id: existing.id },
        data: body,
      })
    } else {
      updated = await prisma.companySetting.create({
        data: {
          companyName: body.companyName || 'My Company',
          ...body,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'SETTINGS',
        action: 'UPDATE',
        description: 'Updated company settings',
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(body),
      },
    })

    invalidate(COMPANY_SETTINGS_CACHE_KEY)
    invalidate('settings:salarySlip') // same underlying companySetting row

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PUT /api/company-settings error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
