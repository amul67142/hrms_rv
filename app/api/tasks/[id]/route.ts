import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = token.employeeId as string | null
    const userRole = token.role as string

    const body = await request.json()
    const { status, title, description, priority, dueDate } = body

    const existing = await prisma.task.findUnique({
      where: { id: params.id },
      include: { assignee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    // Employees can only update status on their own tasks
    if (userRole === 'EMPLOYEE') {
      if (existing.assignedTo !== employeeId) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      if (!status) {
        return NextResponse.json({ success: false, error: 'Employees can only update task status' }, { status: 403 })
      }
    }

    const updateData: any = {}
    if (status) {
      updateData.status = status
      if (status === 'COMPLETED') updateData.completedAt = new Date()
      if (status !== 'COMPLETED') updateData.completedAt = null
    }

    const isAdminOrHR = userRole === 'ADMIN' || userRole === 'HR_MANAGER'
    if (title !== undefined && isAdminOrHR) updateData.title = title.trim()
    if (description !== undefined && isAdminOrHR) updateData.description = description?.trim() || null
    if (priority !== undefined && isAdminOrHR) updateData.priority = priority
    if (dueDate !== undefined && isAdminOrHR) updateData.dueDate = dueDate ? new Date(dueDate) : null

    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    })

    // If admin changed status, notify the employee
    if (isAdminOrHR && status && status !== existing.status) {
      const statusMsg: Record<string, string> = {
        PENDING: 'set back to Pending',
        IN_PROGRESS: 'marked as In Progress',
        COMPLETED: 'marked as Completed ✅',
        CANCELLED: 'cancelled ❌',
      }
      await prisma.notification.create({
        data: {
          employeeId: existing.assignedTo,
          title: `Task status updated: ${existing.title}`,
          message: `Your task "${existing.title}" has been ${statusMsg[status] || status} by an admin.`,
          type: 'TASK',
          link: '/employee/tasks',
        },
      }).catch((_e) => { })
    }

    // If employee completed a task, notify admin
    if (userRole === 'EMPLOYEE' && status === 'COMPLETED') {
      await prisma.notification.create({
        data: {
          employeeId: null,
          title: `Task completed: ${existing.title}`,
          message: `${existing.assignee.firstName} ${existing.assignee.lastName} (${existing.assignee.employeeCode}) marked "${existing.title}" as completed.`,
          type: 'TASK',
          link: '/admin/tasks',
        },
      }).catch((_e) => { })
    }

    return NextResponse.json({ success: true, data: task })
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token.role as string
    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.task.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({ where: { id: params.id } })

    // Notify the employee their task was removed
    if (existing.assignedTo) {
      await prisma.notification.create({
        data: {
          employeeId: existing.assignedTo,
          title: `Task removed: ${existing.title}`,
          message: `The task "${existing.title}" assigned to you has been removed by an admin.`,
          type: 'TASK',
          link: '/employee/tasks',
        },
      }).catch(() => { })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
