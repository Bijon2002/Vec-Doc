import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: config.nodeEnv === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
    });

if (config.nodeEnv !== 'production') {
    globalForPrisma.prisma = prisma;
}
