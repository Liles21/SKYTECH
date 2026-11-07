import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireRole(['admin', 'subscriber']);
  if (access.response) return access.response;

  const { id } = await context.params;
  const isSubscriber = access.session?.user?.role === 'subscriber';
  const subscriberId = access.session?.user?.subscriberId;
  const userEmail = access.session?.user?.email;

  const existing = await prisma.bill.findUnique({
    where: { id },
    include: { subscriber: { select: { id: true, name: true, email: true } } },
  });

  if (!existing) {
    return NextResponse.json({ data: null, error: 'Bill not found.' }, { status: 404 });
  }

  // If subscriber, ensure this bill belongs to them
  if (isSubscriber) {
    const isOwner =
      existing.subscriberId === subscriberId ||
      (userEmail && existing.subscriber?.email?.toLowerCase() === userEmail.toLowerCase());
    if (!isOwner) {
      return NextResponse.json({ data: null, error: 'Unauthorized to pay this bill.' }, { status: 403 });
    }
  }

  try {
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

      const file = formData.get('receipt') as File | null;
      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let ext = 'jpg';
        if (file.type === 'image/png') ext = 'png';
        else if (file.type === 'image/webp') ext = 'webp';
        else if (file.type === 'image/jpeg') ext = 'jpg';

        const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `receipt-${safeId}-${Date.now()}.${ext}`;
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'receipts');
        await mkdir(uploadsDir, { recursive: true });
        const filepath = path.join(uploadsDir, filename);
        await writeFile(filepath, buffer);

        receiptUrl = `/uploads/receipts/${filename}`;
      }
    } else {
      const body = await request.json();
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

    // Subscriber GCash payment submission
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
