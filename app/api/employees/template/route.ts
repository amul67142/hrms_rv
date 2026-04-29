import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const TEMPLATE_HEADERS = [
  { header: 'employeeCode', key: 'employeeCode' },
  { header: 'firstName', key: 'firstName' },
  { header: 'lastName', key: 'lastName' },
  { header: 'fatherName', key: 'fatherName' },
  { header: 'email', key: 'email' },
  { header: 'phone', key: 'phone' },
  { header: 'department', key: 'department' },
  { header: 'designation', key: 'designation' },
  { header: 'joiningDate', key: 'joiningDate' },
  { header: 'employmentType', key: 'employmentType' },
  { header: 'gender', key: 'gender' },
  { header: 'dateOfBirth', key: 'dateOfBirth' },
  { header: 'address', key: 'address' },
  { header: 'city', key: 'city' },
  { header: 'state', key: 'state' },
  { header: 'pincode', key: 'pincode' },
  { header: 'panNumber', key: 'panNumber' },
  { header: 'aadhaarNumber', key: 'aadhaarNumber' },
  { header: 'bankName', key: 'bankName' },
  { header: 'accountNumber', key: 'accountNumber' },
  { header: 'ifscCode', key: 'ifscCode' },
  { header: 'pfNumber', key: 'pfNumber' },
  { header: 'uanNumber', key: 'uanNumber' },
  { header: 'esiNumber', key: 'esiNumber' },
  { header: 'emergencyContactName', key: 'emergencyContactName' },
  { header: 'emergencyContactPhone', key: 'emergencyContactPhone' },
  { header: 'basicSalary', key: 'basicSalary' },
  { header: 'hra', key: 'hra' },
  { header: 'conveyanceAllowance', key: 'conveyanceAllowance' },
  { header: 'medicalAllowance', key: 'medicalAllowance' },
  { header: 'specialAllowance', key: 'specialAllowance' },
  { header: 'pfDeduction', key: 'pfDeduction' },
  { header: 'esiDeduction', key: 'esiDeduction' },
  { header: 'professionalTax', key: 'professionalTax' },
]

export async function GET(_request: NextRequest) {
  try {
    const token = await getToken({ req: _request })
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  const sampleData = [
    {
      employeeCode: 'EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      fatherName: 'James Doe',
      email: 'john.doe@company.com',
      phone: '9876543210',
      department: 'Engineering',
      designation: 'Software Engineer',
      joiningDate: '2024-01-15',
      employmentType: 'FULL_TIME',
      gender: 'MALE',
      dateOfBirth: '1995-06-15',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123456789012',
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      ifscCode: 'SBIN0001234',
      pfNumber: 'MH/123456/789',
      uanNumber: '123456789012',
      esiNumber: '31-00-123456-00',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '9876543211',
      basicSalary: 50000,
      hra: 15000,
      conveyanceAllowance: 2000,
      medicalAllowance: 2000,
      specialAllowance: 5000,
      pfDeduction: 6000,
      esiDeduction: 375,
      professionalTax: 200,
    },
    {
      employeeCode: '',
      firstName: '',
      lastName: '',
      fatherName: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      joiningDate: '',
      employmentType: 'FULL_TIME',
      gender: '',
      dateOfBirth: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      panNumber: '',
      aadhaarNumber: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      pfNumber: '',
      uanNumber: '',
      esiNumber: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      basicSalary: 0,
      hra: 0,
      conveyanceAllowance: 0,
      medicalAllowance: 0,
      specialAllowance: 0,
      pfDeduction: 0,
      esiDeduction: 0,
      professionalTax: 0,
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData, { header: TEMPLATE_HEADERS.map((h) => h.key) })

  for (let i = 0; i < TEMPLATE_HEADERS.length; i++) {
    const cell = XLSX.utils.encode_cell({ r: 0, c: i })
    if (ws[cell]) {
      ws[cell].v = TEMPLATE_HEADERS[i].header
    } else {
      ws[cell] = { v: TEMPLATE_HEADERS[i].header }
    }
  }

  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 20 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee_import_template.xlsx"',
    },
  })
  } catch (error) {
    console.error('GET /api/employees/template error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
