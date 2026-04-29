import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token || token?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const settings = await prisma.smtpSetting.findFirst()
    if (settings && settings.password) {
      settings.password = '********'
    }
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || token?.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { host, port, secure, username, password, fromEmail, fromName, enabled } = body
    const existing = await prisma.smtpSetting.findFirst()
    const data = {
      host,
      port,
      secure,
      username,
      password: password === '********' ? existing?.password : password,
      fromEmail,
      fromName,
      enabled,
    }
    if (existing) {
      await prisma.smtpSetting.update({ where: { id: existing.id }, data })
    } else {
      await prisma.smtpSetting.create({ data })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
