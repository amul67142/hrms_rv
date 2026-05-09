const { PrismaClient } = require('@prisma/client')

async function testConnection(label, url) {
  console.log(`\n--- Testing: ${label} ---`)
  try {
    const prisma = new PrismaClient({ datasources: { db: { url } } })
    await prisma.$connect()
    const user = await prisma.user.findFirst()
    console.log('SUCCESS! User:', user ? user.email : 'no users yet')
    await prisma.$disconnect()
    return true
  } catch (e) {
    console.log('FAILED:', e.message.split('\n').slice(0, 3).join(' '))
    return false
  }
}

async function main() {
  const ok = await testConnection(
    'Transaction Pooler',
    'postgresql://postgres.miyirtwumymnjfdshind:RealvibeProd2026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
  )

  if (ok) {
    await testConnection(
      'Direct URL',
      'postgresql://postgres:RealvibeProd2026@db.miyirtwumymnjfdshind.supabase.co:5432/postgres'
    )
  }
}

main()
