import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/core/db'
import { getToken } from '@/lib/core/token'
import { z } from 'zod'
import type { Role } from '@/types'

const DOCUMENT_TYPES = ['AADHAR', 'PAN', 'BANK_PROOF', 'ADDRESS_PROOF', 'EXPERIENCE', 'EDUCATION', 'OTHER'] as const

const createDocumentSchema = z.object({
  employeeId: z.string().min(1).optional(), // For admin/HR only; employees use session employeeId
  title: z.string().min(1),
  documentType: z.enum(DOCUMENT_TYPES),
  fileUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
})

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const userEmployeeId = token?.employeeId as string | null

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') || ''
    const documentType = searchParams.get('documentType') || ''
    const search = searchParams.get('search') || ''

    const where: any = {}

    // Employees can only see their own documents
    if (userRole === 'EMPLOYEE') {
      where.employeeId = userEmployeeId
    }

    if (status) where.status = status
    if (documentType) where.documentType = documentType

    const [total, data] = await Promise.all([
      prisma.employeeDocument.count({ where }),
      prisma.employeeDocument.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: true,
              designation: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Filter by employee name search (post-query for join field)
    let filteredData = data
    if (search && userRole !== 'EMPLOYEE') {
      const q = search.toLowerCase()
      filteredData = data.filter(
        (doc) =>
          doc.employee?.firstName.toLowerCase().includes(q) ||
          doc.employee?.lastName.toLowerCase().includes(q) ||
          doc.employee?.employeeCode.toLowerCase().includes(q) ||
          doc.title.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({
      success: true,
      data: filteredData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/documents error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role
    const userEmployeeId = token?.employeeId as string | null

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createDocumentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 })
    }

    const data = parsed.data

    // Determine the employeeId: employees use their session employeeId
    let targetEmployeeId: string
    if (userRole === 'EMPLOYEE') {
      if (!userEmployeeId) {
        return NextResponse.json({ success: false, error: 'No employee profile associated with this user' }, { status: 400 })
      }
      targetEmployeeId = userEmployeeId
    } else if (userRole === 'ADMIN' || userRole === 'HR_MANAGER') {
      if (!data.employeeId) {
        return NextResponse.json({ success: false, error: 'employeeId is required for admin uploads' }, { status: 400 })
      }
      targetEmployeeId = data.employeeId
    } else {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({ where: { id: targetEmployeeId } })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 })
    }

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: targetEmployeeId,
        title: data.title,
        documentType: data.documentType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: token?.sub,
        employeeId: data.employeeId,
        module: 'DOCUMENT' as any,
        action: 'CREATE',
        description: `Uploaded document "${data.title}" (${data.documentType})`,
        newValue: JSON.stringify({ documentId: document.id, documentType: data.documentType }),
      },
    })

    return NextResponse.json({ success: true, data: document }, { status: 201 })
  } catch (error) {
    console.error('POST /api/documents error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
