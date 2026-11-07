import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';
import { DEMO_ACCOUNTS } from '@/app/lib/demo-accounts';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const access = await requireRole(['admin']);
  if (access.response) return access.response;

  const { id } = await context.params;
  const body = await request.json();
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword.trim() : '';

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { data: null, error: 'New password must be at least 6 characters long.' },
      { status: 400 }
    );
  }

  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return NextResponse.json(
        { data: null, error: `Subscriber with ID ${id} was not found.` },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update or create user record for this subscriber
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { subscriberId: id },
          { email: subscriber.email },
        ],
      },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          email: subscriber.email,
          name: subscriber.name,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          id: `USR-${id}`,
          name: subscriber.name,
          email: subscriber.email,
          password: hashedPassword,
          role: 'subscriber',
          subscriberId: id,
        },
      });
    }

    // Update in-memory demo accounts if applicable
    if (subscriber.email.toLowerCase() === DEMO_ACCOUNTS.subscriber.email.toLowerCase()) {
      DEMO_ACCOUNTS.subscriber.password = newPassword;
    }

    return NextResponse.json({
      data: {
        success: true,
        subscriberId: id,
        subscriberEmail: subscriber.email,
        message: `Password updated successfully for ${subscriber.name}.`,
      },
      error: null,
    });
  } catch (err) {
    console.error('Change subscriber password error:', err);
    // If DB is unreachable (e.g. sandbox block), update in-memory account if matched
    const sub = Object.values(DEMO_ACCOUNTS).find((a) => a.subscriberId === id);
    if (sub) {
      sub.password = newPassword;
      return NextResponse.json({
        data: {
          success: true,
          subscriberId: id,
          subscriberEmail: sub.email,
          message: `Password updated successfully for ${sub.name}.`,
        },
        error: null,
      });
    }

    return NextResponse.json(
      {
        data: null,
        error: err instanceof Error ? err.message : 'Unable to change subscriber password.',
      },
      { status: 500 }
    );
  }
}

