'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileCheck2,
  Receipt,
  Search,
  Trash2,
  Upload,
  X,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type ApiBillItem = {
  id: string;
  subscriberId: string;
  subscriber?: { name?: string; plan?: string };
  plan?: string;
  billingPeriod: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  receiptImage?: string | null;
  paymentStatus?: string | null;
  paidAt?: string | null;
};

export type AdminBill = {
  id: string;
  subscriberId: string;
  subscriberName: string;
  subscriberPlan: string;
  billingPeriod: string;
  formattedPeriod: string;
  amount: number;
  formattedAmount: string;
  dueDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  paymentMethod: string;
  referenceNumber: string;
  receiptImage: string | null;
  paymentStatus: 'Unpaid' | 'Pending_Confirmation' | 'Paid' | 'Rejected' | string;
  paidAt: string | null;
};

type FilterTab = 'All' | 'Pending' | 'Unpaid' | 'Paid' | 'Overdue';

function formatDueDate(value: string | Date | null | undefined) {
  if (!value) return '00-00';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '00-00';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function formatBillingPeriod(value: string) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function AdminBillingPage() {
  const [bills, setBills] = useState<AdminBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('All');
  
  // Review Modal State
  const [reviewBill, setReviewBill] = useState<AdminBill | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Full-size image modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Manual payment modal for non-GCash / Walk-in
  const [manualPayBill, setManualPayBill] = useState<AdminBill | null>(null);
  const [manualMethod, setManualMethod] = useState('Walk-in');
  const [manualRef, setManualRef] = useState('');
  const [manualReceiptFile, setManualReceiptFile] = useState<File | null>(null);
  const [manualReceiptPreview, setManualReceiptPreview] = useState<string | null>(null);
  const manualReceiptInputRef = useRef<HTMLInputElement>(null);

  const handleManualReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setManualReceiptFile(file);
    setManualReceiptPreview(URL.createObjectURL(file));
  };

  // Fetch all bills from API
  const loadBills = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bills');
      const result = await response.json();
      if (Array.isArray(result.data)) {
        const mapped: AdminBill[] = (result.data as ApiBillItem[]).map((item) => ({
          id: item.id,
          subscriberId: item.subscriberId,
          subscriberName: formatPersonName(item.subscriber?.name || 'Subscriber'),
          subscriberPlan: (item.subscriber?.plan || item.plan || '').replace(/_/g, ' '),
          billingPeriod: item.billingPeriod,
          formattedPeriod: formatBillingPeriod(item.billingPeriod),
          amount: Number(item.amount || 0),
          formattedAmount: `₱${Number(item.amount || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          dueDate: formatDueDate(item.dueDate),
          status: item.status || 'Unpaid',
          paymentMethod: item.paymentMethod || 'GCash',
          referenceNumber: item.referenceNumber || '',
          receiptImage: item.receiptImage || null,
          paymentStatus: item.paymentStatus || (item.status === 'Paid' ? 'Paid' : 'Unpaid'),
          paidAt: item.paidAt || null,
        }));
        setBills(mapped);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const pendingCount = bills.filter((b) => b.paymentStatus === 'Pending_Confirmation').length;
    const paidTotal = bills
      .filter((b) => b.status === 'Paid')
      .reduce((sum, b) => sum + b.amount, 0);
    const unpaidTotal = bills
      .filter((b) => b.status !== 'Paid')
      .reduce((sum, b) => sum + b.amount, 0);
    return { pendingCount, paidTotal, unpaidTotal, totalCount: bills.length };
  }, [bills]);

  // Filter visible bills
  const visibleBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesFilter =
        filter === 'All'
          ? true
          : filter === 'Pending'
            ? bill.paymentStatus === 'Pending_Confirmation'
            : filter === 'Paid'
              ? bill.status === 'Paid'
              : filter === 'Unpaid'
                ? bill.status === 'Unpaid' && bill.paymentStatus !== 'Pending_Confirmation'
                : bill.status === 'Overdue';

      const searchTarget = `${bill.id} ${bill.subscriberId} ${bill.subscriberName} ${bill.subscriberPlan} ${bill.billingPeriod} ${bill.referenceNumber} ${bill.paymentMethod}`.toLowerCase();
      const matchesSearch = query === '' || searchTarget.includes(query.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [bills, filter, query]);

  // Confirm payment via API
  const handleConfirmPayment = async (bill: AdminBill) => {
    setIsProcessing(true);
    setReviewError('');
    try {
      const response = await fetch(`/api/bills/${bill.id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: bill.paymentMethod || 'GCash',
          referenceNumber: bill.referenceNumber,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setReviewError(result.error || 'Failed to confirm payment.');
      } else {
        setActionSuccess(`Payment confirmed! Bill has been marked as Paid and deducted.`);
        // Update local state
        setBills((prev) =>
          prev.map((b) =>
            b.id === bill.id
              ? {
                  ...b,
                  status: 'Paid',
                  paymentStatus: 'Paid',
                  paidAt: new Date().toISOString(),
                }
              : b
          )
        );
        setTimeout(() => {
          setReviewBill(null);
          setActionSuccess('');
        }, 1500);
      }
    } catch {
      setReviewError('Network error while confirming payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject payment via API
  const handleRejectPayment = async (bill: AdminBill) => {
    setIsProcessing(true);
    setReviewError('');
    try {
      const response = await fetch(`/api/bills/${bill.id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setReviewError(result.error || 'Failed to reject payment.');
      } else {
        setActionSuccess('Payment submission rejected. Subscriber has been notified.');
        setBills((prev) =>
          prev.map((b) =>
            b.id === bill.id
              ? {
                  ...b,
                  paymentStatus: 'Rejected',
                }
              : b
          )
        );
        setTimeout(() => {
          setReviewBill(null);
          setShowRejectInput(false);
          setRejectReason('');
          setActionSuccess('');
        }, 1500);
      }
    } catch {
      setReviewError('Network error while rejecting payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm manual payment (Walk-in / Cash)
  const handleManualConfirm = async () => {
    if (!manualPayBill) return;
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('paymentMethod', manualMethod);
      formData.append('referenceNumber', manualRef.trim() || `OFFICE-${Date.now().toString().slice(-6)}`);
      if (manualReceiptFile) {
        formData.append('receipt', manualReceiptFile);
      }

      const response = await fetch(`/api/bills/${manualPayBill.id}/confirm`, {
        method: 'PUT',
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        setBills((prev) =>
          prev.map((b) =>
            b.id === manualPayBill.id
              ? {
                  ...b,
                  status: 'Paid',
                  paymentStatus: 'Paid',
                  paymentMethod: manualMethod,
                  referenceNumber: manualRef.trim() || b.referenceNumber,
                  receiptImage: result.data?.receiptImage || manualReceiptPreview || b.receiptImage,
                  paidAt: new Date().toISOString(),
                }
              : b
          )
        );
        setManualPayBill(null);
        setManualRef('');
        setManualReceiptFile(null);
        setManualReceiptPreview(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyRefNumber = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <PortalShell role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Billing & Collections
              </h1>
              {stats.pendingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-700 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {stats.pendingCount} GCash Awaiting Confirmation
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Review GCash and Cash receipts, verify transaction numbers, and confirm auto-deductions
            </p>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Pending Confirmations */}
          <div
            onClick={() => setFilter('Pending')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              filter === 'Pending'
                ? 'border-amber-400 bg-amber-50/50 shadow-md ring-2 ring-amber-300'
                : 'border-slate-200/90 bg-white hover:border-amber-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Awaiting Confirmation
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <Clock3 size={16} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-amber-700">{stats.pendingCount}</p>
            <p className="mt-1 text-xs text-amber-600/90 font-medium">
              GCash & Cash receipts pending admin verification
            </p>
          </div>

          {/* Card 2: Total Collected */}
          <div
            onClick={() => setFilter('Paid')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              filter === 'Paid'
                ? 'border-emerald-400 bg-emerald-50/50 shadow-md ring-2 ring-emerald-300'
                : 'border-slate-200/90 bg-white hover:border-emerald-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Total Collected
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-700">
              ₱{stats.paidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-emerald-600/90 font-medium">
              Confirmed & cleared payments
            </p>
          </div>

          {/* Card 3: Total Outstanding Balance */}
          <div
            onClick={() => setFilter('Unpaid')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              filter === 'Unpaid'
                ? 'border-rose-400 bg-rose-50/50 shadow-md ring-2 ring-rose-300'
                : 'border-slate-200/90 bg-white hover:border-rose-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Outstanding Balance
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600">
                <CreditCard size={16} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">
              ₱{stats.unpaidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-medium">Remaining unpaid due bills</p>
          </div>

          {/* Card 4: Total Records */}
          <div
            onClick={() => setFilter('All')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all ${
              filter === 'All'
                ? 'border-blue-400 bg-blue-50/50 shadow-md ring-2 ring-blue-300'
                : 'border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Total Invoices
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100 text-blue-700">
                <Receipt size={16} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">{stats.totalCount}</p>
            <p className="mt-1 text-xs text-slate-500 font-medium">Monthly subscriber statements</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['All', 'All Invoices'],
                ['Pending', `Awaiting Confirmation (${stats.pendingCount})`],
                ['Unpaid', 'Unpaid'],
                ['Paid', 'Paid'],
                ['Overdue', 'Overdue'],
              ] as const
            ).map(([tabKey, label]) => {
              const active = filter === tabKey;
              const isPendingTab = tabKey === 'Pending';
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setFilter(tabKey as FilterTab)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    active
                      ? isPendingTab
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-[#1b43b4] text-white shadow-sm'
                      : isPendingTab && stats.pendingCount > 0
                        ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-extrabold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isPendingTab && stats.pendingCount > 0 && !active && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search subscriber, ref #, ID..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#1b43b4] transition"
            />
          </div>
        </div>

        {/* Billing Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Subscriber ID</th>
                  <th className="px-5 py-3.5">Subscriber Name</th>
                  <th className="px-5 py-3.5">Plan</th>
                  <th className="px-5 py-3.5">Billing Period</th>
                  <th className="px-5 py-3.5">Amount Due</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Payment Details</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-[#1b43b4]" />
                        <span className="font-medium">Loading billing records...</span>
                      </div>
                    </td>
                  </tr>
                ) : visibleBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                      No invoices found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  visibleBills.map((bill) => {
                    const isPending = bill.paymentStatus === 'Pending_Confirmation';
                    const isPaid = bill.status === 'Paid';

                    return (
                      <tr
                        key={bill.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isPending ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Subscriber ID */}
                        <td className="px-5 py-4 font-mono font-bold text-blue-700">
                          {bill.subscriberId}
                        </td>

                        {/* Name */}
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {bill.subscriberName}
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {bill.subscriberPlan}
                        </td>

                        {/* Period */}
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {bill.formattedPeriod}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {bill.formattedAmount}
                        </td>

                        {/* Due Date */}
                        <td className="px-5 py-4 text-slate-500 font-medium">
                          {bill.dueDate}
                        </td>

                        {/* Payment Details: Method, Ref Number, Receipt Button */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 font-semibold">
                                {bill.paymentMethod}
                              </span>
                              {bill.referenceNumber && (
                                <span className="font-mono text-[11px] text-slate-600">
                                  Ref: {bill.referenceNumber}
                                </span>
                              )}
                            </div>

                            {/* Uploaded Receipt Viewer Thumbnail */}
                            {bill.receiptImage ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(bill.receiptImage)}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                                title="Click to view full receipt"
                              >
                                <Eye size={11} />
                                <span>View Receipt</span>
                              </button>
                            ) : bill.paymentMethod === 'GCash' && isPending ? (
                              <span className="text-[10px] text-amber-600 font-semibold">
                                Receipt attached
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs">
                              <Clock3 size={12} className="text-amber-600" />
                              <span>Pending Confirmation</span>
                            </span>
                          ) : isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>Paid</span>
                            </span>
                          ) : bill.status === 'Overdue' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                              <AlertCircle size={12} className="text-rose-600" />
                              <span>Overdue</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                              <span>Unpaid</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-4 text-right">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewBill(bill);
                                setReviewError('');
                                setActionSuccess('');
                                setShowRejectInput(false);
                                setRejectReason('');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                            >
                              <FileCheck2 size={13} />
                              <span>Review & Confirm</span>
                            </button>
                          ) : isPaid ? (
                            <span className="text-[11px] font-semibold text-slate-400">
                              Cleared
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setManualPayBill(bill);
                                setManualMethod('Walk-in');
                                setManualRef('');
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
                            >
                              <Check size={13} />
                              <span>Pay Cash</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* -------------------- REVIEW & CONFIRM GCASH PAYMENT MODAL -------------------- */}
      {reviewBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in"
          onMouseDown={() => setReviewBill(null)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Verify {reviewBill.paymentMethod || 'Payment'} Proof
                  </h2>
                  <p className="text-xs text-slate-500">
                    Confirm transaction number and receipt image to auto-deduct due bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewBill(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Toast Alerts */}
              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {reviewError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{reviewError}</span>
                </div>
              )}

              {/* 2-Column Info: Invoice Details vs Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscriber:</span>
                    <span className="font-bold text-slate-900">{reviewBill.subscriberName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account ID:</span>
                    <span className="font-mono font-bold text-blue-700">{reviewBill.subscriberId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Internet Plan:</span>
                    <span className="font-semibold text-slate-800">{reviewBill.subscriberPlan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Billing Period:</span>
                    <span className="font-semibold text-slate-800">{reviewBill.formattedPeriod}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                    <span className="text-slate-700">Amount Due:</span>
                    <span className="text-base text-blue-700">{reviewBill.formattedAmount}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      Submitted Reference Number
                    </span>
                    <div className="mt-1 flex items-center justify-between rounded-xl bg-white border border-blue-200 px-3 py-2">
                      <span className="font-mono text-sm font-black text-slate-900 tracking-wider">
                        {reviewBill.referenceNumber || 'No Ref Number'}
                      </span>
                      {reviewBill.referenceNumber && (
                        <button
                          type="button"
                          onClick={() => copyRefNumber(reviewBill.referenceNumber)}
                          className="text-blue-600 hover:text-blue-800 transition cursor-pointer p-1"
                          title="Copy Reference Number"
                        >
                          {copiedRef ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <CreditCard size={14} className="text-blue-600" />
                    <span>Payment Method: <strong>{reviewBill.paymentMethod}</strong></span>
                  </div>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-800 leading-relaxed">
                    ✨ Confirming will mark this bill as <strong>Paid</strong> and auto-deduct the <strong>{reviewBill.formattedAmount}</strong> from subscriber&apos;s due balance.
                  </div>
                </div>
              </div>

              {/* Uploaded Receipt Image Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Uploaded {reviewBill.paymentMethod || 'Payment'} Receipt
                  </span>
                  {reviewBill.receiptImage && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(reviewBill.receiptImage)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      <span>Open Full Size</span>
                    </button>
                  )}
                </div>

                {reviewBill.receiptImage ? (
                  <div
                    onClick={() => setPreviewImage(reviewBill.receiptImage)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 max-h-72 flex items-center justify-center"
                  >
                    <img
                      src={reviewBill.receiptImage}
                      alt="GCash Payment Receipt"
                      className="max-h-72 w-auto object-contain transition group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                      <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md">
                        Click to Zoom Receipt
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-400">
                    No receipt image file was attached with this submission. Verify reference number manually in GCash merchant app.
                  </div>
                )}
              </div>

              {/* Decline Reason Input (if rejecting) */}
              {showRejectInput && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
                  <label className="block text-xs font-bold text-rose-900">
                    Reason for Declining (Sent to subscriber via Notification)
                  </label>
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Reference number not found in GCash transactions"
                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs outline-none focus:border-rose-500"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRejectPayment(reviewBill)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer"
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      <span>Confirm Decline</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                {!showRejectInput && (
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <XCircle size={14} />
                    <span>Decline Payment</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewBill(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleConfirmPayment(reviewBill)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Confirm Payment & Deduct Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MANUAL CASH PAYMENT MODAL -------------------- */}
      {manualPayBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in"
          onMouseDown={() => setManualPayBill(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-900">
                Record Over-The-Counter Cash Payment
              </h2>
              <button
                type="button"
                onClick={() => setManualPayBill(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <dl className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subscriber ID:</dt>
                  <dd className="font-mono font-bold text-blue-700">{manualPayBill.subscriberId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subscriber Name:</dt>
                  <dd className="font-bold text-slate-800">{manualPayBill.subscriberName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Period:</dt>
                  <dd className="font-semibold text-slate-700">{manualPayBill.formattedPeriod}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                  <dt className="text-slate-800">Amount to Collect:</dt>
                  <dd className="text-base text-emerald-600">{manualPayBill.formattedAmount}</dd>
                </div>
              </dl>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={manualMethod}
                  onChange={(e) => setManualMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="Walk-in">Walk-in / Cash (Office Counter)</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Official Receipt (OR) Number / Ref
                </label>
                <input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder="e.g. OR-2026-00492"
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-mono outline-none focus:border-blue-600"
                />
              </div>

              {/* Upload Receipt for Cash / Manual Payment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Upload Official Receipt (OR) / Cash Slip
                </label>
                <input
                  type="file"
                  ref={manualReceiptInputRef}
                  onChange={handleManualReceiptChange}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />
                {manualReceiptPreview ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
                      <img
                        src={manualReceiptPreview}
                        alt="Receipt preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {manualReceiptFile?.name || 'Attached Cash Receipt'}
                      </p>
                      <button
                        type="button"
                        onClick={() => manualReceiptInputRef.current?.click()}
                        className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Change Image
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setManualReceiptFile(null);
                        setManualReceiptPreview(null);
                        if (manualReceiptInputRef.current) manualReceiptInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => manualReceiptInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-bold text-slate-600 hover:border-blue-400 hover:bg-blue-50/50 transition cursor-pointer"
                  >
                    <Upload size={14} className="text-[#2563eb]" />
                    <span>Upload / Attach Scanned Receipt or Photo</span>
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManualPayBill(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleManualConfirm}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={13} className="animate-spin text-white" /> : <Check size={13} />}
                  <span>Confirm Cash Payment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- FULL RECEIPT IMAGE LIGHTBOX -------------------- */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-slate-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80 transition cursor-pointer"
            >
              <X size={20} />
            </button>
            <img
              src={previewImage}
              alt="Uploaded GCash Receipt"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </PortalShell>
  );
}
