import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { startOfMonth, getDaysInMonth } from 'date-fns'
import crypto from 'crypto'

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: seed.ts must not be run in production.')
  process.exit(1)
}

function getSeedPassword(envKey: string, defaultValue: string): string {
  const password = process.env[envKey]
  if (password) return password
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[DEV] ${envKey} not set, using generated password (not logged)`)
    return crypto.randomBytes(12).toString('base64')
  }
  return defaultValue
}

const ADMIN_PASSWORD = getSeedPassword('SEED_ADMIN_PASSWORD', crypto.randomBytes(12).toString('base64'))
const HR_PASSWORD = getSeedPassword('SEED_HR_PASSWORD', crypto.randomBytes(12).toString('base64'))
const EMP_PASSWORD = getSeedPassword('SEED_EMP_PASSWORD', crypto.randomBytes(12).toString('base64'))

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Delete in correct order to avoid FK constraint violations
  // 1. Tables that reference LoginSession (FK to User)
  await prisma.loginSession.deleteMany()
  // 2. AuditLog references both User and Employee
  await prisma.auditLog.deleteMany()
  // 3. Tables that reference Employee (FK required - must be cleared before Employee)
  await prisma.payrollItem.deleteMany()
  await prisma.salaryStructure.deleteMany()
  await prisma.leaveBalance.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.task.deleteMany()
  await prisma.resignation.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.hRLetter.deleteMany()
  await prisma.attendanceRegularization.deleteMany()
  await prisma.employeeDocument.deleteMany()
  await prisma.reimbursement.deleteMany()
  await prisma.learningProgress.deleteMany()
  // 4. Tables that reference LearningModule and Tool
  await prisma.announcement.deleteMany()
  await prisma.eSSLSyncLog.deleteMany()
  // 5. Other settings and reference tables
  await prisma.holiday.deleteMany()
  await prisma.companySettings.deleteMany()
  // 6. User must be deleted before Employee (FK: user.employeeId -> employee.id)
  await prisma.user.deleteMany()
  // 7. Employee (references Department - Department has optional relation to Employee)
  await prisma.employee.deleteMany()
  // 8. Department (only after Employee since it has employees relation)
  await prisma.department.deleteMany()

  const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const adminEmployee = await prisma.employee.create({
    data: {
      employeeCode: 'EMP001',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@company.com',
      phone: '+91-9876543210',
      gender: "MALE",
      dateOfBirth: new Date('1985-05-15'),
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+91-9876543211',
      department: 'IT',
      designation: 'System Administrator',
      employmentType: "FULL_TIME",
      joiningDate: new Date('2020-01-01'),
      status: "ACTIVE",
      address: '123 Admin Street, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123456789012',
      bankName: 'State Bank of India',
      accountNumber: '12345678901',
      ifscCode: 'SBIN0001234',
      uanNumber: '123456789012',
      pfNumber: 'MH/PUNE/123456',
    },
  })

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      password: adminPassword,
      role: "ADMIN",
      employeeId: adminEmployee.id,
    },
  })

  const hrPassword = await bcrypt.hash(HR_PASSWORD, 12)
  const hrEmployee = await prisma.employee.create({
    data: {
      employeeCode: 'EMP002',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'hr@company.com',
      phone: '+91-9876543212',
      gender: "FEMALE",
      dateOfBirth: new Date('1990-03-20'),
      emergencyContactName: 'Rajesh Sharma',
      emergencyContactPhone: '+91-9876543213',
      department: 'Human Resources',
      designation: 'HR Manager',
      employmentType: "FULL_TIME",
      joiningDate: new Date('2021-06-15'),
      status: "ACTIVE",
      address: '456 HR Lane, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
      panNumber: 'PQRST5678U',
      aadhaarNumber: '234567890123',
      bankName: 'HDFC Bank',
      accountNumber: '23456789012',
      ifscCode: 'HDFC0001234',
      uanNumber: '234567890123',
      pfNumber: 'MH/PUNE/234567',
    },
  })

  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@company.com',
      password: hrPassword,
      role: "HR_MANAGER",
      employeeId: hrEmployee.id,
    },
  })

  const empPassword = await bcrypt.hash(EMP_PASSWORD, 12)
  const sampleEmployeesData = [
    {
      employeeCode: 'EMP003',
      firstName: 'Rahul',
      lastName: 'Verma',
      email: 'rahul.verma@company.com',
      phone: '+91-9876543214',
      gender: "MALE",
      dateOfBirth: new Date('1992-08-10'),
      emergencyContactName: 'Sunita Verma',
      emergencyContactPhone: '+91-9876543215',
      department: 'Engineering',
      designation: 'Senior Software Engineer',
      employmentType: "FULL_TIME",
      joiningDate: new Date('2022-02-01'),
      status: "ACTIVE",
      address: '789 Tech Park Road, Hinjewadi',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      panNumber: 'FGHIJ9012K',
      aadhaarNumber: '345678901234',
      bankName: 'ICICI Bank',
      accountNumber: '34567890123',
      ifscCode: 'ICIC0001234',
      uanNumber: '345678901234',
      pfNumber: 'MH/PUNE/345678',
      esiNumber: '12-34-567890-123',
    },
    {
      employeeCode: 'EMP004',
      firstName: 'Sneha',
      lastName: 'Patel',
      email: 'sneha.patel@company.com',
      phone: '+91-9876543216',
      gender: "FEMALE",
      dateOfBirth: new Date('1995-12-05'),
      emergencyContactName: 'Mitesh Patel',
      emergencyContactPhone: '+91-9876543217',
      department: 'Finance',
      designation: 'Accountant',
      employmentType: "FULL_TIME",
      joiningDate: new Date('2023-01-10'),
      status: "ACTIVE",
      address: '321 Finance Street, Fort',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400003',
      panNumber: 'LMNOP3456Q',
      aadhaarNumber: '456789012345',
      bankName: 'Axis Bank',
      accountNumber: '45678901234',
      ifscCode: 'UTIB0001234',
      uanNumber: '456789012345',
      pfNumber: 'MH/PUNE/456789',
    },
    {
      employeeCode: 'EMP005',
      firstName: 'Amit',
      lastName: 'Singh',
      email: 'amit.singh@company.com',
      phone: '+91-9876543218',
      gender: "MALE",
      dateOfBirth: new Date('1993-06-22'),
      emergencyContactName: 'Geeta Singh',
      emergencyContactPhone: '+91-9876543219',
      department: 'Engineering',
      designation: 'Software Engineer',
      employmentType: "FULL_TIME",
      joiningDate: new Date('2023-04-01'),
      status: "ACTIVE",
      address: '654 Developer Avenue, Kothrud',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411002',
      panNumber: 'RSTUV7890W',
      aadhaarNumber: '567890123456',
      bankName: 'Kotak Bank',
      accountNumber: '56789012345',
      ifscCode: 'KKBK0001234',
      uanNumber: '567890123456',
      pfNumber: 'MH/PUNE/567890',
    },
    {
      employeeCode: 'EMP006',
      firstName: 'Neha',
      lastName: 'Gupta',
      email: 'neha.gupta@company.com',
      phone: '+91-9876543220',
      gender: "FEMALE",
      dateOfBirth: new Date('1997-09-14'),
      emergencyContactName: 'Ramesh Gupta',
      emergencyContactPhone: '+91-9876543221',
      department: 'Marketing',
      designation: 'Marketing Executive',
      employmentType: "FULL_TIME",
      joiningDate: new Date('2023-07-15'),
      status: "ACTIVE",
      address: '987 Business Park, Vashi',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pincode: '400004',
      panNumber: 'WXYZA1234B',
      aadhaarNumber: '678901234567',
      bankName: 'IDBI Bank',
      accountNumber: '67890123456',
      ifscCode: 'IBKL0001234',
      uanNumber: '678901234567',
      pfNumber: 'MH/PUNE/678901',
    },
    {
      employeeCode: 'EMP007',
      firstName: 'Vikram',
      lastName: 'Yadav',
      email: 'vikram.yadav@company.com',
      phone: '+91-9876543222',
      gender: "MALE",
      dateOfBirth: new Date('1991-04-08'),
      emergencyContactName: 'Kamala Yadav',
      emergencyContactPhone: '+91-9876543223',
      department: 'Operations',
      designation: 'Operations Manager',
      employmentType: "FULL_TIME",
      joiningDate: new Date('2021-09-01'),
      status: "ACTIVE",
      address: '147 Operations Road, Nariman Point',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400005',
      panNumber: 'CDEFG5678H',
      aadhaarNumber: '789012345678',
      bankName: 'Punjab National Bank',
      accountNumber: '78901234567',
      ifscCode: 'PUNB0001234',
      uanNumber: '789012345678',
      pfNumber: 'MH/PUNE/789012',
    },
  ]

  const createdEmployees = []

  for (const empData of sampleEmployeesData) {
    const employee = await prisma.employee.create({ data: empData })
    createdEmployees.push(employee)

    await prisma.user.create({
      data: {
        email: empData.email,
        password: empPassword,
        role: "EMPLOYEE",
        employeeId: employee.id,
      },
    })

    const leaveTypes: Array<{ type: string; entitled: number }> = [
      { type: "CASUAL", entitled: 12 },
      { type: "SICK", entitled: 12 },
    ]

    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveType: lt.type,
          year: 2026,
          entitled: lt.entitled,
          taken: 0,
          pending: 0,
          available: lt.entitled,
        },
      })
    }
  }

  const salaryAmounts: Record<string, number> = {
    EMP003: 95000,
    EMP004: 55000,
    EMP005: 65000,
    EMP006: 45000,
    EMP007: 75000,
  }

  for (const emp of createdEmployees) {
    const panLinkedSalary = salaryAmounts[emp.employeeCode] || 50000
    const basicSalary = Math.round(panLinkedSalary * 0.4)
    const hra = Math.round(basicSalary * 0.4)
    const conveyanceAllowance = 1600
    const medicalAllowance = 1250
    const specialAllowance = panLinkedSalary - basicSalary - hra - conveyanceAllowance - medicalAllowance
    const pfDeduction = Math.min(Math.round(basicSalary * 0.12), 1800)
    const esiDeduction = panLinkedSalary >= 21000 ? 0 : Math.round(panLinkedSalary * 0.0075)
    const professionalTax = panLinkedSalary >= 10000 ? 200 : 0

    await prisma.salaryStructure.create({
      data: {
        employeeId: emp.id,
        effectiveFrom: emp.joiningDate,
        basicSalary,
        hra,
        conveyanceAllowance,
        medicalAllowance,
        specialAllowance,
        otherAllowance: 0,
        pfDeduction,
        esiDeduction,
        professionalTax,
        otherDeduction: 0,
        isActive: true,
      },
    })
  }

  await prisma.companySettings.create({
    data: {
      companyName: 'REALVIBE DIGITAL MEDIA PVT. LTD.',
      companyAddress: '303, 3rd Floor, JMD Galleria, Sector 48, Sohna Road, Gurugram, Haryana – 122018',
      phone: '+91 98112 38092',
      email: 'care@realvibe.in',
      website: 'www.realvibe.in',
      registrationNumber: 'CIN: U62099HR2024PTC120343',
      pan: 'AANCR5363B',
      tan: 'RTKR20551G',
      pfNumber: 'HR/PUNJAB/123456',
      esiNumber: '12-34-567890-123',
      ptNumber: 'PT/HR/12345',
      bankName: 'HDFC Bank',
      bankAccountNumber: '50200012345678',
      bankAccountHolder: 'REALVIBE DIGITAL MEDIA PVT. LTD.',
      bankIfsc: 'HDFC0001234',
      workingDaysPerWeek: 5,
      shiftStartTime: '09:30',
      shiftEndTime: '18:30',
      halfDayHours: 4,
      monthlyLeaveEntitlement: 1,
      pfRate: 12,
      esiRate: 0.75,
      professionalTaxRate: 200,
      tdsRate: 10,
      leaveEncashmentRate: 30,
      salarySlipShowWatermark: false,
      salarySlipWatermarkText: 'REALVIBE HRM',
      salarySlipHeaderText: 'REALVIBE DIGITAL MEDIA PVT. LTD.',
      salarySlipFooterText: 'This is a computer-generated document.',
      salarySlipSignatoryName: 'Authorized Signatory',
      salarySlipSignatoryDesig: 'HR Manager',
      salarySlipPrimaryColor: '#8B5CF6',
      salarySlipShowLogo: true,
    },
  })

  const holidays2026 = [
    { name: "New Year's Day", date: new Date('2026-01-01'), description: 'New Year Celebration' },
    { name: 'Republic Day', date: new Date('2026-01-26'), description: 'National Holiday' },
    { name: 'Holi', date: new Date('2026-02-14'), description: 'Festival of Colors' },
    { name: 'Good Friday', date: new Date('2026-03-06'), description: 'Christian Holiday' },
    { name: 'Ram Navami', date: new Date('2026-03-17'), description: 'Hindu Festival' },
    { name: 'Mahavir Jayanti', date: new Date('2026-03-24'), description: 'Jain Festival' },
    { name: 'Independence Day', date: new Date('2026-08-15'), description: 'National Holiday' },
    { name: 'Ganesh Chaturthi', date: new Date('2026-08-27'), description: 'Hindu Festival' },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), description: 'Mahatma Gandhi Birthday' },
    { name: 'Dussehra', date: new Date('2026-10-09'), description: 'Hindu Festival' },
    { name: 'Diwali', date: new Date('2026-10-20'), description: 'Festival of Lights' },
    { name: 'Bhai Dooj', date: new Date('2026-10-22'), description: 'Hindu Festival' },
    { name: 'Christmas Day', date: new Date('2026-12-25'), description: 'Christian Holiday' },
  ]

  for (const holiday of holidays2026) {
    await prisma.holiday.create({
      data: {
        name: holiday.name,
        date: holiday.date,
        year: 2026,
        description: holiday.description,
      },
    })
  }

  const currentMonthStart = startOfMonth(new Date())
  const daysInMonth = getDaysInMonth(new Date())

  for (const emp of [hrEmployee, ...createdEmployees]) {
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonthStart)
      date.setDate(day)
      const dayOfWeek = date.getDay()

      if (dayOfWeek === 0 || dayOfWeek === 6) continue

      const rand = Math.random()
      let status: string
      if (rand < 0.8) {
        status = "PRESENT"
      } else if (rand < 0.9) {
        status = "ABSENT"
      } else if (rand < 0.95) {
        status = "HALF_DAY"
      } else {
        status = "LEAVE"
      }

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          status,
          inTime: status === "PRESENT" ? '09:30' : null,
          outTime: status === "PRESENT" ? '18:30' : null,
        },
      })
    }
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId: createdEmployees[0].id,
      leaveType: "CASUAL",
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-04-17'),
      totalDays: 3,
      reason: 'Personal work',
      status: "PENDING",
    },
  })

  await prisma.leaveRequest.create({
    data: {
      employeeId: createdEmployees[1].id,
      leaveType: "SICK",
      startDate: new Date('2026-04-08'),
      endDate: new Date('2026-04-09'),
      totalDays: 2,
      reason: 'Medical appointment',
      status: "APPROVED",
      approvedBy: hrEmployee.id,
      approvedAt: new Date('2026-04-07'),
    },
  })


  const salaryStructures = await prisma.salaryStructure.findMany({
    include: { employee: true },
  })

  for (const structure of salaryStructures) {
    const totalEarnings =
      structure.basicSalary +
      structure.hra +
      structure.conveyanceAllowance +
      structure.medicalAllowance +
      structure.specialAllowance +
      structure.otherAllowance

    const totalDeduction =
      structure.pfDeduction +
      structure.esiDeduction +
      structure.professionalTax +
      structure.otherDeduction

    await prisma.payrollItem.create({
      data: {
        employeeId: structure.employeeId,
        month: 3,
        year: 2026,
        basicSalary: structure.basicSalary,
        hra: structure.hra,
        conveyanceAllowance: structure.conveyanceAllowance,
        medicalAllowance: structure.medicalAllowance,
        specialAllowance: structure.specialAllowance,
        otherAllowance: structure.otherAllowance,
        grossSalary: totalEarnings,
        pfDeduction: structure.pfDeduction,
        esiDeduction: structure.esiDeduction,
        professionalTax: structure.professionalTax,
        otherDeduction: structure.otherDeduction,
        totalDeduction,
        netSalary: totalEarnings - totalDeduction,
        paidDays: 31,
        status: "PAID",
        paidAt: new Date('2026-03-31'),
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      module: "AUTH",
      action: "LOGIN",
      description: 'Admin user login',
      ipAddress: '127.0.0.1',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: hrUser.id,
      module: "PAYROLL",
      action: "CREATE",
      description: `Processed payroll for March 2026 - ${salaryStructures.length} employees`,
    },
  })

  await prisma.auditLog.create({
    data: {
      module: "SETTINGS",
      action: "CREATE",
      description: 'Company settings initialized',
    },
  })

  console.log('Database seeded successfully!')
  if (process.env.NODE_ENV === 'development') {
    console.log('Development seed credentials (set via env vars to override):')
    console.log('  Admin:       admin@company.com')
    console.log('  HR Manager:  hr@company.com')
    console.log('  Employee:    rahul.verma@company.com')
    console.log('  Passwords can be set via SEED_ADMIN_PASSWORD, SEED_HR_PASSWORD, SEED_EMP_PASSWORD env vars')
  }

  // --- Admin Account Template (uncomment and fill in to create additional admins) ---
  // const newAdminPassword = await bcrypt.hash('YourSecurePasswordHere', 12)
  // const newAdmin = await prisma.employee.create({
  //   data: {
  //     employeeCode: 'EMP999',
  //     firstName: 'John',
  //     lastName: 'Doe',
  //     email: 'john.doe@company.com',
  //     phone: '+91-9876543000',
  //     gender: "MALE",
  //     dateOfBirth: new Date('1990-01-01'),
  //     emergencyContactName: 'Emergency Contact',
  //     emergencyContactPhone: '+91-9876543001',
  //     department: 'Administration',
  //     designation: 'Admin',
  //     employmentType: "FULL_TIME",
  //     joiningDate: new Date('2024-01-01'),
  //     status: "ACTIVE",
  //     address: '123 Admin Street',
  //     city: 'Mumbai',
  //     state: 'Maharashtra',
  //     pincode: '400001',
  //     panNumber: 'ABCDE1234F',
  //     aadhaarNumber: '123456789012',
  //     bankName: 'State Bank of India',
  //     accountNumber: '12345678901',
  //     ifscCode: 'SBIN0001234',
  //   },
  // })
  // await prisma.user.create({
  //   data: {
  //     email: 'john.doe@company.com',
  //     password: newAdminPassword,
  //     role: "ADMIN",
  //     employeeId: newAdmin.id,
  //   },
  // })
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
