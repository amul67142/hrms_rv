const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const p = new PrismaClient()

  // List all users
  const users = await p.user.findMany({ select: { id: true, email: true, role: true } })
  console.log('Current users in database:')
  users.forEach(u => console.log(`  ${u.email} (${u.role})`))

  // Check if care@realvibe.in exists
  const admin = await p.user.findUnique({ where: { email: 'care@realvibe.in' } })
  if (!admin) {
    console.log('\nAdmin care@realvibe.in NOT FOUND. Creating...')
    const hash = await bcrypt.hash('123456', 12)
    const emp = await p.employee.create({
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
    await p.user.create({
      data: {
        email: 'care@realvibe.in',
        password: hash,
        role: 'ADMIN',
        employeeId: emp.id,
      },
    })
    console.log('Admin created: care@realvibe.in / 123456')
  } else {
    console.log(`\nAdmin found: ${admin.email} (${admin.role})`)
    const match = await bcrypt.compare('123456', admin.password)
    console.log(`Password '123456' matches: ${match}`)
    if (!match) {
      const hash = await bcrypt.hash('123456', 12)
      await p.user.update({ where: { email: 'care@realvibe.in' }, data: { password: hash } })
      console.log('Password reset to 123456')
    }
  }

  await p.$disconnect()
}

main().catch(console.error)
