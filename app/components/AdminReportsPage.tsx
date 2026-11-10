'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { PieChart } from '@/app/components/PieChart';

type ReportData = {
  activeSubscribers: number;
  activeTechnicians: number;
  openTickets: number;
  revenueCollected: number;
  pendingBills: number;
  totalBilled: number;
  billsByStatus: {
    paid: number;
    unpaid: number;
    overdue: number;
  };
  revenueTrend: Array<{ label: string; value: number }>;
};

const formatCurrency = (value: number) => `₱${value.toLocaleString()}`;

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      {children}
    </section>
  );
}

export function AdminReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load reports.');
        setReport(result);
      })
      .catch(() => setReport(null));
  }, []);

  const statCards = useMemo(() => {
    if (!report) {
      return [
        ['TOTAL REVENUE', '₱0', 'Awaiting data'],
        ['TOTAL BILLED', '₱0', 'Awaiting data'],
        ['PENDING BILLS', '0', 'Awaiting data'],
        ['ACTIVE SUBSCRIBERS', '0', 'Awaiting data'],
      ];
    }

    return [
      ['TOTAL REVENUE', formatCurrency(report.revenueCollected), `${report.billsByStatus.paid} paid bills`],
      ['TOTAL BILLED', formatCurrency(report.totalBilled), `${report.billsByStatus.unpaid + report.billsByStatus.overdue} unpaid/overdue`],
      ['PENDING BILLS', String(report.pendingBills), `${report.openTickets} open tickets`],
      ['ACTIVE SUBSCRIBERS', String(report.activeSubscribers), `${report.activeTechnicians} active technicians`],
    ];
  }, [report]);

  const revenueTrend = report?.revenueTrend ?? [];
  const billStatus = report?.billsByStatus ?? { paid: 0, unpaid: 0, overdue: 0 };
  const totalStatus = Object.values(billStatus).reduce((sum, value) => sum + Number(value), 0);
  const maxRevenue = revenueTrend.length ? Math.max(...revenueTrend.map((item) => Number(item.value) || 0), 1) : 1;

  return (
    <PortalShell role="admin">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3b4fd8]">Performance</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Reports &amp; Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Live system overview</p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <Download size={16} />
          Export Report
        </button>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map(([label, value, trend]) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <p className="text-[11px] sm:text-xs font-bold tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-2 text-[11px] sm:text-xs font-semibold text-emerald-600">{trend}</p>
          </article>
        ))}
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <ChartCard title="Monthly Revenue" subtitle="Last 6 months">
          <div className="mt-7 flex h-56 items-end gap-2 border-b border-slate-100 px-1 pb-2 sm:gap-6 sm:px-3">
            {revenueTrend.length ? (
              revenueTrend.map((entry) => {
                const val = Number(entry.value) || 0;
                const barHeight = val > 0 ? Math.max(12, (val / maxRevenue) * 100) : 0;
                return (
                  <div key={entry.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      {val > 0 ? (
                        <div
                          className="relative w-full max-w-10 rounded-t-lg bg-gradient-to-t from-[#2563eb] to-[#38bdf8] transition-all hover:from-[#1f54ca] hover:to-[#0ea5e9]"
                          style={{ height: `${barHeight}%` }}
                          title={`${entry.label}: ${formatCurrency(val)}`}
                        >
                          <span className="dashboard-badge-blue absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-blue-50 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-blue-600">
                            {formatCurrency(val)}
                          </span>
                        </div>
                      ) : (
                        <div
                          className="dashboard-zero-bar h-1 w-full max-w-8 rounded-t bg-slate-200/70"
                          title={`${entry.label}: ₱0`}
                        />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-400">{entry.label}</span>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                No revenue data yet.
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Billing Status" subtitle="Current bill mix">
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row">
            <PieChart
              size={170}
              slices={[
                { label: 'Paid', value: Number(billStatus.paid), color: '#10b981' },
                { label: 'Unpaid', value: Number(billStatus.unpaid), color: '#fbbf24' },
                { label: 'Overdue', value: Number(billStatus.overdue), color: '#f43f5e' },
              ]}
            />

            <ul className="flex w-full min-w-0 flex-1 flex-col gap-2.5">
              {[
                { label: 'Paid', value: Number(billStatus.paid), dot: 'bg-emerald-500', text: 'text-emerald-500' },
                { label: 'Unpaid', value: Number(billStatus.unpaid), dot: 'bg-amber-400', text: 'text-amber-500' },
                { label: 'Overdue', value: Number(billStatus.overdue), dot: 'bg-rose-500', text: 'text-rose-500' },
              ].map(({ label, value, dot, text }) => {
                const percentage = totalStatus ? Math.round((value / totalStatus) * 100) : 0;

                return (
                  <li
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-2.5"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                      {label}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className={`text-sm font-bold ${text}`}>{value} bills</span>
                      <span className="text-xs font-semibold text-slate-400">{percentage}%</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </ChartCard>
      </div>
    </PortalShell>
  );
}