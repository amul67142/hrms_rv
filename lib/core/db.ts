import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function getDatabaseUrl() {
  const host = process.env.DB_HOST
  const port = process.env.DB_PORT || '3306'
  const user = process.env.DB_USER
  // Strip surrounding quotes that may come from some env parsers
  const password = (process.env.DB_PASSWORD || '').replace(/^["']|["']$/g, '')
  const database = process.env.DB_NAME

  if (host && user && database) {
    const encodedUser = encodeURIComponent(user)
    const encodedPassword = encodeURIComponent(password)
    return `mysql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`
  }

  return process.env.DATABASE_URL
}

function createPrismaClient() {
  const isProduction = process.env.NODE_ENV === 'production'
  const dbUrl = getDatabaseUrl()

  const client = new PrismaClient({
    log: isProduction
      ? ['warn', 'error']
      : ['query', 'warn', 'error'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

  client.$on('error' as never, (e: unknown) => {
    console.error('[Prisma] Error event:', e)
  })

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('[Prisma] Closing connections on SIGINT...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('[Prisma] Closing connections on SIGTERM...')
  await prisma.$disconnect()
  process.exit(0)
})
