import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/app/lib/api';

function getMonthlyDueDate(year: number, monthIndex: number, billingDay: number) {
	const lastDayOfMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	const safeDay = Math.min(Math.max(1, billingDay), lastDayOfMonth);
	return new Date(Date.UTC(year, monthIndex, safeDay, 12, 0, 0, 0));
}

function getDueDateForBillingPeriod(billingPeriod: string | null | undefined, billingDay = 30) {
	if (!billingPeriod || !/^\d{4}-\d{2}$/.test(billingPeriod)) {
		return null;
	}
	const [yearStr, monthStr] = billingPeriod.split('-');
	const year = Number(yearStr);
	const monthIndex = Number(monthStr) - 1;
	if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
		return null;
	}
	return getMonthlyDueDate(year, monthIndex, billingDay);
}

function getFallbackPlanPrice(plan: string): number {
	const normalized = plan.toLowerCase();
	if (normalized.includes('300')) return 1499;
	if (normalized.includes('200')) return 1299;
	if (normalized.includes('100')) return 999;
	if (normalized.includes('50')) return 799;
	if (normalized.includes('25')) return 599;
	return 999;
}

const cutoffDay = 9;

export async function GET(request: Request) {
	const access = await requireRole(['admin', 'subscriber']);
	if (access.response) return access.response;

	const status = new URL(request.url).searchParams.get('status');
	const isSubscriber = access.session?.user?.role === 'subscriber';
	let subscriberId = isSubscriber ? access.session?.user?.subscriberId : new URL(request.url).searchParams.get('subscriberId');

	// If subscriberId wasn't stored on the session token, resolve it by email
	if (isSubscriber && !subscriberId && access.session?.user?.email) {
		const matchedSub = await prisma.subscriber.findFirst({
			where: { email: { equals: access.session.user.email, mode: 'insensitive' } },
			select: { id: true },
		});
		if (matchedSub) {
			subscriberId = matchedSub.id;
		}
	}

	const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
	const billingDay = Number(systemSettings?.billingDay ?? 30);
	const plans = Array.isArray(systemSettings?.plans) ? systemSettings.plans as Array<{ name?: string; price?: number }> : [];

	const currentDate = new Date();
	const currentBillingPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

	// Fetch existing bills
	const isPendingFilter = status === 'Pending' || status === 'Pending_Confirmation';
	let bills = await prisma.bill.findMany({
		where: {
			...(subscriberId ? { subscriberId } : {}),
			...(isPendingFilter
				? { paymentStatus: 'Pending_Confirmation' }
				: status && status !== 'All' && ['Paid', 'Unpaid', 'Overdue'].includes(status)
					? { status: status as 'Paid' | 'Unpaid' | 'Overdue' }
					: {}),
		},
		orderBy: { dueDate: 'desc' },
		include: { subscriber: { select: { name: true, plan: true } } },
	});

	// If a subscriber has no bills yet in the database, automatically initialize one for their plan
	if (isSubscriber && subscriberId && bills.length === 0) {
		const sub = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
		if (sub) {
			const planClean = sub.plan.replace(/_/g, ' ');
			const matchedPlan = plans.find((p) => p.name?.replace(/\s+/g, '').toLowerCase() === planClean.replace(/\s+/g, '').toLowerCase());
			const amount = matchedPlan?.price != null ? Number(matchedPlan.price) : getFallbackPlanPrice(sub.plan);

			const billId = `BILL-${sub.id}-${currentBillingPeriod}`;
			const dueDate = getMonthlyDueDate(currentDate.getFullYear(), currentDate.getMonth(), billingDay);
			const newBill = await prisma.bill.upsert({
				where: { id: billId },
				update: {},
				create: {
					id: billId,
					subscriberId: sub.id,
					plan: sub.plan,
					billingPeriod: currentBillingPeriod,
					amount,
					dueDate,
					status: 'Unpaid',
				},
				include: { subscriber: { select: { name: true, plan: true } } },
			});
			bills = [newBill];
		}
	}

	const normalizedBills = bills.map((bill) => ({
		...bill,
		dueDate: getDueDateForBillingPeriod(bill.billingPeriod, billingDay) ?? bill.dueDate,
	}));

	return NextResponse.json({
		data: normalizedBills,
		billingDay,
		cutoffDay,
		error: null,
	});
}
