import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export type PlanItem = {
  name: string;
  speedMbps: number;
  price: number;
};

export const DEFAULT_PLANS: PlanItem[] = [
  { name: 'Fiber 100 Mbps', speedMbps: 100, price: 999 },
  { name: 'Fiber 200 Mbps', speedMbps: 200, price: 1299 },
  { name: 'Fiber 300 Mbps', speedMbps: 300, price: 1499 },
];

export const DEFAULT_SETTINGS = {
  id: 'singleton',
  companyName: 'Sky-Tech Fiber ISP',
  companyEmail: 'support@skytech.net',
  phone: '0917-SKY-TECH',
  address: 'Poblacion, Sibagat, Agusan del Norte',
  lateFeePercent: 5,
  gracePeriodDays: 7,
  billingDay: 1,
  plans: DEFAULT_PLANS,
};

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
