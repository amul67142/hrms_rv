import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function main() {
  const prisma = new PrismaClient()

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email: 'care@realvibe.in' },
    include: { employee: { select: { firstName: true, lastName: true } } },
  })

  if (!user) {
    console.log('❌ User care@realvibe.in NOT FOUND in database!')
    console.log('Creating fresh admin...')
    
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
    
    console.log('✅ Admin created: care@realvibe.in / 123456')
  } else {
    console.log(`✅ User found: ${user.email} (${user.role})`)
    console.log(`   Employee: ${user.employee?.firstName} ${user.employee?.lastName}`)
    console.log(`   Password hash: ${user.password.substring(0, 20)}...`)
    
    // Test if 123456 matches current hash
    const matches = await bcrypt.compare('123456', user.password)
    console.log(`   Password '123456' matches: ${matches}`)
    
    if (!matches) {
      console.log('🔄 Resetting password to 123456...')
      const newHash = await bcrypt.hash('123456', 12)
      await prisma.user.update({
        where: { email: 'care@realvibe.in' },
        data: { password: newHash },
      })
      
      // Verify
      const verify = await bcrypt.compare('123456', newHash)
      console.log(`   New hash verifies: ${verify}`)
      console.log('✅ Password reset to 123456')
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
