'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CircleHelp,
  CreditCard,
  FileText,
  MessageSquare,
  Wifi,
  Wrench,
  Zap,
  X,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { Badge } from '@/app/components/Badge';
import { formatTicketStatus } from '@/app/lib/ticket-status';

const actions = [
  {
    label: 'Pay Bills',
    description: 'Instant online payment',
    href: '/subscriber/pay-bills',
    Icon: CreditCard,
    color: 'from-blue-600 to-indigo-600',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Plan Details',
    description: 'Speed & billing terms',
    href: '/subscriber/plan-details',
    Icon: Zap,
    color: 'from-sky-500 to-blue-600',
    iconBg: 'bg-sky-50 text-sky-600',
  },
  {
    label: 'My Transactions',
    description: 'Receipts & statements',
    href: '/subscriber/my-transactions',
    Icon: FileText,
    color: 'from-indigo-600 to-purple-600',
    iconBg: 'bg-indigo-50 text-indigo-600',
  },
  {
    label: 'Help & Dispatch',
    description: 'Report issues & tickets',
    href: '/subscriber/help',
    Icon: CircleHelp,
    color: 'from-purple-600 to-pink-600',
    iconBg: 'bg-purple-50 text-purple-600',
  },
];

type RequestHistoryItem = {
  id: string;
  type: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt?: string | null;
  visitDate?: string | null;
  visitTime?: string | null;
  technicianName?: string | null;
  subscriberName?: string | null;
  subscriberAddress?: string | null;
  description?: string | null;
  details?: string | null;
};

