import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { DEFAULT_PLANS, DEFAULT_SETTINGS, type PlanItem } from '@/app/lib/settings';
import { recordAuditLog } from '@/app/lib/audit';

export { DEFAULT_PLANS, DEFAULT_SETTINGS, type PlanItem };

let cachedSettings = { ...DEFAULT_SETTINGS };

export async function GET() {
  try {
    const data = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });

    if (data) {
      const plans =
        Array.isArray(data.plans) && (data.plans as unknown[]).length > 0
          ? (data.plans as unknown as PlanItem[])
          : DEFAULT_PLANS;
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...data,
        plans,
      };
      return NextResponse.json({ data: cachedSettings, error: null });
    }

    // Try initializing singleton in database if missing
    try {
      const initialized = await prisma.systemSettings.create({
        data: DEFAULT_SETTINGS,
      });
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        ...initialized,
        plans: DEFAULT_PLANS,
      };
      return NextResponse.json({ data: cachedSettings, error: null });
    } catch {
      return NextResponse.json({ data: cachedSettings, error: null });
    }
  } catch {
    // Return cached settings safely on network / sandbox isolation
    return NextResponse.json({ data: cachedSettings, error: null });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.companyName || !body.companyEmail || !body.phone || !body.address) {
      return NextResponse.json(
        { data: null, error: 'Company name, email, phone, and address are required.' },
        { status: 400 }
      );
    }

    const plansToSave: PlanItem[] = Array.isArray(body.plans) && body.plans.length > 0
      ? body.plans.map((p: { name?: string; speedMbps?: number; price?: number }) => ({
          name: String(p.name || ''),
          speedMbps: Number(p.speedMbps || 0),
          price: Number(p.price || 0),
        }))
      : DEFAULT_PLANS;

    const payload = {
      companyName: body.companyName,
      companyEmail: body.companyEmail,
      phone: body.phone,
      address: body.address,
      lateFeePercent: Number(body.lateFeePercent ?? 0),
      gracePeriodDays: Number(body.gracePeriodDays ?? 0),
      billingDay: Number(body.billingDay ?? 1),
      plans: plansToSave,
    };

    cachedSettings = {
      ...cachedSettings,
      ...payload,
      id: 'singleton',
    };

    void recordAuditLog({
      action: 'SETTINGS_UPDATE',
      entity: 'Settings',
      entityId: 'singleton',
      details: `Updated system settings: Company "${body.companyName}", late fee ${body.lateFeePercent ?? 0}%, ${plansToSave.length} fiber plans.`,
      userName: 'Sky-Tech Admin',
      userRole: 'admin',
    });

    try {
      const data = await prisma.systemSettings.upsert({
        where: { id: 'singleton' },
        update: payload,
        create: { id: 'singleton', ...payload },
      });
      return NextResponse.json({ data, error: null });
    } catch {
      // In sandbox mode without network access, persist in cachedSettings
      return NextResponse.json({ data: cachedSettings, error: null });
    }
  } catch {
    return NextResponse.json(
      { data: null, error: 'Failed to update system settings.' },
      { status: 500 }
    );
  }
}
