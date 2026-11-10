import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/app/lib/api';
import { getAuditLogs, getAuditStats, recordAuditLog } from '@/app/lib/audit';

export async function GET(request: NextRequest) {
  const { session, response } = await requireRole(['admin']);
  if (response) return response;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || undefined;
  const entity = searchParams.get('entity') || undefined;
  const action = searchParams.get('action') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const [{ logs, total }, stats] = await Promise.all([
      getAuditLogs({ query, entity, action, limit, offset }),
      getAuditStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        stats,
      },
    });
  } catch (error) {
    console.error('Audit logs API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve audit logs.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireRole(['admin']);
  if (response) return response;

  try {
    const body = await request.json();
    if (!body.action || !body.entity || !body.details) {
      return NextResponse.json(
        { success: false, error: 'Missing required audit fields: action, entity, details.' },
        { status: 400 }
      );
    }

    await recordAuditLog({
      action: body.action,
      entity: body.entity,
      entityId: body.entityId || null,
      details: body.details,
      userId: session?.user?.id || null,
      userName: session?.user?.name || 'Administrator',
      userRole: session?.user?.role || 'admin',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      status: body.status || 'SUCCESS',
    });

    return NextResponse.json({ success: true, message: 'Audit log recorded.' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to record audit log.' },
      { status: 500 }
    );
  }
}

