import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

// Indian format validation regexes
const INDIA_PHONE_REGEX = /^[6-9]\d{9}$/
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const AADHAAR_REGEX = /^[0-9]{12}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

// Admin only needs to provide essentials — employee fills the rest themselves
const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().regex(INDIA_PHONE_REGEX, 'Invalid phone number').optional().or(z.literal('')),
  department: z.string().min(1),
  designation: z.string().min(1),
  joiningDate: z.string().or(z.date()),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY']).default('FULL_TIME'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'TERMINATED', 'ON_LEAVE']).default('ACTIVE'),
})

function generateEmployeeCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `EMP-${timestamp}${random}`
}

export async function GET(request: NextRequest) {
  try {
    if (!await getToken({ req: request })) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') || ''
    const status = searchParams.get('status') || ''
    const designation = searchParams.get('designation') || ''

    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeCode: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (department) where.department = department
    if (status) where.status = status
    if (designation) where.designation = designation

    const [total, data] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, role: true } },
          salaryStructures: {
            where: { isActive: true },
            take: 1,
            orderBy: { effectiveFrom: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/employees error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createEmployeeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data

    const existingEmail = await prisma.employee.findUnique({ where: { email: data.email } })
    if (existingEmail) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 })
    }

    const employeeCode = generateEmployeeCode()

    const existingCode = await prisma.employee.findUnique({ where: { employeeCode } })
    if (existingCode) {
      return NextResponse.json({ success: false, error: 'Employee code already exists' }, { status: 400 })
    }

    // Admin sets the password directly — hash it
    const hashedPassword = await bcrypt.hash(data.password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          department: data.department,
          designation: data.designation,
          joiningDate: new Date(data.joiningDate),
          employmentType: data.employmentType,
          status: data.status,
          profileCompleted: false,
        },
      })

      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: 'EMPLOYEE',
          employeeId: employee.id,
        },
      })

      const leaveTypes = ['CASUAL', 'SICK'] as const
      for (const lt of leaveTypes) {
        await tx.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType: lt,
            year: new Date().getFullYear(),
            entitled: lt === 'CASUAL' ? 12 : 12,
            taken: 0,
            pending: 0,
            available: lt === 'CASUAL' ? 12 : 12,
          },
        })
      }


      return { employee, user }
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId: result.employee.id,
        module: 'EMPLOYEE',
        action: 'CREATE',
        description: `Created employee ${result.employee.employeeCode} - ${result.employee.firstName} ${result.employee.lastName}`,
        newValue: JSON.stringify({ employeeId: result.employee.id, email: data.email }),
      },
    })

    // Fire welcome notification for the new employee
    await prisma.notification.create({
      data: {
        employeeId: result.employee.id,
        title: 'Welcome to the team! 🎉',
        message: `Hi ${data.firstName}! Your account has been created. Please complete your profile to unlock all features.`,
        type: 'SYSTEM',
        link: '/employee/profile',
      },
    }).catch((_e) => { }) // non-blocking

    // Fire admin broadcast notification (no employeeId = admin sees it)
    await prisma.notification.create({
      data: {
        employeeId: null,
        title: 'New employee added',
        message: `${data.firstName} ${data.lastName} (${result.employee.employeeCode}) has been added to ${data.department}.`,
        type: 'SYSTEM',
        link: `/admin/employees/${result.employee.id}`,
      },
    }).catch((_e) => { }) // non-blocking

    return NextResponse.json({
      success: true,
      data: { ...result.employee, user: { id: result.user.id, email: result.user.email, role: result.user.role, employeeId: result.user.employeeId } },
      message: 'Employee created successfully.',
    })

  } catch (error) {
    console.error('POST /api/employees error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
