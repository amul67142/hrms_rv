import { NextRequest, NextResponse } from 'next/server'
import { getToken } from '@/lib/core/token'
import * as XLSX from 'xlsx'
import type { Role } from '@/types'

const REQUIRED_COLUMNS = [
  'firstName', 'lastName', 'email', 'department', 'designation',
  'joiningDate', 'employmentType',
]

const OPTIONAL_COLUMNS = [
  'employeeCode', 'fatherName', 'phone', 'gender', 'dateOfBirth',
  'address', 'city', 'state', 'pincode', 'panNumber', 'aadhaarNumber',
  'bankName', 'accountNumber', 'ifscCode', 'pfNumber', 'uanNumber',
  'esiNumber', 'emergencyContactName', 'emergencyContactPhone',
  'basicSalary', 'hra', 'conveyanceAllowance', 'medicalAllowance',
  'specialAllowance', 'pfDeduction', 'esiDeduction', 'professionalTax',
]

const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]

const VALID_EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY']
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER']
const VALID_MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']

interface ValidationError {
  row: number
  field: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    const userRole = token?.role as Role

    if (userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    if (rawData.length === 0) {
      return NextResponse.json({ success: false, error: 'No data found in file' }, { status: 400 })
    }

    const headers = Object.keys(rawData[0])
    const missingRequired = REQUIRED_COLUMNS.filter((col) => !headers.includes(col))
    if (missingRequired.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required columns: ${missingRequired.join(', ')}`,
      }, { status: 400 })
    }

    const valid: { row: number; data: Record<string, any>; errors: string[] }[] = []
    const invalid: { row: number; data: Record<string, any>; errors: string[] }[] = []

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNum = i + 2
      const rowErrors: ValidationError[] = []

      if (!row.firstName || String(row.firstName).trim() === '') {
        rowErrors.push({ row: rowNum, field: 'firstName', message: 'First name is required' })
      }
      if (!row.lastName || String(row.lastName).trim() === '') {
        rowErrors.push({ row: rowNum, field: 'lastName', message: 'Last name is required' })
      }
      if (!row.email || String(row.email).trim() === '') {
        rowErrors.push({ row: rowNum, field: 'email', message: 'Email is required' })
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(String(row.email).trim())) {
          rowErrors.push({ row: rowNum, field: 'email', message: 'Invalid email format' })
        }
      }
      if (!row.department || String(row.department).trim() === '') {
        rowErrors.push({ row: rowNum, field: 'department', message: 'Department is required' })
      }
      if (!row.designation || String(row.designation).trim() === '') {
        rowErrors.push({ row: rowNum, field: 'designation', message: 'Designation is required' })
      }
      if (!row.joiningDate) {
        rowErrors.push({ row: rowNum, field: 'joiningDate', message: 'Joining date is required' })
      } else {
        const dateVal = new Date(row.joiningDate)
        if (isNaN(dateVal.getTime())) {
          rowErrors.push({ row: rowNum, field: 'joiningDate', message: 'Invalid joining date format' })
        }
      }

      if (row.employmentType && !VALID_EMPLOYMENT_TYPES.includes(String(row.employmentType).toUpperCase().replace(' ', '_'))) {
        rowErrors.push({ row: rowNum, field: 'employmentType', message: `Invalid employment type. Must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}` })
      }
      if (row.gender && !VALID_GENDERS.includes(String(row.gender).toUpperCase())) {
        rowErrors.push({ row: rowNum, field: 'gender', message: `Invalid gender. Must be one of: ${VALID_GENDERS.join(', ')}` })
      }
      if (row.dateOfBirth) {
        const dobVal = new Date(row.dateOfBirth)
        if (isNaN(dobVal.getTime())) {
          rowErrors.push({ row: rowNum, field: 'dateOfBirth', message: 'Invalid date of birth format' })
        }
      }
      if (row.basicSalary !== undefined && row.basicSalary !== '' && isNaN(Number(row.basicSalary))) {
        rowErrors.push({ row: rowNum, field: 'basicSalary', message: 'Basic salary must be a number' })
      }

      const cleanRow: Record<string, any> = {}
      for (const col of ALL_COLUMNS) {
        if (row[col] !== undefined && row[col] !== '') {
          cleanRow[col] = String(row[col]).trim()
        }
      }

      if (rowErrors.length === 0) {
        valid.push({ row: rowNum, data: cleanRow, errors: [] })
      } else {
        invalid.push({ row: rowNum, data: cleanRow, errors: rowErrors.map((e) => `${e.field}: ${e.message}`) })
      }
    }

    return NextResponse.json({
      success: true,
      valid,
      invalid,
      totalValid: valid.length,
      totalInvalid: invalid.length,
      totalRows: rawData.length,
    })
  } catch (error) {
    console.error('POST /api/employees/bulk-import error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
