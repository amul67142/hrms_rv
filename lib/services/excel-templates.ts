import * as XLSX from 'xlsx'

export function generateEmployeeTemplate(): Buffer {
  const templateData = [
    [
      'employeeCode',
      'firstName',
      'lastName',
      'fatherName',
      'email',
      'phone',
      'department',
      'designation',
      'joiningDate',
      'employmentType',
      'gender',
      'dateOfBirth',
      'address',
      'city',
      'state',
      'pincode',
      'panNumber',
      'aadhaarNumber',
      'bankName',
      'accountNumber',
      'ifscCode',
      'pfNumber',
      'uanNumber',
      'esiNumber',
      'emergencyContactName',
      'emergencyContactPhone',
      'basicSalary',
      'hra',
      'conveyanceAllowance',
      'medicalAllowance',
      'specialAllowance',
      'pfDeduction',
      'esiDeduction',
      'professionalTax',
    ],
    [
      'EMP001',
      'Rahul',
      'Sharma',
      'Vikram Sharma',
      'rahul.sharma@company.com',
      '9876543210',
      'Engineering',
      'Software Engineer',
      '2024-01-15',
      'FULL_TIME',
      'MALE',
      '1995-03-20',
      '123, MG Road',
      'Mumbai',
      'Maharashtra',
      '400001',
      'ABCSH1234R',
      '123456789012',
      'HDFC Bank',
      '12345678901234',
      'HDFC0001234',
      'MH/123456/789',
      '123456789012',
      '1234567890',
      'Priya Sharma',
      '9876543211',
      '50000',
      '15000',
      '2000',
      '1250',
      '10000',
      '6000',
      '1500',
      '200',
    ],
    [
      'EMP002',
      'Priya',
      'Patel',
      'Ramesh Patel',
      'priya.patel@company.com',
      '9876543212',
      'HR',
      'HR Manager',
      '2023-06-01',
      'FULL_TIME',
      'FEMALE',
      '1992-08-14',
      '456, Nehru Nagar',
      'Pune',
      'Maharashtra',
      '411001',
      'ABCPT5678Q',
      '987654321098',
      'ICICI Bank',
      '98765432109876',
      'ICIC0001234',
      'MH/234567/890',
      '234567890123',
      '2345678901',
      'Dinesh Patel',
      '9876543213',
      '65000',
      '19500',
      '2000',
      '1500',
      '12000',
      '7800',
      '1950',
      '200',
    ],
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(templateData)

  ws['!cols'] = templateData[0].map(() => ({ wch: 20 }))

  const cellRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let R = 0; R <= cellRange.e.r; ++R) {
    for (let C = 0; C <= cellRange.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[addr]) continue
      ws[addr].z = R === 0 ? '@' : ws[addr].t === 'n' ? '0.00' : '@'
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Employees')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as Buffer
}

export function generateAttendanceTemplate(
  month: number,
  year: number
): Buffer {
  const daysInMonth = new Date(year, month, 0).getDate()
  const headerRow = ['Employee Code', 'Employee Name', 'Department']

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    headerRow.push(`${d} (${dayName})`)
  }
  headerRow.push('Total Present', 'Total Absent', 'Total Half Days')

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headerRow])
  ws['!cols'] = headerRow.map((_, i) =>
    i < 3 ? { wch: 18 } : { wch: 8 }
  )
  XLSX.utils.book_append_sheet(wb, ws, `Attendance-${month}-${year}`)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as Buffer
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  sheetName = 'Sheet1'
): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, 15),
  }))
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as unknown as Buffer
}
