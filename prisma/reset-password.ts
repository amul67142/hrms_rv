import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'amul@realvibe.in'
  const newPassword = '123456'

  const hashed = await bcrypt.hash(newPassword, 12)

  // Check if user exists
  const user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    })
    console.log(`✅ Password reset for ${email}`)
    console.log(`   Role: ${user.role}`)
  } else {
    console.log(`❌ User "${email}" not found in database.`)
    console.log('\nExisting users:')
    const users = await prisma.user.findMany({
      select: { email: true, role: true },
    })
    users.forEach(u => console.log(`   ${u.email} (${u.role})`))
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
