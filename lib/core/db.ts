import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

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

/** Lazy-initialise Prisma so that the client is NOT created at module-import
 *  time.  This prevents the Vercel build from crashing when there is no
 *  database reachable during static page collection.                       */
function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma

  const client = createPrismaClient()
  globalForPrisma.prisma = client

  // Register graceful shutdown handlers only once, at runtime
  if (typeof process !== 'undefined' && process.on) {
    process.on('SIGINT', async () => {
      console.log('[Prisma] Closing connections on SIGINT...')
      await client.$disconnect()
      process.exit(0)
    })
    process.on('SIGTERM', async () => {
      console.log('[Prisma] Closing connections on SIGTERM...')
      await client.$disconnect()
      process.exit(0)
    })
  }

  return client
}

// Use a Proxy so that `prisma` can be imported as a module-level value
// but the underlying PrismaClient is only created on first property access.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaClient() as Record<string | symbol, unknown>)[prop]
  },
})
