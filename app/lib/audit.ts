import { prisma } from '@/app/lib/prisma';

export type AuditLogEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  status: string;
  createdAt: string;
};

let tableInitialized = false;

export async function ensureAuditTableExists() {
  if (tableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "action" TEXT NOT NULL,
        "entity" TEXT NOT NULL,
        "entityId" TEXT,
        "details" TEXT NOT NULL,
        "userId" TEXT,
        "userName" TEXT,
        "userRole" TEXT,
        "ipAddress" TEXT,
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx" ON "AuditLog"("entity");
    `);
    tableInitialized = true;
  } catch (err) {
    console.error('[Audit] Failed to ensure AuditLog table exists:', err);
  }
}

export async function recordAuditLog(entry: {
  action: string;
  entity: string;
  entityId?: string | null;
  details: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  status?: 'SUCCESS' | 'FAILED' | 'WARNING';
}) {
  try {
    await ensureAuditTableExists();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const status = entry.status || 'SUCCESS';

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog" ("id", "action", "entity", "entityId", "details", "userId", "userName", "userRole", "ipAddress", "status", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      id,
      entry.action,
      entry.entity,
      entry.entityId || null,
      entry.details,
      entry.userId || null,
      entry.userName || 'System Administrator',
      entry.userRole || 'admin',
      entry.ipAddress || null,
      status
    );
  } catch (err) {
    console.error('[Audit] Failed to record audit log:', err);
  }
}

export async function getAuditLogs(params?: {
  query?: string;
  entity?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  await ensureAuditTableExists();

  const limit = Math.min(params?.limit ?? 50, 100);
  const offset = params?.offset ?? 0;
  const conditions: string[] = [];
  const queryParams: unknown[] = [];

  if (params?.entity && params.entity !== 'All') {
    queryParams.push(params.entity);
    conditions.push(`"entity" = $${queryParams.length}`);
  }

  if (params?.action && params.action !== 'All') {
    queryParams.push(params.action);
    conditions.push(`"action" = $${queryParams.length}`);
  }

  if (params?.query && params.query.trim()) {
    queryParams.push(`%${params.query.trim().toLowerCase()}%`);
    const qIdx = queryParams.length;
    conditions.push(
      `(LOWER("details") LIKE $${qIdx} OR LOWER("userName") LIKE $${qIdx} OR LOWER("entityId") LIKE $${qIdx} OR LOWER("action") LIKE $${qIdx})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Check if table is empty, if so, seed sample audit logs
    const countCheck = await prisma.$queryRawUnsafe<[{ count: bigint | number }]>(
      'SELECT COUNT(*)::int as count FROM "AuditLog"'
    );
    const totalCountInDb = Number(countCheck[0]?.count || 0);

    if (totalCountInDb === 0) {
      await seedInitialAuditLogs();
    }

    const dataQuery = `
      SELECT "id", "action", "entity", "entityId", "details", "userId", "userName", "userRole", "ipAddress", "status", "createdAt"
      FROM "AuditLog"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "AuditLog"
      ${whereClause}
    `;

    const [rows, totalResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(dataQuery, ...queryParams),
      prisma.$queryRawUnsafe<[{ count: bigint | number }]>(countQuery, ...queryParams),
    ]);

    const total = Number(totalResult[0]?.count || 0);

    const logs: AuditLogEntry[] = rows.map((row) => ({
      id: String(row.id),
      action: String(row.action),
      entity: String(row.entity),
      entityId: row.entityId ? String(row.entityId) : null,
      details: String(row.details),
      userId: row.userId ? String(row.userId) : null,
      userName: row.userName ? String(row.userName) : 'System Administrator',
      userRole: row.userRole ? String(row.userRole) : 'admin',
      ipAddress: row.ipAddress ? String(row.ipAddress) : null,
      status: String(row.status || 'SUCCESS'),
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    }));

    return { logs, total };
  } catch (err) {
    console.error('[Audit] Failed to fetch audit logs:', err);
    return { logs: [], total: 0 };
  }
}

