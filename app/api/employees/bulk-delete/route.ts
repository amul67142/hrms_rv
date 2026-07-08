import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'ids array is required' }, { status: 400 })
    }

    const results: { id: string; success: boolean; error?: string }[] = []

    for (const id of ids) {
      try {
        const existing = await prisma.employee.findUnique({ where: { id } })
        if (!existing) {
          results.push({ id, success: false, error: 'Not found' })
          continue
        }

        // --- ADMIN PROTECTION ---
        const targetUser = await prisma.user.findUnique({
          where: { employeeId: id },
          select: { role: true },
        })

        if (targetUser?.role === 'ADMIN') {
          if (userRole !== 'ADMIN') {
            results.push({ id, success: false, error: 'Only an Admin can delete another Admin' })
            continue
          }
          // Prevent deleting yourself
          const callerUser = await prisma.user.findUnique({ where: { id: token?.sub as string }, select: { employeeId: true } })
          if (callerUser?.employeeId === id) {
            results.push({ id, success: false, error: 'You cannot delete your own Admin account' })
            continue
          }
          const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
          const adminsBeingDeleted = ids.filter((delId: string) => delId !== id).length
          if (adminCount - adminsBeingDeleted <= 0 || adminCount <= 1) {
            results.push({ id, success: false, error: 'Cannot delete the last Admin. Create a new Admin first.' })
            continue
          }
        }
        // --- END ADMIN PROTECTION ---

        if (hardDelete) {
          if (userRole !== 'ADMIN') {
            results.push({ id, success: false, error: 'Only admins can permanently delete' })
            continue
          }

          await prisma.$transaction(async (tx) => {
            const users = await tx.user.findMany({ where: { employeeId: id }, select: { id: true } })
            const userIds = users.map(u => u.id)

            if (userIds.length > 0) {
              await tx.loginSession.deleteMany({ where: { userId: { in: userIds } } })
            }
            await tx.user.deleteMany({ where: { employeeId: id } })
            await tx.employee.delete({ where: { id } })
          }, { timeout: 30000 })
        } else {
          // Soft delete
          await prisma.employee.update({
            where: { id },
            data: { status: 'INACTIVE', deletedAt: new Date() },
          })
        }

        results.push({ id, success: true })

        // Audit log (non-blocking)
        prisma.auditLog.create({
          data: {
            userId: token?.sub,
            employeeId: hardDelete ? undefined : id,
            module: 'EMPLOYEE',
            action: 'DELETE',
            description: `${hardDelete ? 'Permanently deleted' : 'Deactivated'} employee ${existing.employeeCode}`,
          },
        }).catch(() => {})

      } catch (err) {
        console.error(`Bulk delete error for id ${id}:`, err)
        results.push({ id, success: false, error: 'Internal error' })
      }
    }

    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: { total: ids.length, succeeded, failed },
      message: hardDelete
        ? `${succeeded} employee(s) permanently deleted${failed > 0 ? `, ${failed} failed` : ''}`
        : `${succeeded} employee(s) deactivated${failed > 0 ? `, ${failed} failed` : ''}`,
    })
  } catch (error) {
    console.error('POST /api/employees/bulk-delete error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
