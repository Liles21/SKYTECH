import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
      select: {
        maintenanceMode: true,
        maintenanceType: true,
        maintenanceImpact: true,
        maintenanceTitle: true,
        maintenanceMessage: true,
        maintenanceStartTime: true,
        maintenanceEndTime: true,
        maintenanceUpdatedAt: true,
      },
    });

    if (!settings) {
      return NextResponse.json({
        data: {
          maintenanceMode: false,
          maintenanceType: 'Scheduled Maintenance',
          maintenanceImpact: 'Slow_Internet',
          maintenanceTitle: 'Network Maintenance Notice',
          maintenanceMessage: '',
          maintenanceStartTime: null,
          maintenanceEndTime: null,
        },
        error: null,
      });
    }

    return NextResponse.json({ data: settings, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        data: {
          maintenanceMode: false,
          maintenanceType: 'Scheduled Maintenance',
          maintenanceImpact: 'Slow_Internet',
          maintenanceTitle: 'Network Maintenance Notice',
          maintenanceMessage: '',
          maintenanceStartTime: null,
          maintenanceEndTime: null,
        },
        error: error instanceof Error ? error.message : 'Failed to load maintenance status',
      },
      { status: 200 }
    );
  }
}

