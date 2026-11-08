import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

export async function POST(request: Request) {
  try {
    const access = await requireRole(['subscriber', 'technician', 'admin']);
    if (access.response) return access.response;

    const subscriberId = access.session?.user?.subscriberId;
    const userEmail = access.session?.user?.email;

    let targetSubscriberId = subscriberId;
    if (!targetSubscriberId && userEmail) {
      const matched = await prisma.subscriber.findFirst({
        where: { email: { equals: userEmail, mode: 'insensitive' } },
      });
      if (matched) targetSubscriberId = matched.id;
    }

    if (!targetSubscriberId) {
      return NextResponse.json({ data: null, error: 'Subscriber account not found.' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';
    let imageUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
        return NextResponse.json({ data: null, error: 'No image file uploaded.' }, { status: 400 });
      }

      const blob = file as File;
      const bytes = await blob.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const mimeType =
        blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';

      imageUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    } else {
      // JSON payload (e.g. data URL or URL string)
      const body = await request.json();
      if (!body.image) {
        return NextResponse.json({ data: null, error: 'No image data provided.' }, { status: 400 });
      }
      imageUrl = body.image;
    }

    // Update in database
    await prisma.$transaction([
      prisma.subscriber.update({
        where: { id: targetSubscriberId },
        data: { image: imageUrl },
      }),
      prisma.user.updateMany({
        where: {
          OR: [
            { subscriberId: targetSubscriberId },
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        data: { image: imageUrl },
      }),
    ]);

    return NextResponse.json({ data: { image: imageUrl }, error: null });
  } catch (err) {
    console.error('Failed to upload avatar:', err);
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : 'Upload failed.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const access = await requireRole(['subscriber', 'technician', 'admin']);
  if (access.response) return access.response;

  const subscriberId = access.session?.user?.subscriberId;
  const userEmail = access.session?.user?.email;

  let targetSubscriberId = subscriberId;
  if (!targetSubscriberId && userEmail) {
    const matched = await prisma.subscriber.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' } },
    });
    if (matched) targetSubscriberId = matched.id;
  }

  if (!targetSubscriberId) {
    return NextResponse.json({ data: null, error: 'Subscriber account not found.' }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.subscriber.update({
        where: { id: targetSubscriberId },
        data: { image: null },
      }),
      prisma.user.updateMany({
        where: {
          OR: [
            { subscriberId: targetSubscriberId },
            ...(userEmail ? [{ email: userEmail }] : []),
          ],
        },
        data: { image: null },
      }),
    ]);

    return NextResponse.json({ data: { image: null }, error: null });
  } catch (err) {
    console.error('Failed to remove avatar:', err);
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : 'Removal failed.' },
      { status: 500 }
    );
  }
}

