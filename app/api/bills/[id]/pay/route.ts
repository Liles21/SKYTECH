import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

function getFallbackPlanPrice(plan: string): number {
  const normalized = plan.toLowerCase();
  if (normalized.includes('300')) return 1499;
  if (normalized.includes('200')) return 1299;
  if (normalized.includes('100')) return 999;
  if (normalized.includes('50')) return 799;
  if (normalized.includes('25')) return 599;
  return 999;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireRole(['admin', 'subscriber']);
    if (access.response) return access.response;

    const { id } = await context.params;
    const isSubscriber = access.session?.user?.role === 'subscriber';
    const subscriberId = access.session?.user?.subscriberId;
    const userEmail = access.session?.user?.email;

    let existing = await prisma.bill.findUnique({
      where: { id },
      include: { subscriber: { select: { id: true, name: true, email: true } } },
    });

    // If bill record was not yet persisted, auto-initialize if ID matches BILL-{subId}-{YYYY-MM}
    if (!existing) {
      const match = id.match(/^BILL-(.+)-(\d{4}-\d{2})$/);
      if (match) {
        const [, parsedSubId, billingPeriod] = match;
        const sub = await prisma.subscriber.findUnique({ where: { id: parsedSubId } });
        if (sub) {
          const [yearStr, monthStr] = billingPeriod.split('-');
          const dueDate = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, 30, 12, 0, 0, 0));
          existing = await prisma.bill.create({
            data: {
              id,
              subscriberId: sub.id,
              plan: sub.plan,
              billingPeriod,
              amount: getFallbackPlanPrice(sub.plan),
              dueDate,
              status: 'Unpaid',
              paymentStatus: 'Unpaid',
            },
            include: { subscriber: { select: { id: true, name: true, email: true } } },
          });
        }
      }
    }

    if (!existing) {
      return NextResponse.json({ data: null, error: 'Bill not found.' }, { status: 404 });
    }

    // If subscriber, ensure this bill belongs to them
    if (isSubscriber) {
      let resolvedSubId = subscriberId;
      if (!resolvedSubId && userEmail) {
        const matchedSub = await prisma.subscriber.findFirst({
          where: { email: { equals: userEmail, mode: 'insensitive' } },
          select: { id: true },
        });
        if (matchedSub) resolvedSubId = matchedSub.id;
      }

      const isOwner =
        existing.subscriberId === resolvedSubId ||
        (userEmail && existing.subscriber?.email?.toLowerCase() === userEmail.toLowerCase());
      if (!isOwner) {
        return NextResponse.json({ data: null, error: 'Unauthorized to pay this bill.' }, { status: 403 });
      }
    }

    const contentType = request.headers.get('content-type') || '';
    let paymentMethod = 'GCash';
    let referenceNumber = '';
    let receiptUrl: string | null = existing.receiptImage || null;
    let action = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      paymentMethod = (formData.get('paymentMethod') as string) || 'GCash';
      referenceNumber = (formData.get('referenceNumber') as string) || '';
      action = (formData.get('action') as string) || '';

      const receiptImageField = formData.get('receiptImage');
      if (typeof receiptImageField === 'string' && receiptImageField.trim()) {
        receiptUrl = receiptImageField.trim();
      }

      const file = formData.get('receipt');
      if (
        !receiptUrl?.startsWith('data:') &&
        file &&
        typeof file === 'object' &&
        'arrayBuffer' in file &&
        (file as Blob).size > 0
      ) {
        const blob = file as File;
        const bytes = await blob.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const mimeType =
          blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
        receiptUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      paymentMethod = body.paymentMethod || 'GCash';
      referenceNumber = body.referenceNumber || '';
      action = body.action || '';
      if (body.receiptImage) {
        receiptUrl = body.receiptImage;
      }
    }

    // Admin direct confirmation / payment
    if (!isSubscriber && action === 'confirm') {
      const confirmedBill = await prisma.bill.update({
        where: { id },
        data: {
          status: 'Paid',
          paymentStatus: 'Paid',
          paymentMethod: paymentMethod || existing.paymentMethod || 'GCash',
          referenceNumber: referenceNumber || existing.referenceNumber || undefined,
          receiptImage: receiptUrl,
          paidAt: new Date(),
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
            title: 'Payment Confirmed & Bill Cleared',
            body: `Your payment of ₱${Number(confirmedBill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} (Ref: ${confirmedBill.referenceNumber || 'Approved'}) has been verified and confirmed by admin. Your due balance has been deducted!`,
          },
        });
      } catch (notifErr) {
        console.warn('Failed to dispatch subscriber notification:', notifErr);
      }

      return NextResponse.json({ data: confirmedBill, error: null });
    }

    // Subscriber GCash / Walk-in payment submission
    if (!referenceNumber.trim()) {
      return NextResponse.json(
        { data: null, error: 'Reference / Transaction Number is required.' },
        { status: 400 }
      );
    }

    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        receiptImage: receiptUrl,
        paymentStatus: 'Pending_Confirmation',
        // Status remains Unpaid until Admin confirms!
      },
      include: { subscriber: { select: { name: true } } },
    });

    // Notify Admins about the pending payment verification
    try {
      await prisma.notification.create({
        data: {
          forRole: 'admin',
          type: 'billing',
          title: `${paymentMethod} Payment Awaiting Confirmation`,
          body: `Subscriber ${existing.subscriber?.name || existing.subscriberId} submitted ${paymentMethod} payment of ₱${Number(updatedBill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} with Ref #${referenceNumber.trim()}. Please review receipt and confirm.`,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to dispatch admin notification:', notifErr);
    }

    return NextResponse.json({ data: updatedBill, error: null });
  } catch (error) {
    console.error('Failed to process bill payment:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Payment submission failed.' },
      { status: 500 }
    );
  }
}
