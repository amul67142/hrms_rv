import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function main() {
  const prisma = new PrismaClient()

  console.log('🗑️  Wiping all data...')

  // Delete in dependency order (children first)
  await prisma.notification.deleteMany({})
  await prisma.task.deleteMany({})
  await prisma.attendance.deleteMany({})
  await prisma.attendanceRegularization.deleteMany({})
  await prisma.leaveRequest.deleteMany({})
  await prisma.leaveBalance.deleteMany({})
  await prisma.salaryStructure.deleteMany({})
  await prisma.payrollItem.deleteMany({})
  await prisma.ticket.deleteMany({})
  await prisma.reimbursement.deleteMany({})
  await prisma.resignation.deleteMany({})
  await prisma.hRLetter.deleteMany({})
  await prisma.employeeDocument.deleteMany({})
  await prisma.learningRequest.deleteMany({})
  await prisma.toolRequest.deleteMany({})
  await prisma.tool.deleteMany({})
  await prisma.learningModule.deleteMany({})
  await prisma.learningProgress.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.loginSession.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.employee.deleteMany({})
  await prisma.department.deleteMany({})
  await prisma.announcement.deleteMany({})
  await prisma.holiday.deleteMany({})
  await prisma.esslSyncLog.deleteMany({})
  await prisma.esslSetting.deleteMany({})
  await prisma.smtpSetting.deleteMany({})
  await prisma.companySetting.deleteMany({})

  console.log('✅ All data wiped.')

  // Create the single admin user
  const hashedPassword = await bcrypt.hash('123456', 12)

  const employee = await prisma.employee.create({
    data: {
      employeeCode: 'EMP-ADMIN',
      firstName: 'Admin',
      lastName: 'Realvibe',
      email: 'care@realvibe.in',
      department: 'Management',
      designation: 'Administrator',
      joiningDate: new Date(),
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      profileCompleted: true,
    },
  })

  await prisma.user.create({
    data: {
      email: 'care@realvibe.in',
      password: hashedPassword,
      role: 'ADMIN',
      employeeId: employee.id,
    },
  })

  console.log('✅ Admin account created:')
  console.log('   Email: care@realvibe.in')
  console.log('   Password: 123456')
  console.log('   Role: ADMIN')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ Error:', e)
  process.exit(1)
})
