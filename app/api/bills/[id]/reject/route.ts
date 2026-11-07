import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireRole(['admin']);
  if (access.response) return access.response;

  const { id } = await context.params;

  const existing = await prisma.bill.findUnique({
    where: { id },
    include: { subscriber: { select: { id: true, name: true, email: true } } },
  });

  if (!existing) {
    return NextResponse.json({ data: null, error: 'Bill record not found.' }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'Invalid reference number or illegible receipt.';

    const rejectedBill = await prisma.bill.update({
      where: { id },
      data: {
        paymentStatus: 'Rejected',
        // Status stays Unpaid
      },
      include: { subscriber: { select: { name: true } } },
    });

    // Send notification to subscriber
    try {
      await prisma.notification.create({
        data: {
          forRole: 'subscriber',
          forUserId: existing.subscriberId,
          type: 'billing',
          title: 'GCash Payment Verification Declined',
          body: `Your payment submission for ${existing.billingPeriod} could not be confirmed: ${reason}. Please upload a valid receipt and reference number.`,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to send notification to subscriber:', notifErr);
    }

    return NextResponse.json({ data: rejectedBill, error: null });
  } catch (error) {
    console.error('Failed to reject bill payment:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Rejection failed.' },
      { status: 500 }
    );
  }
}

