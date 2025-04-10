import { PrismaClient } from '@prisma/client';

// Check if we're in a build environment
const isBuildEnvironment = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SKIP_DB_CHECKS === 'true';

// Create a mock client for build time
const mockPrismaClient = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (prop === 'connect' || prop === 'disconnect') {
      return () => Promise.resolve();
    }
    
    // Return a proxy for any model
    return new Proxy({}, {
      get: () => {
        // Return a function that resolves with empty data for any operation
        return () => Promise.resolve([]);
      }
    });
  }
});

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  (() => {
    if (isBuildEnvironment) {
      console.log('Using mock Prisma client for build');
      return mockPrismaClient;
    }
    
    try {
      const client = new PrismaClient({
        log: ['error', 'warn'],
      });
      
      return client;
    } catch (error) {
      console.error('Failed to initialize Prisma client:', error);
      // Return mock client as fallback
      return mockPrismaClient;
    }
  })();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 