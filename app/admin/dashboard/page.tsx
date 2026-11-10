'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  FileText,
  RefreshCw,
  Ticket,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { PortalShell } from '@/app/components/PortalShell';
import { PieChart } from '@/app/components/PieChart';
import { formatPersonName } from '@/app/lib/name';

type DashboardResponse = {
  activeSubscribers: number;
  activeTechnicians: number;
  openTickets: number;
  revenueCollected: number;
  pendingBills: number;
  totalBilled?: number;
  billsByStatus?: {
    paid: number;
    unpaid: number;
    overdue: number;
  };
  revenueTrend: { label: string; value: number }[];
  growthTrend: number[];
  recentInstallations: {
    id: string;
    subscriber: string;
    technician: string;
    date?: string | null;
    time?: string | null;
    status: string;
  }[];
  recentActivity: {
    id: string;
    text: string;
    body: string;
    date: string;
    tone: 'green' | 'orange' | 'blue';
  }[];
  recentSupportTickets: {
    id: string;
    subscriber: string;
    concern: string;
    date?: string | null;
    time?: string | null;
    status: string;
  }[];
};

type Stat = {
  label: string;
  value: string;
  detail: string;
  subtext: string;
  href: string;
  Icon: LucideIcon;
  tone: 'positive' | 'neutral' | 'negative';
  accent: 'blue' | 'cyan' | 'emerald' | 'rose';
};

const installationStatusLabels: Record<string, string> = {
  Scheduled: 'Installation Confirmed',
  In_Progress: 'Installation Confirmed',
  'In Progress': 'Installation Confirmed',
  Installation_Confirmed: 'Installation Confirmed',
  'Installation Confirmed': 'Installation Confirmed',
  Completed: 'Installation Closed',
  Installation_Closed: 'Installation Closed',
  'Installation Closed': 'Installation Closed',
  Cancelled: 'Installation Rescheduled',
  Installation_Rescheduled: 'Installation Rescheduled',
  'Installation Rescheduled': 'Installation Rescheduled',
};

const installationStatusStyles: Record<string, string> = {
  'Installation Confirmed': 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
  Completed: 'bg-slate-50 text-slate-600 border border-slate-200/60',
  'Installation Closed': 'bg-slate-50 text-slate-600 border border-slate-200/60',
  'Installation Rescheduled': 'bg-amber-50 text-amber-600 border border-amber-200/60',
};

const ticketStatusLabels: Record<string, string> = {
  Open: 'Submitted',
  In_Progress: 'Repair Confirmed',
  'In Progress': 'Repair Confirmed',
  Resolved: 'Repair Closed',
  Closed: 'Repair Rescheduled',
};

const ticketStatusStyles: Record<string, string> = {
  Submitted: 'bg-blue-50 text-blue-600 border border-blue-200/60',
  'Repair Confirmed': 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
  'Repair Closed': 'bg-slate-50 text-slate-600 border border-slate-200/60',
  'Repair Rescheduled': 'bg-amber-50 text-amber-600 border border-amber-200/60',
};

function getInstallationStatus(status: string) {
  return installationStatusLabels[status] || status.replace(/_/g, ' ');
}

function formatInstallationDateTime(value: string | null | undefined) {
  if (!value) return { date: '—', time: '—' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '—' };
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function formatSupportDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatInstallationTime(value: string | null | undefined) {
  if (value === '09:00') return '9:00 AM – 12:00 NN';
  if (value === '13:00') return '1:00 PM – 4:00 PM';
  return value || '—';
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST'
  );
}

function formatAxisCurrency(value: number) {
  if (value === 0) return '₱0';
  if (value >= 1000) {
    const inK = value / 1000;
    return `₱${Number.isInteger(inK) ? inK : inK.toFixed(1)}k`;
  }
  return `₱${Math.round(value)}`;
}

