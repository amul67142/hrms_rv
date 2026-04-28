import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token.role as string
    const employeeId = token.employeeId as string | null

    // Employees see only their own tasks, admin/HR see all
    const where = (userRole === 'ADMIN' || userRole === 'HR_MANAGER')
      ? {}
      : { assignedTo: employeeId as string }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: {
          select: { firstName: true, lastName: true, department: true, employeeCode: true }
        },
        department: true,
      },
    })
    return NextResponse.json({ success: true, data: tasks })
  } catch (error) {
    console.error('GET /api/tasks error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token.role as string
    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, assignedTo, departmentId, priority, dueDate } = body

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }
    if (!assignedTo) {
      return NextResponse.json({ success: false, error: 'Assignee is required' }, { status: 400 })
    }

    // Verify the assignee exists
    const assignee = await prisma.employee.findUnique({
      where: { id: assignedTo },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    })
    if (!assignee) {
      return NextResponse.json({ success: false, error: 'Assignee employee not found' }, { status: 400 })
    }

    // assignedBy = the admin's own employeeId (if they have one) or their userId
    const assignedBy = (token.employeeId as string | null) || (token.sub as string)

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        assignedTo,
        assignedBy,
        departmentId: departmentId || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    })

    // Send notification to the assigned employee
    const priorityEmoji: Record<string, string> = {
      LOW: '📋', MEDIUM: '📌', HIGH: '⚡', URGENT: '🚨',
    }
    await prisma.notification.create({
      data: {
        employeeId: assignedTo,
        title: `${priorityEmoji[priority || 'MEDIUM']} New task assigned: ${title.trim()}`,
        message: `You have been assigned a new ${(priority || 'MEDIUM').toLowerCase()} priority task${dueDate ? ` due on ${new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}.${description ? ` "${description.trim().slice(0, 80)}${description.length > 80 ? '...' : ''}"` : ''}`,
        type: 'TASK',
        link: '/employee/tasks',
      },
    }).catch(err => console.error('Failed to send task notification:', err))

    // Admin broadcast notification too
    await prisma.notification.create({
      data: {
        employeeId: null,
        title: `Task assigned to ${assignee.firstName} ${assignee.lastName}`,
        message: `"${title.trim()}" (${priority || 'MEDIUM'}) was assigned to ${assignee.firstName} ${assignee.lastName} (${assignee.employeeCode}).`,
        type: 'TASK',
        link: '/admin/tasks',
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, data: task })
  } catch (error) {
    console.error('POST /api/tasks error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
