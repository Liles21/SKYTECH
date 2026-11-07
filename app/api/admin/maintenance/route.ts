import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { broadcastMaintenanceAnnouncement } from '@/app/lib/mailer';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const [settings, recentLogs, subscriberCount] = await Promise.all([
      prisma.systemSettings.findUnique({
        where: { id: 'singleton' },
      }),
      prisma.maintenanceLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.subscriber.count({ where: { archived: false } }),
    ]);

    return NextResponse.json({
      data: {
        settings: settings || {
          maintenanceMode: false,
          maintenanceType: 'Scheduled Maintenance',
          maintenanceImpact: 'Slow_Internet',
          maintenanceTitle: 'Network Maintenance Notice',
          maintenanceMessage: 'We are conducting fiber optical network maintenance. Internet speeds may be degraded or temporarily unavailable.',
          maintenanceStartTime: null,
          maintenanceEndTime: null,
          smtpUser: '',
          smtpPass: '',
          smtpHost: '',
          smtpPort: 587,
        },
        recentLogs,
        subscriberCount,
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to fetch maintenance details' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      maintenanceMode,
      maintenanceType,
      maintenanceImpact,
      maintenanceTitle,
      maintenanceMessage,
      maintenanceStartTime,
      maintenanceEndTime,
      broadcastEmail,
      smtpUser,
      smtpPass,
      smtpHost,
      smtpPort,
    } = body;

    const updateData: {
      maintenanceMode?: boolean;
      maintenanceType?: string;
      maintenanceImpact?: string;
      maintenanceTitle?: string;
      maintenanceMessage?: string;
      maintenanceStartTime?: Date | null;
      maintenanceEndTime?: Date | null;
      maintenanceUpdatedAt: Date;
      smtpUser?: string;
      smtpPass?: string;
      smtpHost?: string;
      smtpPort?: number;
    } = {
      maintenanceMode: Boolean(maintenanceMode),
      maintenanceType: maintenanceType || 'Scheduled Maintenance',
      maintenanceImpact: maintenanceImpact || 'Slow_Internet',
      maintenanceTitle: maintenanceTitle || 'Network Maintenance Notice',
      maintenanceMessage: maintenanceMessage || '',
      maintenanceStartTime: maintenanceStartTime ? new Date(maintenanceStartTime) : null,
      maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null,
      maintenanceUpdatedAt: new Date(),
    };

    if (smtpUser !== undefined) updateData.smtpUser = smtpUser;
    if (smtpPass !== undefined) updateData.smtpPass = smtpPass;
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost;
    if (smtpPort !== undefined) updateData.smtpPort = Number(smtpPort) || 587;

    const updatedSettings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: {
        id: 'singleton',
        companyName: 'Sky-Tech Fiber ISP',
        companyEmail: 'support@skytech.net',
        phone: '0917-SKY-TECH',
        address: 'Poblacion, Sibagat, Agusan del Norte',
        lateFeePercent: 5,
        gracePeriodDays: 7,
        billingDay: 1,
        plans: [],
        ...updateData,
      },
    });

    let broadcastResult = null;
    if (broadcastEmail) {
      broadcastResult = await broadcastMaintenanceAnnouncement({
        type: updateData.maintenanceType || 'Scheduled Maintenance',
        impact: updateData.maintenanceImpact || 'Slow_Internet',
        title: updateData.maintenanceTitle || 'Network Maintenance Notice',
        message: updateData.maintenanceMessage || '',
        startTime: updateData.maintenanceStartTime,
        endTime: updateData.maintenanceEndTime,
        sentBy: session.user.name || session.user.email || 'Admin',
      });
    }

    return NextResponse.json({
      data: {
        settings: updatedSettings,
        broadcastResult,
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to update maintenance settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ data: null, error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { type, impact, title, message, startTime, endTime } = body;

    if (!title || !message) {
      return NextResponse.json(
        { data: null, error: 'Title and message details are required to send an announcement.' },
        { status: 400 }
      );
    }

    const broadcastResult = await broadcastMaintenanceAnnouncement({
      type: type || 'Scheduled Maintenance',
      impact: impact || 'Slow_Internet',
      title,
      message,
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      sentBy: session.user.name || session.user.email || 'Admin',
    });

    return NextResponse.json({ data: broadcastResult, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Failed to broadcast announcement' },
      { status: 500 }
    );
  }
}

