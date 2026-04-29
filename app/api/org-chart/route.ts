import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

export interface OrgChartEmployee {
  id: string
  name: string
  designation: string
  department: string
  managerId: string | null
  managerName: string | null
  profileImage: string | null
  email: string
  employeeCode: string
  phone: string | null
}

export interface OrgChartNode extends OrgChartEmployee {
  children: OrgChartNode[]
  directReports: number
}

async function buildOrgTree(employees: OrgChartEmployee[]): Promise<OrgChartNode[]> {
  const employeeMap = new Map<string, OrgChartNode>()
  const childrenMap = new Map<string, OrgChartNode[]>()

  employees.forEach((emp) => {
    employeeMap.set(emp.id, { ...emp, children: [], directReports: 0 })
  })

  employees.forEach((emp) => {
    if (emp.managerId && employeeMap.has(emp.managerId)) {
      const managerChildren = childrenMap.get(emp.managerId) || []
      managerChildren.push(employeeMap.get(emp.id)!)
      childrenMap.set(emp.managerId, managerChildren)
    }
  })

  childrenMap.forEach((children, managerId) => {
    const manager = employeeMap.get(managerId)
    if (manager) {
      manager.children = children
      manager.directReports = children.length
    }
  })

  const rootEmployees = employees.filter((emp) => !emp.managerId || !employeeMap.has(emp.managerId))

  return rootEmployees.map((emp) => employeeMap.get(emp.id)!)
}

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token?.role as Role
    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'INACTIVE', 'ON_LEAVE'] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        employeeCode: true,
        department: true,
        designation: true,
        profileImage: true,
        phone: true,
        departmentRef: {
          select: { managerId: true },
        },
      },
      orderBy: { department: 'asc' },
    })

    // Build a map of employee IDs to names for manager lookup
    const employeeNameMap = new Map<string, string>()
    employees.forEach((emp) => {
      employeeNameMap.set(emp.id, `${emp.firstName} ${emp.lastName}`.trim())
    })

    const flatEmployees: OrgChartEmployee[] = employees.map((emp) => ({
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      designation: emp.designation,
      department: emp.department,
      managerId: emp.departmentRef?.managerId || null,
      managerName: emp.departmentRef?.managerId
        ? employeeNameMap.get(emp.departmentRef.managerId) || null
        : null,
      profileImage: emp.profileImage,
      email: emp.email,
      employeeCode: emp.employeeCode,
      phone: emp.phone,
    }))

    const orgTree = await buildOrgTree(flatEmployees)

    const departments = [...new Set(flatEmployees.map((e) => e.department))]

    return NextResponse.json({
      success: true,
      data: {
        tree: orgTree,
        flat: flatEmployees,
        departments,
        totalEmployees: flatEmployees.length,
      },
    })
  } catch (error) {
    console.error('GET /api/org-chart error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = token?.role as Role
    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { employeeId, managerId } = body

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'employeeId is required' }, { status: 400 })
    }

    // Find the department that the new manager manages
    let targetDepartmentId: string | null = null

    if (managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: managerId },
        select: { id: true, departmentId: true, department: true, firstName: true, email: true },
      })

      if (!manager) {
        return NextResponse.json({ success: false, error: 'Manager not found' }, { status: 404 })
      }

      if (manager.departmentId) {
        // Manager has a department — employee joins that department
        targetDepartmentId = manager.departmentId
      } else {
        // Manager has no department; create/find a department for them
        const existingDept = await prisma.department.findFirst({
          where: { managerId },
        })
        if (existingDept) {
          targetDepartmentId = existingDept.id
        } else {
          const newDept = await prisma.department.create({
            data: {
              name: `${manager.firstName || manager.email}'s Team`,
              code: `TEAM-${manager.id.slice(-6).toUpperCase()}`,
              managerId,
            },
          })
          targetDepartmentId = newDept.id
        }
      }
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { departmentId: targetDepartmentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/org-chart error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
