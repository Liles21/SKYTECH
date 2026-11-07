import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

function getFallbackSpeed(plan: string): number {
  const match = plan.match(/[0-9]+/);
  return match ? Number(match[0]) : 100;
}

function getFallbackPrice(plan: string): number {
  const normalized = plan.toLowerCase();
  if (normalized.includes('300')) return 1499;
  if (normalized.includes('200')) return 1299;
  if (normalized.includes('100')) return 999;
  if (normalized.includes('50')) return 799;
  if (normalized.includes('25')) return 599;
  return 999;
}

export async function GET() {
  const access = await requireRole(['subscriber']);
  if (access.response) return access.response;

  let subscriberId = access.session?.user?.subscriberId;
  const userEmail = access.session?.user?.email;

  if (!subscriberId && userEmail) {
    const matched = await prisma.subscriber.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' } },
    });
    if (matched) subscriberId = matched.id;
  }

  if (!subscriberId) {
    return NextResponse.json(
      { data: null, error: 'Subscriber account is not linked.' },
      { status: 404 }
    );
  }

  const [subscriber, systemSettings] = await Promise.all([
    prisma.subscriber.findUnique({ where: { id: subscriberId } }),
    prisma.systemSettings.findUnique({ where: { id: 'singleton' } }),
  ]);

  if (!subscriber) {
    return NextResponse.json(
      { data: null, error: 'Subscriber account was not found.' },
      { status: 404 }
    );
  }

  const plans = Array.isArray(systemSettings?.plans)
    ? (systemSettings.plans as Array<{ name?: string; speedMbps?: number; price?: number }>)
    : [];
  const planName = subscriber.plan.replace(/_/g, ' ');
  const planDetails = plans.find(
    (plan) =>
      plan.name?.replace(/\s+/g, '').toLowerCase() === planName.replace(/\s+/g, '').toLowerCase()
  );

  return NextResponse.json({
    data: {
      ...subscriber,
      planName,
      speedMbps: Number(planDetails?.speedMbps || getFallbackSpeed(planName)),
      monthlyPrice: Number(planDetails?.price || getFallbackPrice(planName)),
      cutoffDay: 9,
      billingDay: Number(systemSettings?.billingDay ?? 30),
    },
    error: null,
  });
}
