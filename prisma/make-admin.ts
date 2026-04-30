import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  const updated = await prisma.user.update({
    where: { email: 'amul@realvibe.in' },
    data: { role: 'ADMIN' },
  })

  console.log(`✅ ${updated.email} upgraded to role: ${updated.role}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