function getRevenueAxis(values: number[]) {
  const maxVal = Math.max(...values, 0);
  let niceMax = 2000;
  if (maxVal > 0) {
    if (maxVal <= 800) niceMax = Math.ceil((maxVal * 1.15) / 200) * 200;
    else if (maxVal <= 1700) niceMax = 2000;
    else if (maxVal <= 3400) niceMax = Math.ceil((maxVal * 1.15) / 800) * 800;
    else niceMax = Math.ceil((maxVal * 1.15) / 2000) * 2000;
  }
  const yLabels = [
    niceMax,
    niceMax * 0.75,
    niceMax * 0.5,
    niceMax * 0.25,
    0,
  ].map(formatAxisCurrency);

  return { niceMax, yLabels };
}

function getGrowthAxis(values: number[]) {
  const maxVal = Math.max(...values, 0);
  // Keep 5 horizontal grid lines (divisible by 4) with headroom at the top
  const niceMax = Math.max(4, Math.ceil(Math.max(maxVal + 1, 4) / 4) * 4);
  const yLabels = [
    niceMax,
    niceMax * 0.75,
    niceMax * 0.5,
    niceMax * 0.25,
    0,
  ].map((v) => String(Math.round(v)));
  return { niceMax, yLabels };
}

function ChartGrid({
  children,
  labels,
  yLabels,
}: {
  children: React.ReactNode;
  labels: string[];
  yLabels: string[];
}) {
  return (
    <div className="relative mt-7 grid h-60 grid-cols-[3rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_2rem]">
      <div className="flex flex-col justify-between pr-3 text-right text-[11px] font-medium text-slate-400">
        {yLabels.map((label, index) => (
          <span
            className="-translate-y-1/2 first:translate-y-0 last:translate-y-0"
            key={`${label}-${index}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex flex-col justify-between">
          {yLabels.map((label, index) => (
            <div
              className="dashboard-grid-line border-t border-dashed border-slate-200/80 last:border-solid last:border-slate-200"
              key={`${label}-grid-${index}`}
            />
          ))}
        </div>
        <div className="absolute inset-0">{children}</div>
      </div>
      <div className="col-start-2 grid grid-cols-6 items-end pt-2 text-center text-xs font-medium text-slate-400">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function LineChart({ values, labels }: { values: number[]; labels: string[] }) {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0];
  const { niceMax, yLabels } = getGrowthAxis(safeValues);
  const count = safeValues.length;

  const coords = safeValues.map((value, index) => {
    const x = ((index + 0.5) / count) * 100;
    const y = 100 - (Math.min(value, niceMax) / niceMax) * 100;
    return { x, y, value, label: labels[index] ?? '' };
  });

  const polylinePoints = coords.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const firstX = coords[0]?.x ?? 0;
  const lastX = coords[coords.length - 1]?.x ?? 100;
  const polygonPoints = `${firstX},100 ${polylinePoints} ${lastX},100`;

  return (
    <ChartGrid labels={labels} yLabels={yLabels}>
      <div className="relative h-full w-full">
        <svg
          className="h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
              <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={polygonPoints} fill="url(#growth-fill)" />
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#3b82f6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {coords.map((pt, index) => (
          <div
            key={`${pt.label}-${index}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
          >
            <div
              className={`pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-all ${
                pt.value > 0
                  ? 'dashboard-badge-blue bg-blue-50 text-blue-600 opacity-100 group-hover:scale-105'
                  : 'bg-slate-800 text-white opacity-0 group-hover:opacity-100'
              }`}
            >
              {pt.value}
            </div>
            <div
              className={`h-3 w-3 rounded-full border-2 transition-transform duration-150 group-hover:scale-125 ${
                pt.value > 0
                  ? 'border-white bg-[#3b82f6] shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
              }`}
              title={`${pt.label}: ${pt.value} active subscriber${pt.value === 1 ? '' : 's'}`}
            />
          </div>
        ))}
      </div>
    </ChartGrid>
  );
}

function RevenueChart({ values, labels }: { values: number[]; labels: string[] }) {
  const safeValues = values.length ? values : [0, 0, 0, 0, 0, 0];
  const { niceMax, yLabels } = getRevenueAxis(safeValues);

  return (
    <ChartGrid labels={labels} yLabels={yLabels}>
      <div className="grid h-full grid-cols-6 items-end">
        {safeValues.map((value, index) => {
          const heightPercent =
            value > 0 ? Math.max(6, (Math.min(value, niceMax) / niceMax) * 100) : 0;
          return (
            <div
              className="group relative flex h-full items-end justify-center px-1 sm:px-2"
              key={`${labels[index]}-${index}`}
            >
              {value > 0 ? (
                <div
                  className="relative w-full max-w-9 rounded-t-lg bg-gradient-to-t from-[#2563eb] to-[#38bdf8] shadow-[0_4px_14px_rgba(37,99,235,0.28)] transition-all duration-200 group-hover:from-[#1d4ed8] group-hover:to-[#0ea5e9]"
                  style={{ height: `${heightPercent}%` }}
                  title={`${labels[index]}: ₱${value.toLocaleString()}`}
                >
                  <span className="dashboard-badge-blue pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-blue-50 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-blue-600 transition-transform group-hover:-translate-y-0.5">
                    ₱{value.toLocaleString()}
                  </span>
                </div>
              ) : (
                <div
                  className="dashboard-zero-bar h-1 w-full max-w-8 rounded-t bg-slate-200/70 transition-opacity group-hover:opacity-100"
                  title={`${labels[index]}: ₱0`}
                />
              )}
            </div>
          );
        })}
      </div>
    </ChartGrid>
  );
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch('/api/reports', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load dashboard metrics.');
      const result = await response.json();
      setDashboard(result);
    } catch {
      if (!isRefresh) setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  const stats = useMemo<Stat[]>(() => {
    if (!dashboard) {
      return [
        {
          label: 'Active subscribers',
          value: '0',
          detail: 'Live count',
          subtext: 'Fiber connections monitored',
          href: '/admin/subscribers',
          Icon: Users,
          tone: 'neutral',
          accent: 'blue',
        },
        {
          label: 'Active technicians',
          value: '0',
          detail: 'Available now',
          subtext: 'Field crew on standby',
          href: '/admin/technicians',
          Icon: Wrench,
          tone: 'neutral',
          accent: 'cyan',
        },
        {
          label: 'Revenue collected',
          value: '₱0',
          detail: 'No paid bills yet',
          subtext: 'Verified bill collections',
          href: '/admin/billing',
          Icon: CircleDollarSign,
          tone: 'neutral',
          accent: 'emerald',
        },
        {
          label: 'Pending bills',
          value: '0',
          detail: 'All clear',
          subtext: 'Unpaid & overdue statements',
          href: '/admin/billing',
          Icon: FileText,
          tone: 'neutral',
          accent: 'rose',
        },
      ];
    }

    const overdueCount = dashboard.billsByStatus?.overdue ?? 0;
    const paidCount = dashboard.billsByStatus?.paid ?? 0;

    return [
      {
        label: 'Active subscribers',
        value: String(dashboard.activeSubscribers),
        detail: dashboard.activeSubscribers > 0 ? 'Live count' : 'No active subscribers',
        subtext:
          dashboard.openTickets > 0
            ? `${dashboard.openTickets} open support request${dashboard.openTickets === 1 ? '' : 's'}`
            : 'All subscriber lines healthy',
        href: '/admin/subscribers',
        Icon: Users,
        tone: 'positive',
        accent: 'blue',
      },
      {
        label: 'Active technicians',
        value: String(dashboard.activeTechnicians),
        detail: dashboard.activeTechnicians > 0 ? 'Available now' : 'No active technicians',
        subtext: `${dashboard.recentInstallations.length} recent dispatch job${dashboard.recentInstallations.length === 1 ? '' : 's'}`,
        href: '/admin/technicians',
        Icon: Wrench,
        tone: 'neutral',
        accent: 'cyan',
      },
      {
        label: 'Revenue collected',
        value: `₱${dashboard.revenueCollected.toLocaleString()}`,
        detail: dashboard.revenueCollected > 0 ? 'Across all paid bills' : 'No paid bills yet',
        subtext:
          paidCount > 0
            ? `${paidCount} cleared invoice${paidCount === 1 ? '' : 's'} recorded`
            : 'Awaiting confirmed payments',
        href: '/admin/billing',
        Icon: CircleDollarSign,
        tone: 'positive',
        accent: 'emerald',
      },
      {
        label: 'Pending bills',
        value: String(dashboard.pendingBills),
        detail: dashboard.pendingBills > 0 ? `${dashboard.pendingBills} need attention` : 'All clear',
        subtext:
          overdueCount > 0
            ? `${overdueCount} overdue · ${Math.max(0, dashboard.pendingBills - overdueCount)} unpaid`
            : 'Unpaid subscriber statements',
        href: '/admin/billing',
        Icon: FileText,
        tone: dashboard.pendingBills > 0 ? 'negative' : 'neutral',
        accent: 'rose',
      },
    ];
  }, [dashboard]);

  const revenueValues = dashboard?.revenueTrend.map((entry) => entry.value) ?? [0, 0, 0, 0, 0, 0];
  const growthValues = dashboard?.growthTrend ?? [0, 0, 0, 0, 0, 0];
  const chartLabels = dashboard?.revenueTrend.map((entry) => entry.label) ?? [
    '—',
    '—',
    '—',
    '—',
    '—',
    '—',
  ];

  const sixMonthRevenueTotal = revenueValues.reduce((sum, val) => sum + val, 0);
  const currentGrowth = growthValues[growthValues.length - 1] ?? 0;
  const startGrowth = growthValues[0] ?? 0;
  const netNewSubscribers = Math.max(0, currentGrowth - startGrowth);

  const installations = dashboard?.recentInstallations ?? [];
  const activities =
    dashboard?.recentActivity.slice(0, 6).map((item) => ({
      id: item.id,
      Icon: item.tone === 'green' ? Check : item.tone === 'orange' ? CircleDollarSign : Users,
      text: item.text || item.body,
      body: item.text && item.body && item.text !== item.body ? item.body : '',
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      tone: item.tone,
    })) ?? [];
  const supportTickets = dashboard?.recentSupportTickets ?? [];

  const billStatus = dashboard?.billsByStatus ?? { paid: 0, unpaid: 0, overdue: 0 };
  const totalBillsCount = billStatus.paid + billStatus.unpaid + billStatus.overdue;
  const paidRate = totalBillsCount > 0 ? Math.round((billStatus.paid / totalBillsCount) * 100) : 0;

  return (
    <PortalShell role="admin">
      <div className="space-y-5">
        {/* Row 1: Top Dashboard Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">Dashboard</h1>
              <span className="dashboard-badge-emerald inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Overview
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'Loading metrics...' : 'Welcome back, Admin'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={loading || refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-2xs transition hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
              title="Refresh dashboard metrics"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-500' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <div className="hidden sm:flex h-10 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 shadow-2xs">
              <div className="dashboard-icon-blue grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <CalendarDays size={14} />
              </div>
              <div className="text-right leading-tight">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Today</p>
                <p className="text-xs font-semibold text-slate-700">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: 4 KPI Stat Cards (Strict 4-Column Grid) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, detail, subtext, href, Icon, tone, accent }) => {
            const iconStyle =
              accent === 'emerald'
                ? 'dashboard-icon-emerald bg-emerald-50 text-emerald-600'
                : accent === 'cyan'
                  ? 'dashboard-icon-cyan bg-cyan-50 text-cyan-600'
                  : accent === 'rose'
                    ? 'dashboard-icon-rose bg-rose-50 text-rose-600'
                    : 'dashboard-icon-blue bg-blue-50 text-blue-600';

            const badgeStyle =
              tone === 'negative'
                ? 'dashboard-badge-rose bg-red-50 text-red-500'
                : accent === 'emerald'
                  ? 'dashboard-badge-emerald bg-emerald-50 text-emerald-600'
                  : accent === 'cyan'
                    ? 'dashboard-badge-cyan bg-cyan-50 text-cyan-600'
                    : 'dashboard-badge-blue bg-blue-50 text-blue-600';

            return (
              <Link
                href={href}
                key={label}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/60 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconStyle}`}>
                    <Icon size={19} />
                  </div>
                  {detail && (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeStyle}`}>
                      {detail}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                  <span className="truncate">{subtext}</span>
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500"
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Row 3: 2 Charts (Aligned 1:1 with the 4 KPI Cards above) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-950">Monthly Revenue</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Paid bills collected over the last 6 months
                </p>
              </div>
              <div className="dashboard-badge-emerald inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                <CircleDollarSign size={14} />
                <span>6-Mo Total: ₱{sixMonthRevenueTotal.toLocaleString()}</span>
              </div>
            </div>
            <RevenueChart values={revenueValues} labels={chartLabels} />
          </section>

          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-950">Subscriber Growth</h2>
                <p className="mt-0.5 text-xs text-slate-400">Active subscribers by month</p>
              </div>
              <div className="dashboard-badge-blue inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                <TrendingUp size={14} />
                <span>
                  {netNewSubscribers > 0 ? `+${netNewSubscribers} in 6 mos` : `${currentGrowth} active`}
                </span>
              </div>
            </div>
            <LineChart values={growthValues} labels={chartLabels} />
          </section>
        </div>

        {/* Row 4: Bottom Section (12-Column Grid with Equal Column Heights) */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
          {/* Left 8 Columns: Installations & Support Tickets Tables */}
          <div className="flex flex-col gap-5 lg:col-span-8">
            {/* Recent Installations */}
            <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="dashboard-icon-cyan grid h-8 w-8 place-items-center rounded-lg bg-cyan-50 text-cyan-600">
                    <Wrench size={15} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">Recent Installations</h2>
                    <p className="text-xs text-slate-400">Latest field dispatch & fiber setups</p>
                  </div>
                </div>
                <Link
                  href="/admin/installations"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#3b6ff0] transition-colors duration-150 hover:text-[#2d3fc7]"
                >
                  <span>View all</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full min-w-[600px] table-fixed text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="w-[26%] px-6 py-3 font-semibold">Subscriber</th>
                      <th className="w-[22%] px-4 py-3 font-semibold">Technician</th>
                      <th className="w-[16%] px-4 py-3 font-semibold">Date</th>
                      <th className="w-[16%] px-4 py-3 font-semibold">Time</th>
                      <th className="w-[20%] px-6 py-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installations.length ? (
                      installations.map((installation) => {
                        const dateTime = formatInstallationDateTime(installation.date);
                        const status = getInstallationStatus(installation.status);
                        const subName = formatPersonName(installation.subscriber);
                        return (
                          <tr
                            className="border-b border-slate-100 last:border-0 transition-colors"
                            key={installation.id}
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="dashboard-icon-blue grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">
                                  {getInitials(subName)}
                                </span>
                                <span className="truncate text-sm font-semibold text-slate-900">
                                  {subName}
                                </span>
                              </div>
                            </td>
                            <td className="truncate px-4 py-3.5 text-sm text-slate-500">
                              {formatPersonName(installation.technician)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                              {dateTime.date}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                              {formatInstallationTime(installation.time)}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <span
                                className={`admin-status-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                                  installationStatusStyles[status] ?? 'bg-slate-50 text-slate-500'
                                }`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                          No recent installations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent Support Tickets */}
            <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="dashboard-icon-blue grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <Ticket size={15} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-950">Recent Support Tickets</h2>
                    <p className="text-xs text-slate-400">Latest subscriber repair & inquiry logs</p>
                  </div>
                </div>
                <Link
                  href="/admin/tickets"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#3b6ff0] transition-colors duration-150 hover:text-[#2d3fc7]"
                >
                  <span>View all</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full min-w-[600px] table-fixed text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="w-[26%] px-6 py-3 font-semibold">Subscriber</th>
                      <th className="w-[22%] px-4 py-3 font-semibold">Concern</th>
                      <th className="w-[16%] px-4 py-3 font-semibold">Date</th>
                      <th className="w-[16%] px-4 py-3 font-semibold">Time</th>
                      <th className="w-[20%] px-6 py-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTickets.length ? (
                      supportTickets.map((ticket) => {
                        const status = ticketStatusLabels[ticket.status] || ticket.status;
                        const subName = formatPersonName(ticket.subscriber);
                        return (
                          <tr
                            className="border-b border-slate-100 last:border-0 transition-colors"
                            key={ticket.id}
                          >
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="dashboard-icon-blue grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">
                                  {getInitials(subName)}
                                </span>
                                <span className="truncate text-sm font-semibold text-slate-900">
                                  {subName}
                                </span>
                              </div>
                            </td>
                            <td className="truncate px-4 py-3.5 text-sm text-slate-500">
                              {ticket.concern}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                              {formatSupportDate(ticket.date)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                              {formatInstallationTime(ticket.time)}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <span
                                className={`admin-status-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                                  ticketStatusStyles[status] ?? 'bg-slate-50 text-slate-500'
                                }`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                          No recent support tickets found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right 4 Columns: Billing Breakdown + Recent Activity (Stretched to match Left Column) */}
          <div className="flex flex-col gap-5 lg:col-span-4">
            {/* Collection & Invoice Breakdown */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Billing Breakdown</h2>
                  <p className="text-xs text-slate-400">Invoice collection status</p>
                </div>
                <span className="dashboard-badge-emerald rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                  {paidRate}% Paid
                </span>
              </div>

              <div className="mt-4 flex items-center gap-5">
                <PieChart
                  slices={[
                    { label: 'Paid', value: billStatus.paid, color: '#10b981' },
                    { label: 'Unpaid', value: billStatus.unpaid, color: '#fbbf24' },
                    { label: 'Overdue', value: billStatus.overdue, color: '#f43f5e' },
                  ]}
                />

                <ul className="flex min-w-0 flex-1 flex-col gap-2">
                  {[
                    { label: 'Paid', value: billStatus.paid, dot: 'bg-emerald-500', text: 'text-emerald-500' },
                    { label: 'Unpaid', value: billStatus.unpaid, dot: 'bg-amber-400', text: 'text-amber-500' },
                    { label: 'Overdue', value: billStatus.overdue, dot: 'bg-rose-500', text: 'text-rose-500' },
                  ].map(({ label, value, dot, text }) => (
                    <li
                      key={label}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                        {label}
                      </span>
                      <span className="flex items-baseline gap-1.5">
                        <span className={`text-sm font-extrabold ${text}`}>{value}</span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {totalBillsCount > 0 ? Math.round((value / totalBillsCount) * 100) : 0}%
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">Recent Activity</h2>
                  <p className="text-xs text-slate-400">System & billing events</p>
                </div>
                <Link
                  href="/admin/notifications"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#3b6ff0] transition-colors hover:text-[#2d3fc7]"
                >
                  <span>See all</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="flex-1 divide-y divide-slate-100 px-5 py-1">
                {activities.length ? (
                  activities.map(({ id, Icon, text, body, date, tone }) => (
                    <div className="flex items-start gap-3 py-3" key={id}>
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                          tone === 'green'
                            ? 'dashboard-icon-emerald bg-emerald-50 text-emerald-600'
                            : tone === 'orange'
                              ? 'dashboard-icon-amber bg-amber-50 text-amber-600'
                              : 'dashboard-icon-blue bg-blue-50 text-blue-600'
                        }`}
                      >
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-800">{text}</p>
                        {body && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{body}</p>
                        )}
                        <p className="mt-0.5 text-[10px] font-medium text-slate-400">{date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center py-8 text-center text-sm text-slate-500">
                    No recent activity.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
