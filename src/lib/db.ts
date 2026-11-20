import { PrismaClient } from '@prisma/client'

// The one Prisma client the whole app shares. The global cache stops
// `next dev` hot-reloads from opening a new SQLite connection per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
