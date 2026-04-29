import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'
import { prisma } from '@/lib/core/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const INDIA_PHONE_REGEX = /^[6-9]\d{9}$/
const AADHAAR_REGEX = /^[0-9]{12}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

const updateMyProfileSchema = z.object({
  // Contact
  phone: z.string().regex(INDIA_PHONE_REGEX, 'Invalid phone number (10 digits starting with 6-9)').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),

  // Personal
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
  fatherName: z.string().optional(),

  // Emergency contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().regex(INDIA_PHONE_REGEX, 'Invalid emergency contact phone').optional().or(z.literal('')),

  // Bank details (optional, not mandatory)
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().regex(IFSC_REGEX, 'Invalid IFSC code').optional().or(z.literal('')),

  // Government IDs (optional)
  aadhaarNumber: z.string().regex(AADHAAR_REGEX, 'Invalid Aadhaar number (12 digits)').optional().or(z.literal('')),

  // Profile image
  profileImage: z.string().optional(),

  // Mark profile as complete (set by client after completing required fields)
  profileCompleted: z.boolean().optional(),
})

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = token.employeeId as string

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { id: true, email: true, role: true } },
        salaryStructures: {
          where: { isActive: true },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
        leaveBalances: { where: { year: new Date().getFullYear() } },
      },
    })

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    console.error('GET /api/me error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = token.employeeId as string

    if (!employeeId) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateMyProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data
    const updateData: any = { ...data }
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth)

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, role: true } },
        salaryStructures: {
          where: { isActive: true },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
        leaveBalances: { where: { year: new Date().getFullYear() } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('PATCH /api/me error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
