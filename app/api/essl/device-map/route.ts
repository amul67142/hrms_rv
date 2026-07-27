import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'

export const dynamic = 'force-dynamic'

/**
 * GET /api/essl/device-map — List all device-user-to-employee mappings
 *
 * Query params:
 *   - deviceSn: filter by device (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const deviceSn = request.nextUrl.searchParams.get('deviceSn') || undefined
    const where: any = {}
    if (deviceSn) where.deviceSn = deviceSn

    const mappings = await prisma.deviceUserMap.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            designation: true,
            profileImage: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: mappings.map(m => ({
        id: m.id,
        deviceSn: m.deviceSn,
        deviceUserId: m.deviceUserId,
        employeeId: m.employeeId,
        employee: {
          id: m.employee.id,
          name: `${m.employee.firstName} ${m.employee.lastName}`,
          code: m.employee.employeeCode,
          department: m.employee.department,
          designation: m.employee.designation,
          profileImage: m.employee.profileImage,
        },
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    })
  } catch (error) {
    console.error('GET /api/essl/device-map error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/essl/device-map — Create a new device-user mapping
 *
 * Body: { deviceSn, deviceUserId, employeeId }
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || (token.role !== 'ADMIN' && token.role !== 'HR_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { deviceSn, deviceUserId, employeeId } = body

    if (!deviceSn || !deviceUserId || !employeeId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: deviceSn, deviceUserId, employeeId',
      }, { status: 400 })
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    // Check for existing mapping
    const existing = await prisma.deviceUserMap.findUnique({
      where: { deviceSn_deviceUserId: { deviceSn, deviceUserId } },
    })
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Device user ${deviceUserId} on ${deviceSn} is already mapped`,
      }, { status: 409 })
    }

    const mapping = await prisma.deviceUserMap.create({
      data: { deviceSn, deviceUserId, employeeId },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: token.sub as string,
        module: 'ESSL',
        action: 'CREATE_DEVICE_MAP',
        description: `Created mapping: device user ${deviceUserId} (SN: ${deviceSn}) → ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
        newValue: JSON.stringify({ deviceSn, deviceUserId, employeeId }),
      },
    })

    return NextResponse.json({ success: true, data: mapping })
  } catch (error: any) {
    console.error('POST /api/essl/device-map error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'This mapping already exists' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/essl/device-map — Delete a device-user mapping
 *
 * Query: ?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing mapping id' }, { status: 400 })
    }

    const mapping = await prisma.deviceUserMap.findUnique({ where: { id } })
    if (!mapping) {
      return NextResponse.json({ success: false, error: 'Mapping not found' }, { status: 404 })
    }

    await prisma.deviceUserMap.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: token.sub as string,
        module: 'ESSL',
        action: 'DELETE_DEVICE_MAP',
        description: `Deleted mapping: device user ${mapping.deviceUserId} (SN: ${mapping.deviceSn})`,
        newValue: JSON.stringify(mapping),
      },
    })

    return NextResponse.json({ success: true, message: 'Mapping deleted' })
  } catch (error) {
    console.error('DELETE /api/essl/device-map error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
