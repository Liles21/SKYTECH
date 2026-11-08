import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    const contentType = request.headers.get('content-type') || '';
    let referenceNumber = existing.referenceNumber || '';
    let paymentMethod = existing.paymentMethod || 'Walk-in';
    let receiptUrl: string | null = existing.receiptImage || null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      referenceNumber = (formData.get('referenceNumber') as string) || referenceNumber;
      paymentMethod = (formData.get('paymentMethod') as string) || paymentMethod;

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
      referenceNumber = body.referenceNumber || referenceNumber;
      paymentMethod = body.paymentMethod || paymentMethod;
      if (body.receiptImage) {
        receiptUrl = body.receiptImage;
      }
    }

    // Update bill to Paid and deduct from subscriber's due bills
    const confirmedBill = await prisma.bill.update({
      where: { id },
      data: {
        status: 'Paid',
        paymentStatus: 'Paid',
        paymentMethod,
        referenceNumber,
        receiptImage: receiptUrl,
        paidAt: new Date(),
      },
      include: { subscriber: { select: { name: true } } },
    });

    // Send confirmation notification to subscriber
    try {
      await prisma.notification.create({
        data: {
          forRole: 'subscriber',
          forUserId: existing.subscriberId,
          type: 'billing',
          title: `${paymentMethod} Payment Confirmed & Balance Deducted`,
          body: `Your ${paymentMethod} payment of ₱${Number(confirmedBill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} (Ref #${confirmedBill.referenceNumber || 'Approved'}) has been verified and confirmed. Your due bill is cleared!`,
        },
      });
    } catch (notifErr) {
      console.warn('Failed to send notification to subscriber:', notifErr);
    }

    return NextResponse.json({ data: confirmedBill, error: null });
  } catch (error) {
    console.error('Failed to confirm bill payment:', error);
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Confirmation failed.' },
      { status: 500 }
    );
  }
}
