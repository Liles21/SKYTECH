import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
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
    const contentType = request.headers.get('content-type') || '';
    let imageUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ data: null, error: 'No image file uploaded.' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine extension
      let ext = 'jpg';
      if (file.type === 'image/png') ext = 'png';
      else if (file.type === 'image/webp') ext = 'webp';
      else if (file.type === 'image/gif') ext = 'gif';

      const filename = `subscriber-${targetSubscriberId}-${Date.now()}.${ext}`;
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
      await mkdir(uploadsDir, { recursive: true });
      const filepath = path.join(uploadsDir, filename);
      await writeFile(filepath, buffer);

      imageUrl = `/uploads/avatars/${filename}`;
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

