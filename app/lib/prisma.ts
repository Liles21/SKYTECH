import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

function resolveDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;

  if (process.env.NODE_ENV !== 'production') {
    try {
      const envPath = path.join(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
        if (match?.[1]) {
          url = match[1].trim();
          process.env.DATABASE_URL = url;
        }
      }
    } catch {
      // Fall back to process.env.DATABASE_URL
    }
  }

  if (url && url.includes('pgbouncer=true') && !url.includes('connection_limit=')) {
    url = `${url}&connection_limit=5&pool_timeout=20`;
  }

  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

const currentUrl = resolveDatabaseUrl();

if (globalForPrisma.prisma && globalForPrisma.prismaUrl !== currentUrl) {
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    currentUrl
      ? {
          datasources: {
            db: { url: currentUrl },
          },
        }
      : undefined,
  );

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaUrl = currentUrl;
}
