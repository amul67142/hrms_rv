import * as XLSX from 'xlsx'

export interface ExcelColumn {
  header: string
  field: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'email' | 'phone'
}

export const EMPLOYEE_IMPORT_COLUMNS: ExcelColumn[] = [
  {
    header: 'employeeCode',
    field: 'employeeCode',
    required: false,
    type: 'string',
  },
  { header: 'firstName', field: 'firstName', required: true, type: 'string' },
  { header: 'lastName', field: 'lastName', required: true, type: 'string' },
  {
    header: 'fatherName',
    field: 'fatherName',
    required: false,
    type: 'string',
  },
  { header: 'email', field: 'email', required: true, type: 'email' },
  { header: 'phone', field: 'phone', required: false, type: 'phone' },
  {
    header: 'department',
    field: 'department',
    required: true,
    type: 'string',
  },
  {
    header: 'designation',
    field: 'designation',
    required: true,
    type: 'string',
  },
  { header: 'joiningDate', field: 'joiningDate', required: true, type: 'date' },
  {
    header: 'employmentType',
    field: 'employmentType',
    required: false,
    type: 'string',
  },
  { header: 'gender', field: 'gender', required: false, type: 'string' },
  {
    header: 'dateOfBirth',
    field: 'dateOfBirth',
    required: false,
    type: 'date',
  },
  { header: 'address', field: 'address', required: false, type: 'string' },
  { header: 'city', field: 'city', required: false, type: 'string' },
  { header: 'state', field: 'state', required: false, type: 'string' },
  { header: 'pincode', field: 'pincode', required: false, type: 'string' },
  { header: 'panNumber', field: 'panNumber', required: false, type: 'string' },
  {
    header: 'aadhaarNumber',
    field: 'aadhaarNumber',
    required: false,
    type: 'string',
  },
  { header: 'bankName', field: 'bankName', required: false, type: 'string' },
  {
    header: 'accountNumber',
    field: 'accountNumber',
    required: false,
    type: 'string',
  },
  { header: 'ifscCode', field: 'ifscCode', required: false, type: 'string' },
  { header: 'pfNumber', field: 'pfNumber', required: false, type: 'string' },
  { header: 'uanNumber', field: 'uanNumber', required: false, type: 'string' },
  { header: 'esiNumber', field: 'esiNumber', required: false, type: 'string' },
  {
    header: 'emergencyContactName',
    field: 'emergencyContact',
    required: false,
    type: 'string',
  },
  {
    header: 'emergencyContactPhone',
    field: 'emergencyPhone',
    required: false,
    type: 'phone',
  },
  { header: 'basicSalary', field: 'basicSalary', required: true, type: 'number' },
  { header: 'hra', field: 'hra', required: false, type: 'number' },
  {
    header: 'conveyanceAllowance',
    field: 'conveyanceAllowance',
    required: false,
    type: 'number',
  },
  {
    header: 'medicalAllowance',
    field: 'medicalAllowance',
    required: false,
    type: 'number',
  },
  {
    header: 'specialAllowance',
    field: 'specialAllowance',
    required: false,
    type: 'number',
  },
  { header: 'pfDeduction', field: 'pfDeduction', required: false, type: 'number' },
  { header: 'esiDeduction', field: 'esiDeduction', required: false, type: 'number' },
  {
    header: 'professionalTax',
    field: 'professionalTax',
    required: false,
    type: 'number',
  },
]

export interface ImportRow {
  rowNumber: number
  data: Record<string, unknown>
  errors: string[]
  isValid: boolean
}

export interface ImportResult {
  valid: ImportRow[]
  invalid: ImportRow[]
  totalRows: number
  headers: string[]
  preview: ImportRow[]
}

export function parseExcelImport(
  buffer: Buffer
): { headers: string[]; rows: unknown[][] } {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][]
  const headers = (rows[0] || []).map((h) => String(h).trim())
  return { headers, rows: rows.slice(1) }
}

export function validateImportRow(
  row: unknown[],
  headers: string[],
  rowNumber: number
): ImportRow {
  const data: Record<string, unknown> = {}
  const errors: string[] = []

  for (const col of EMPLOYEE_IMPORT_COLUMNS) {
    const headerIndex = headers.indexOf(col.header)
    if (headerIndex === -1) {
      if (col.required) {
        errors.push(`Missing required column: ${col.header}`)
      }
      continue
    }

    let value = row[headerIndex]

    if (col.type === 'date' && value !== undefined && value !== null) {
      if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000)
        value = date.toISOString().split('T')[0]
      } else if (typeof value === 'string') {
        value = value.split('T')[0]
      }
    }

    if (col.type === 'phone' || col.type === 'string') {
      if (value !== undefined && value !== null) {
        value = String(value).trim()
      }
    }

    if (col.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(value))) {
        errors.push(`Invalid email format: ${value}`)
      }
    }

    if (col.required && (!value || value === '')) {
      errors.push(`${col.header} is required`)
      continue
    }

    data[col.field] = value || null
  }

  return {
    rowNumber,
    data,
    errors,
    isValid: errors.length === 0,
  }
}

export function parseAndValidateExcel(buffer: Buffer): ImportResult {
  const { headers, rows } = parseExcelImport(buffer)
  const valid: ImportRow[] = []
  const invalid: ImportRow[] = []

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2
    const result = validateImportRow(rows[i], headers, rowNumber)
    if (result.isValid) {
      valid.push(result)
    } else {
      invalid.push(result)
    }
  }

  return {
    valid,
    invalid,
    totalRows: rows.length,
    headers,
    preview: [...valid.slice(0, 5), ...invalid.slice(0, 5)].sort(
      (a, b) => a.rowNumber - b.rowNumber
    ),
  }
}
