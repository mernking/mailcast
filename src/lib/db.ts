import { PrismaClient } from '@prisma/client'

// The running dev server keeps the PrismaClient instance on globalThis
// across hot reloads. When the Prisma schema gains new fields the cached
// instance can reject them at runtime; tagging the cache with a schema
// version lets us invalidate it on the next module eval without restarting
// the dev server.
const PRISMA_CACHE_VERSION = 'cid-images-1'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaCacheVersion?: string
}

if (
  globalForPrisma.prisma &&
  globalForPrisma.__prismaCacheVersion !== PRISMA_CACHE_VERSION
) {
  try {
    globalForPrisma.prisma.$disconnect()
  } catch {
    /* no-op */
  }
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.__prismaCacheVersion = PRISMA_CACHE_VERSION
}
