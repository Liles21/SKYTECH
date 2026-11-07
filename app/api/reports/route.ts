import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET() {
  const now = new Date();

  try {
    const [bills, allSubscribers, technicians, tickets, installations, notifications, recentTickets] = await Promise.all([
      prisma.bill.findMany(),
      prisma.subscriber.findMany({
        select: { id: true, name: true, status: true, connectionDate: true },
      }),
      prisma.technician.count({ where: { status: 'Active' } }),
      prisma.ticket.count({ where: { status: { not: 'Closed' } } }),
      prisma.installation.findMany({
        orderBy: { date: 'desc' },
        take: 5,
        include: { technician: true },
      }),
      prisma.notification.findMany({
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
      prisma.ticket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { subscriber: true },
      }),
    ]);

    const subscriberById = new Map(allSubscribers.map((sub) => [sub.id, sub]));
    const subscriberRecords = allSubscribers.filter((sub) => sub.status === 'Active');

    const paidBills = bills.filter((bill) => bill.status === 'Paid');
    const collected = paidBills.reduce((total, bill) => total + bill.amount, 0);
    const pendingBills = bills.filter((bill) => bill.status !== 'Paid').length;

    const monthBuckets = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      return {
        monthDate,
        monthKey,
        label: monthLabels[monthDate.getMonth()],
        value: 0,
      };
    });

    const bucketByKey = new Map(monthBuckets.map((bucket) => [bucket.monthKey, bucket]));

    const toMonthKey = (dateValue: Date | string | null | undefined) => {
      if (!dateValue) return null;
      const parsed = new Date(dateValue);
      if (Number.isNaN(parsed.getTime())) return null;
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    };

    for (const bill of paidBills) {
      const periodKey = typeof bill.billingPeriod === 'string' ? bill.billingPeriod.trim() : '';
      const paidAtKey = toMonthKey(bill.paidAt);
      const dueDateKey = toMonthKey(bill.dueDate);

      const matchedBucket =
        bucketByKey.get(periodKey) ??
        (paidAtKey ? bucketByKey.get(paidAtKey) : undefined) ??
        (dueDateKey ? bucketByKey.get(dueDateKey) : undefined);

      if (matchedBucket) {
        matchedBucket.value = Number((matchedBucket.value + bill.amount).toFixed(2));
      }
    }

    const revenueTrend = monthBuckets.map(({ label, value }) => ({ label, value }));

    const growthTrend = revenueTrend.map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      return subscriberRecords.filter((subscriber) => subscriber.connectionDate < nextMonth).length;
    });

    return NextResponse.json({
      activeSubscribers: subscriberRecords.length,
      activeTechnicians: technicians,
      openTickets: tickets,
      revenueCollected: collected,
      pendingBills,
      totalBilled: bills.reduce((total, bill) => total + bill.amount, 0),
      billsByStatus: {
        paid: paidBills.length,
        unpaid: bills.filter((bill) => bill.status === 'Unpaid').length,
        overdue: bills.filter((bill) => bill.status === 'Overdue').length,
      },
      revenueTrend,
      growthTrend,
      recentInstallations: installations.map((installation) => ({
        id: installation.id,
        subscriber: subscriberById.get(installation.subscriberId)?.name || 'Unknown subscriber',
        technician: installation.technician?.name || 'Unassigned technician',
        date: installation.date || undefined,
        time: installation.time || undefined,
        status: installation.status,
      })),
      recentActivity: notifications.map((notification) => ({
        id: notification.id,
        text: notification.title,
        body: notification.body,
        date: notification.timestamp,
        tone: notification.type === 'billing' ? 'orange' : notification.type === 'system' ? 'blue' : 'green',
      })),
      recentSupportTickets: recentTickets.map((ticket) => ({
        id: ticket.id,
        subscriber: ticket.subscriber.name,
        concern: ticket.type.replace(/_/g, ' '),
        date: ticket.visitDate,
        time: ticket.visitTime,
        status: ticket.status,
      })),
      error: null,
    });
  } catch (error) {
    console.error('Failed to load reports data:', error);
    return NextResponse.json(
      {
        activeSubscribers: 0,
        activeTechnicians: 0,
        openTickets: 0,
        revenueCollected: 0,
        pendingBills: 0,
        totalBilled: 0,
        billsByStatus: { paid: 0, unpaid: 0, overdue: 0 },
        revenueTrend: Array.from({ length: 6 }, (_, index) => {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
          return { label: monthLabels[monthDate.getMonth()], value: 0 };
        }),
        growthTrend: [0, 0, 0, 0, 0, 0],
        recentInstallations: [],
        recentActivity: [],
        recentSupportTickets: [],
        error: 'Database connection error while loading reports.',
      },
      { status: 200 },
    );
  }
}