export async function getAuditStats() {
  await ensureAuditTableExists();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalRows, todayRows, securityRows, settingsRows] = await Promise.all([
      prisma.$queryRawUnsafe<[{ count: number }]>('SELECT COUNT(*)::int as count FROM "AuditLog"'),
      prisma.$queryRawUnsafe<[{ count: number }]>(
        'SELECT COUNT(*)::int as count FROM "AuditLog" WHERE "createdAt" >= $1',
        today
      ),
      prisma.$queryRawUnsafe<[{ count: number }]>(
        `SELECT COUNT(*)::int as count FROM "AuditLog" WHERE "action" IN ('LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'ROLE_CHANGE')`
      ),
      prisma.$queryRawUnsafe<[{ count: number }]>(
        `SELECT COUNT(*)::int as count FROM "AuditLog" WHERE "entity" IN ('Settings', 'System', 'Maintenance')`
      ),
    ]);

    return {
      total: Number(totalRows[0]?.count || 0),
      today: Number(todayRows[0]?.count || 0),
      security: Number(securityRows[0]?.count || 0),
      settings: Number(settingsRows[0]?.count || 0),
    };
  } catch {
    return { total: 0, today: 0, security: 0, settings: 0 };
  }
}

async function seedInitialAuditLogs() {
  const sampleEvents = [
    {
      action: 'SETTINGS_UPDATE',
      entity: 'Settings',
      entityId: 'singleton',
      details: 'Updated ISP system billing configuration and late fee parameters.',
      userName: 'Sky-Tech Admin',
      userRole: 'admin',
      ipAddress: '192.168.1.1',
      status: 'SUCCESS',
      offsetMinutes: 10,
    },
    {
      action: 'LOGIN',
      entity: 'User',
      entityId: 'admin@skytech.net',
      details: 'Admin logged into Sky-Tech Admin Console successfully.',
      userName: 'Sky-Tech Admin',
      userRole: 'admin',
      ipAddress: '192.168.1.1',
      status: 'SUCCESS',
      offsetMinutes: 45,
    },
    {
      action: 'PASSWORD_RESET',
      entity: 'Subscriber',
      entityId: '100000012',
      details: 'Administrator generated a secure reset password for subscriber Harry Banas.',
      userName: 'Sky-Tech Admin',
      userRole: 'admin',
      ipAddress: '192.168.1.1',
      status: 'SUCCESS',
      offsetMinutes: 120,
    },
    {
      action: 'UPDATE',
      entity: 'Subscriber',
      entityId: '100000002',
      details: 'Updated subscriber account status from Pending to Active.',
      userName: 'Sky-Tech Admin',
      userRole: 'admin',
      ipAddress: '192.168.1.1',
      status: 'SUCCESS',
      offsetMinutes: 240,
    },
    {
      action: 'CREATE',
      entity: 'Subscriber',
      entityId: '100000012',
      details: 'Registered new fiber subscriber Harry Banas on Fiber 100Mbps plan.',
      userName: 'Sky-Tech Admin',
      userRole: 'admin',
      ipAddress: '192.168.1.1',
      status: 'SUCCESS',
      offsetMinutes: 360,
    },
    {
      action: 'SYSTEM_INIT',
      entity: 'System',
      entityId: 'sys-core',
      details: 'Sky-Tech Fiber ISP Portal core services and database schema initialized.',
      userName: 'System Administrator',
      userRole: 'admin',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
      offsetMinutes: 1440,
    },
  ];

  for (const item of sampleEvents) {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const createdAt = new Date(Date.now() - item.offsetMinutes * 60 * 1000);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog" ("id", "action", "entity", "entityId", "details", "userId", "userName", "userRole", "ipAddress", "status", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      id,
      item.action,
      item.entity,
      item.entityId,
      item.details,
      'admin-core',
      item.userName,
      item.userRole,
      item.ipAddress,
      item.status,
      createdAt
    );
  }
}

