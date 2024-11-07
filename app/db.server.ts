import { PrismaClient } from '@prisma/client'

declare const globalThis: { prisma?: PrismaClient } & typeof global

export const prisma = globalThis.prisma ?? new PrismaClient()
