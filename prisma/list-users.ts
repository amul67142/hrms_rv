import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  const users = await p.user.findMany({ select: { email: true, role: true } })
  users.forEach(u => console.log(`${u.email} -> ${u.role}`))
  await p.$disconnect()
}

main()
