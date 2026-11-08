'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  CreditCard,
  Sparkles,
  Zap,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type Account = {
  id: string;
  name: string;
  planName: string;
  speedMbps: number;
  monthlyPrice: number;
  cutoffDay: number;
  billingDay: number;
};

export default function PlanDetailsPage() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetch('/api/account')
      .then((response) => response.json())
      .then((result) => {
        if (result.data) setAccount(result.data);
      })
      .catch(() => undefined);
  }, []);

  const features = [
    'Unlimited Pure Optical Fiber Connection',
    'Symmetrical High-Speed Download & Upload',
    'Low Latency (<15ms) Optimized for Gaming & Streaming',
    'Zero Data Capping & Fair Usage Throttling',
    '24/7 Priority Technical Assistance & Local Dispatch',
    'Free Wi-Fi 6 Ready Optical Network Router (ONU)',
  ];

  return (
    <PortalShell role="subscriber">
      <div className="w-full max-w-full overflow-x-hidden bg-[#f8fafc] pb-8 text-slate-900">
        {/* Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] text-white shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.18),transparent_50%)] pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/subscriber/my-account"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-white sm:text-3xl">
                    Plan Specifications & Details
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-blue-100/80">
                    Your active Sky-Tech Pure Fiber optical internet package
                  </p>
                </div>
              </div>

              {/* Logo Badge */}
              <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 border border-white/15 px-3.5 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white/60 bg-[#071329] shadow-sm flex items-center justify-center">
                  <Image
                    src="/images/Skytech.jpg"
                    alt="Sky-Tech Fiber Logo"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover rounded-full scale-110"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white">
                    Sky-Tech Fiber
                  </p>
                  <p className="text-[10px] text-blue-200">Plan Details</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="mx-auto max-w-7xl px-3.5 pt-5 pb-2 sm:px-8 sm:pt-6 lg:px-10">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-12">
            {/* Left: Plan Specifications Card (7 cols) */}
            <div className="min-w-0 space-y-6 lg:col-span-7">
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
                      <Zap size={24} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        Active Subscription
                      </span>
                      <h2 className="text-xl font-black text-slate-900 mt-0.5">
                        {account?.planName || 'Fiber 100 Mbps Unlimited'}
                      </h2>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                    Active & Operational
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Bandwidth Speed
                    </span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {account?.speedMbps || 100} <span className="text-sm font-semibold">Mbps</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Symmetrical</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Monthly Recurring Fee
                    </span>
                    <p className="text-2xl font-black text-[#2563eb] mt-1">
                      ₱{account?.monthlyPrice?.toLocaleString() || '999'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">VAT Included</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Data Allocation
                    </span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">Unlimited</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">No speed throttle</p>
                  </div>
                </div>

                {/* Included Features */}
                <div className="mt-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">
                    Included Plan Features
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {features.map((feat) => (
                      <div
                        key={feat}
                        className="flex items-start gap-2.5 rounded-xl bg-slate-50/70 p-3 border border-slate-100 text-xs font-medium text-slate-700"
                      >
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Check size={11} />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Billing Cycle & Upgrades (5 cols) */}
            <div className="min-w-0 space-y-6 lg:col-span-5">
              {/* Billing Cycle Calendar Info */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Billing Cycle & Schedule
                </h3>

                <div className="flex items-start gap-3.5 rounded-2xl bg-blue-50/80 p-4 border border-blue-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-blue-900">
                      Billing Cut-off Date
                    </h4>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      Every {account?.cutoffDay || 9}th of the month
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Invoices are calculated and generated at the end of each monthly cut-off cycle.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 rounded-2xl bg-amber-50/80 p-4 border border-amber-100">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                      Monthly Payment Due Date
                    </h4>
                    <p className="text-base font-black text-slate-900 mt-0.5">
                      Every {account?.billingDay || 30}th of the month
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Payments must be submitted on or before the due date to avoid service disconnection.
                    </p>
                  </div>
                </div>

                <Link
                  href="/subscriber/pay-bills"
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <CreditCard size={16} />
                  Go to Pay Bills Center
                </Link>
              </div>

              {/* Upgrade Inquiry Banner */}
              <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-blue-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-purple-950">
                      Looking to Boost Your Bandwidth?
                    </h4>
                    <p className="text-xs text-purple-800/80 mt-0.5">
                      Upgrade to Fiber 200 or 300 Mbps with zero installation fees.
                    </p>
                  </div>
                </div>
                <Link
                  href="/subscriber/help"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                >
                  Request Plan Upgrade with Support &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