function formatInstallationStatus(status: string) {
  const normalized = status.replace(/_/g, ' ');
  if (['Scheduled', 'In Progress', 'Installation Confirmed'].includes(normalized))
    return 'Installation Confirmed';
  if (['Completed', 'Installation Completed', 'Installation Closed'].includes(normalized))
    return 'Installation Closed';
  if (['Cancelled', 'Canceled', 'Installation Rescheduled'].includes(normalized))
    return 'Installation Rescheduled';
  return normalized;
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '₱0.00';
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getRequestUpdateTime(request: RequestHistoryItem) {
  const updatedAt = request.updatedAt ? new Date(request.updatedAt).getTime() : Number.NaN;
  const createdAt = new Date(request.createdAt).getTime();
  return Number.isNaN(updatedAt) ? createdAt : updatedAt;
}

export default function SubscriberAccount() {
  const [account, setAccount] = useState<{
    id: string;
    name: string;
    contact: string;
    planName: string;
    speedMbps: number;
    monthlyPrice: number;
    address?: string | null;
  } | null>(null);

  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  });

  const [transactions, setTransactions] = useState<
    Array<{ id: string; amount: number; dueDate: string; status: string; paymentStatus?: string; billingPeriod?: string }>
  >([]);
  const [requests, setRequests] = useState<RequestHistoryItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RequestHistoryItem | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    fetch('/api/account')
      .then((response) => response.json())
      .then((result) => {
        if (result.data) setAccount(result.data);
      })
      .catch(() => undefined);

    fetch('/api/notifications', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data))
          setUnreadNotificationCount(
            result.data.filter((item: { read?: boolean }) => !item.read).length,
          );
      })
      .catch(() => undefined);

    fetch('/api/bills')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          setTransactions(
            result.data
              .map(
                (bill: {
                  id?: string;
                  amount?: number;
                  dueDate?: string | null;
                  status?: string;
                  paymentStatus?: string;
                  billingPeriod?: string;
                }) => ({
                  id: String(bill.id || 'bill'),
                  amount: Number(bill.amount || 0),
                  dueDate: bill.dueDate || '',
                  status: bill.status || 'Unpaid',
                  paymentStatus: bill.paymentStatus || '',
                  billingPeriod: bill.billingPeriod || '',
                }),
              )
              .sort(
                (a: { dueDate: string }, b: { dueDate: string }) =>
                  new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
              ),
          );
        }
      })
      .catch(() => undefined);

    const loadRequests = () =>
      Promise.all([
        fetch('/api/tickets', { cache: 'no-store' }),
        fetch('/api/installations', { cache: 'no-store' }),
      ])
        .then(async ([ticketResponse, installationResponse]) => {
          const ticketsResult = ticketResponse.ok ? await ticketResponse.json() : { data: [] };
          const installationsResult = installationResponse.ok
            ? await installationResponse.json()
            : { data: [] };
          const tickets = Array.isArray(ticketsResult.data)
            ? ticketsResult.data.map(
                (
                  ticket: RequestHistoryItem & {
                    technician?: { name?: string | null } | null;
                    subscriber?: { name?: string | null; address?: string | null } | null;
                  },
                ) => ({
                  ...ticket,
                  type: 'Repair',
                  status: formatTicketStatus(ticket.status),
                  createdAt: ticket.createdAt || new Date().toISOString(),
                  technicianName: ticket.technician?.name || null,
                  subscriberName: ticket.subscriber?.name || null,
                  subscriberAddress: ticket.subscriber?.address || null,
                }),
              )
            : [];
          const installations = Array.isArray(installationsResult.data)
            ? installationsResult.data.map(
                (installation: {
                  id: string;
                  date: string;
                  time: string;
                  type: string;
                  status: string;
                  address?: string | null;
                  notes?: string | null;
                  technician?: { name?: string | null } | null;
                  subscriber?: { name?: string | null; address?: string | null } | null;
                }) => ({
                  id: installation.id,
                  type: 'Installation',
                  subject: installation.type,
                  status: formatInstallationStatus(installation.status),
                  createdAt: installation.date,
                  visitDate: installation.date,
                  visitTime: installation.time,
                  technicianName: installation.technician?.name || null,
                  subscriberName: installation.subscriber?.name || null,
                  subscriberAddress:
                    installation.subscriber?.address || installation.address || null,
                  details: installation.notes || null,
                }),
              )
            : [];
          setRequests(
            [...tickets, ...installations].sort(
              (a: RequestHistoryItem, b: RequestHistoryItem) => {
                return getRequestUpdateTime(b) - getRequestUpdateTime(a);
              },
            ),
          );
        })
        .catch(() => undefined);

    loadRequests();
    window.addEventListener('focus', loadRequests);
    return () => window.removeEventListener('focus', loadRequests);
  }, []);

  const fullName = account?.name || 'Valued Subscriber';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const displayName = parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : fullName;
  const firstName = parts[0] || 'Subscriber';
  const subscriberId = account?.id || 'SUB-100000001';
  const price = account?.monthlyPrice != null ? formatMoney(account.monthlyPrice) : '₱999.00';
  const pendingBill = transactions.find((t) => t.status !== 'Paid');
  const isPaid = !pendingBill;
  const isPendingReview = Boolean(pendingBill?.paymentStatus === 'Pending_Confirmation');
  const visibleTransactions = transactions.slice(0, 3);
  const showAllTransactions = transactions.length > 3;

  function formatHistoryDate(value: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatRequestVisitDateTime(request: RequestHistoryItem) {
    if (!request.visitDate && !request.visitTime) return 'Not scheduled yet';
    if (!request.visitDate) return 'Not scheduled yet';
    const date = new Date(`${request.visitDate.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Not scheduled yet';
    return [
      date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      request.visitTime,
    ]
      .filter(Boolean)
      .join(', ');
  }

  function formatRequestCardDate(request: RequestHistoryItem) {
    if (!request.visitDate) return 'Not scheduled yet';
    const date = new Date(`${request.visitDate.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return 'Not scheduled yet';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const latestInstallation = requests.find((request) => request.type === 'Installation');
  const latestRepair = requests.find((request) => request.type !== 'Installation');
  const prioritizedRequests = Array.from(
    new Map(
      [latestInstallation, latestRepair, ...requests]
        .filter((request): request is RequestHistoryItem => Boolean(request))
        .map((request) => [`${request.type}-${request.id}`, request]),
    ).values(),
  );
  const requiredRequests = [latestInstallation, latestRepair].filter(
    (request): request is RequestHistoryItem => Boolean(request),
  );
  const requiredKeys = new Set(
    requiredRequests.map((request) => `${request.type}-${request.id}`),
  );
  const additionalRequests = prioritizedRequests
    .filter((request) => !requiredKeys.has(`${request.type}-${request.id}`))
    .sort((a, b) => getRequestUpdateTime(b) - getRequestUpdateTime(a))
    .slice(0, Math.max(0, 3 - requiredRequests.length));
  const visibleRequests = [...requiredRequests, ...additionalRequests].sort(
    (a, b) => getRequestUpdateTime(b) - getRequestUpdateTime(a),
  );
  const showAllRequests = requests.length >= 3;

  return (
    <PortalShell role="subscriber">
      <div className="bg-[#f8fafc] pb-8 text-slate-900">
        {/* ----------------- TOP WELCOME HERO BANNER ----------------- */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] text-white shadow-lg">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_50%)] pointer-events-none" />
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
            {/* Greeting & Quick Action Header */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 border border-white/20 text-xl font-black text-white shadow-md backdrop-blur-sm">
                  {firstName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                      {greeting},
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Optical Fiber Online
                    </span>
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {firstName}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  href="/subscriber/notifications"
                  aria-label="Notifications"
                  className="relative rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 p-3 text-white transition-all backdrop-blur-sm cursor-pointer"
                >
                  <Bell size={20} />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black shadow-md shadow-rose-500/40">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/subscriber/help"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-3 text-sm font-bold text-white transition-all backdrop-blur-sm cursor-pointer"
                >
                  <MessageSquare size={16} />
                  Support
                </Link>
              </div>
            </div>

            {/* ----------------- FIBER CONNECTION & SUBSCRIPTION HERO CARD ----------------- */}
            <div className="relative overflow-hidden rounded-3xl bg-white text-slate-900 shadow-xl border border-white/20">
              {/* Header with Official Logo & Status Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-sky-400 bg-[#071329] shadow-2xs flex items-center justify-center">
                    <Image src="/images/Skytech.jpg" alt="Sky-Tech Fiber" width={40} height={40} className="h-full w-full object-cover rounded-full scale-110" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {account?.planName || 'Sky-Tech Fiber Plan'}
                    </h2>
                    <p className="text-xs text-slate-400">Account #{subscriberId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isPendingReview
                          ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isPaid ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>Paid in Full</span>
                      </>
                    ) : isPendingReview ? (
                      <>
                        <Activity size={13} className="text-amber-700" />
                        <span>Pending Admin Confirmation</span>
                      </>
                    ) : (
                      <>
                        <Activity size={13} className="text-amber-600" />
                        <span>Payment Due</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Main Subscription Highlights */}
              <div className="flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8 bg-gradient-to-b from-white to-slate-50/50">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Primary Subscriber
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">{displayName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {account?.address || 'Sibagat, Agusan del Sur'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isPaid ? 'Monthly Rate' : 'Total Amount Due'}
                  </p>
                  <p
                    className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 ${
                      isPaid ? 'text-slate-900' : 'text-[#2563eb]'
                    }`}
                  >
                    {isPaid ? price : formatMoney(pendingBill?.amount)}
                  </p>
                  {isPendingReview && (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">
                      ⏳ GCash proof submitted · Pending admin confirmation
                    </p>
                  )}
                  <Link
                    href="/subscriber/pay-bills"
                    className={`mt-2.5 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      isPaid
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : isPendingReview
                          ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-500/20'
                          : 'bg-[#2563eb] text-white hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                  >
                    {isPaid
                      ? 'View Billing History'
                      : isPendingReview
                        ? 'View Submitted GCash Payment'
                        : 'Pay Bill Online Now'}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Fiber Optical Specs Matrix */}
              <div className="grid grid-cols-3 border-t border-slate-100 bg-[#f8faff] py-4 text-center">
                <div className="border-r border-slate-200/70 px-2">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb]">
                    <Wifi size={18} />
                  </div>
                  <strong className="block text-base sm:text-lg font-black text-slate-900 mt-1.5">
                    Unlimited
                  </strong>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    No Data Cap
                  </span>
                </div>

                <div className="border-r border-slate-200/70 px-2">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb]">
                    <Zap size={18} />
                  </div>
                  <strong className="block text-base sm:text-lg font-black text-slate-900 mt-1.5">
                    {account?.speedMbps || 100} Mbps
                  </strong>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Symmetrical Speed
                  </span>
                </div>

                <div className="px-2">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={18} />
                  </div>
                  <strong className="block text-base sm:text-lg font-black text-slate-900 mt-1.5">
                    99.9%
                  </strong>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Network Uptime
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------- DASHBOARD BODY CONTENT ----------------- */}
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-8 lg:px-10 space-y-10">
          {/* Quick Action Tiles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Quick Access & Services</h2>
              <span className="text-xs text-slate-400">Frequently used portals</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {actions.map(({ label, description, href, Icon, iconBg }) => (
                <Link
                  key={label}
                  href={href}
                  className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} transition-transform duration-200 group-hover:scale-110 shadow-2xs`}
                    >
                      <Icon size={22} />
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                    />
                  </div>

                  <div className="mt-5">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                      {label}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Two-Column Grid: Transactions + Requests */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* 1. Transaction & Billing History */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Billing History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Recent monthly statements</p>
                </div>
                {showAllTransactions && (
                  <Link
                    href="/subscriber/my-transactions"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:underline cursor-pointer"
                  >
                    <span>View all</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {visibleTransactions.length ? (
                  visibleTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            tx.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {tx.billingPeriod ? `${tx.billingPeriod} Invoice` : 'Fiber Subscription'}
                          </p>
                          <p className="text-[11px] text-slate-400">Due: {formatHistoryDate(tx.dueDate)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatMoney(tx.amount)}</p>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5 ${
                            tx.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No transactions on record yet.
                  </div>
                )}
              </div>
            </div>

            {/* 2. Service Requests & Installations */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Service Requests</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Installations & repairs</p>
                </div>
                {showAllRequests && (
                  <Link
                    href="/subscriber/my-tickets"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:underline cursor-pointer"
                  >
                    <span>View all</span>
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {visibleRequests.length ? (
                  visibleRequests.map((req) => (
                    <button
                      key={`${req.type}-${req.id}`}
                      type="button"
                      onClick={() => setSelectedRequest(req)}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          {req.type === 'Installation' ? (
                            <CalendarDays size={18} />
                          ) : (
                            <Wrench size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">
                            {req.subject || req.id}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatRequestCardDate(req)}
                          </p>
                        </div>
                      </div>

                      <Badge
                        value={formatTicketStatus(req.status)}
                        className="shrink-0 text-[10px]"
                      />
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active service tickets or installation orders.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- REQUEST DETAILS SLIDE-OVER MODAL ----------------- */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150"
          onMouseDown={() => setSelectedRequest(null)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#214ebc] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
                  {selectedRequest.type === 'Installation' ? (
                    <CalendarDays size={18} />
                  ) : (
                    <Wrench size={18} />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    Work Order Details
                  </p>
                  <h3 className="font-bold text-base text-white">{selectedRequest.id}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6 text-sm">
              <div className="rounded-2xl bg-blue-50/70 p-4 border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-800">Status</span>
                  <p className="font-bold text-base text-slate-900 mt-0.5">
                    {formatTicketStatus(selectedRequest.status)}
                  </p>
                </div>
                <Badge value={formatTicketStatus(selectedRequest.status)} />
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">
                    Schedule / Visit Date
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {formatRequestVisitDateTime(selectedRequest)}
                  </p>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">
                    Assigned Technician
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedRequest.technicianName || 'Pending technician assignment'}
                  </p>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Address</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedRequest.subscriberAddress || account?.address || 'Sibagat, Agusan del Sur'}
                  </p>
                </div>

                {selectedRequest.details && (
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold">
                      Concern / Notes
                    </span>
                    <p className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-slate-700 leading-relaxed">
                      {selectedRequest.details}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
