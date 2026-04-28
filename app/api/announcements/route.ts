import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { sendNoticeEmail } from '@/lib/services/mail'

export async function GET(_request: NextRequest) {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: announcements })
  } catch (error) {
    console.error('GET /api/announcements error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role
    if (!token || (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, content, type, priority, sendEmail } = body

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'GENERAL',
        priority: priority || 'NORMAL',
        createdBy: token?.sub || 'admin',
        sentEmail: false,
      },
    })

    // Send email notifications to all active employees
    if (sendEmail) {
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { email: true },
      })
      const emails = employees.map(e => e.email).filter(Boolean)
      if (emails.length > 0) {
        const sent = await sendNoticeEmail(emails, title, content)
        await prisma.announcement.update({
          where: { id: announcement.id },
          data: { sentEmail: true },
        })
        console.log(`Email sent to ${sent} employees`) // informational only, not a security concern
      }
    }

    return NextResponse.json({ success: true, data: announcement })
  } catch (error) {
    console.error('POST /api/announcements error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
