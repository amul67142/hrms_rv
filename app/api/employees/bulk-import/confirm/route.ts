import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import bcrypt from 'bcryptjs'
import type { Role } from '@/types'

export const dynamic = 'force-dynamic'

function generateEmployeeCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `EMP-${timestamp}${random}`
}

interface BulkImportData {
  firstName: string
  lastName: string
  email: string
  department: string
  designation: string
  joiningDate: string
  employmentType?: string
  employeeCode?: string
  fatherName?: string
  phone?: string
  gender?: string
  dateOfBirth?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  panNumber?: string
  aadhaarNumber?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  pfNumber?: string
  uanNumber?: string
  esiNumber?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  basicSalary?: number
  hra?: number
  conveyanceAllowance?: number
  medicalAllowance?: number
  specialAllowance?: number
  pfDeduction?: number
  esiDeduction?: number
  professionalTax?: number
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validRows: BulkImportData[] = body.valid || []

    if (validRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid rows to import' }, { status: 400 })
    }

    const createdEmployees: string[] = []
    const failedRows: { row: number; email: string; error: string }[] = []
    const existingEmails = new Set(
      (await prisma.employee.findMany({ select: { email: true } })).map((e) => e.email.toLowerCase())
    )

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      const rowNum = i + 1

      if (existingEmails.has(row.email.toLowerCase())) {
        failedRows.push({ row: rowNum, email: row.email, error: 'Email already exists' })
        continue
      }

      try {
        const tempPassword = `HRMS${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        const hashedPassword = await bcrypt.hash(tempPassword, 12)
        const employeeCode = row.employeeCode || generateEmployeeCode()

        const result = await prisma.$transaction(async (tx) => {
          const employee = await tx.employee.create({
            data: {
              employeeCode,
              firstName: row.firstName,
              lastName: row.lastName,
              fatherName: row.fatherName,
              email: row.email,
              phone: row.phone,
              department: row.department,
              designation: row.designation,
              joiningDate: new Date(row.joiningDate),
              employmentType: (row.employmentType?.toUpperCase() || 'FULL_TIME') as any,
              gender: row.gender?.toUpperCase() as any,
              dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
              address: row.address,
              city: row.city,
              state: row.state,
              pincode: row.pincode,
              panNumber: row.panNumber,
              aadhaarNumber: row.aadhaarNumber,
              bankName: row.bankName,
              accountNumber: row.accountNumber,
              ifscCode: row.ifscCode,
              pfNumber: row.pfNumber,
              uanNumber: row.uanNumber,
              esiNumber: row.esiNumber,
              emergencyContactName: row.emergencyContactName,
              emergencyContactPhone: row.emergencyContactPhone,
              status: 'ACTIVE',
            },
          })

          await tx.user.create({
            data: {
              email: row.email,
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

          if (row.basicSalary !== undefined) {
            await tx.salaryStructure.create({
              data: {
                employeeId: employee.id,
                effectiveFrom: new Date(row.joiningDate),
                basicSalary: row.basicSalary || 0,
                hra: row.hra || 0,
                conveyanceAllowance: row.conveyanceAllowance || 0,
                medicalAllowance: row.medicalAllowance || 0,
                specialAllowance: row.specialAllowance || 0,
                pfDeduction: row.pfDeduction || 0,
                esiDeduction: row.esiDeduction || 0,
                professionalTax: row.professionalTax || 0,
                isActive: true,
              },
            })
          }

          return employee
        })

        createdEmployees.push(result.employeeCode)
        existingEmails.add(row.email.toLowerCase())
      } catch (err: any) {
        failedRows.push({ row: rowNum, email: row.email, error: err.message || 'Unknown error' })
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        module: 'EMPLOYEE',
        action: 'IMPORT',
        description: `Bulk imported ${createdEmployees.length} employees, ${failedRows.length} failed`,
        newValue: JSON.stringify({ imported: createdEmployees, failed: failedRows }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        imported: createdEmployees,
        failed: failedRows,
        totalImported: createdEmployees.length,
        totalFailed: failedRows.length,
      },
    })
  } catch (error) {
    console.error('POST /api/employees/bulk-import/confirm error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
