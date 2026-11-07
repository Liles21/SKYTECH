'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Info,
  MapPin,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type Bill = {
  id: string;
  billingPeriod: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  receiptImage?: string | null;
  paymentStatus?: 'Unpaid' | 'Pending_Confirmation' | 'Paid' | 'Rejected' | string;
  paidAt?: string | null;
  subscriberId?: string;
  subscriber?: { name?: string; plan?: string };
};

type Account = {
  id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  planName: string;
  speedMbps: number;
  monthlyPrice: number;
};

// Generates a crisp, realistic SVG QR code with corner finder patterns and center GCash badge
function VisualQr() {
  const matrix = [
    '0000000010110110100000000',
    '0000000001101001100000000',
    '0000000011010110000000000',
    '0000000001011010100000000',
    '0000000010100101100000000',
    '0000000001101100100000000',
    '0000000010101010100000000',
    '0000000001011001000000000',
    '1101101011001011010110101',
    '0110010101100100101101010',
    '1011011010000000110011011',
    '1100100101000000101100101',
    '0101110110000000010111010',
    '1010011001000000110010110',
    '1101010110000000101101001',
    '0110101001101011010010110',
    '1011011010110101000001011',
    '0000000011001010000000101',
    '0000000010110101000001100',
    '0000000001101011000000110',
    '0000000011010100000001011',
    '0000000001011010110110101',
    '0000000010110111001011010',
    '0000000001101001101100110',
    '0000000011010110010111001',
  ];

  const isReserved = (r: number, c: number) => {
    if (r < 8 && c < 8) return true; // Top-left finder + separator
    if (r < 8 && c > 16) return true; // Top-right finder + separator
    if (r > 16 && c < 8) return true; // Bottom-left finder + separator
    if (r >= 16 && r <= 20 && c >= 16 && c <= 20) return true; // Alignment pattern
    if (r >= 10 && r <= 14 && c >= 10 && c <= 14) return true; // Center badge area
    return false;
  };

  return (
    <div className="relative flex h-44 w-44 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
      <svg
        viewBox="0 0 25 25"
        className="h-full w-full"
        shapeRendering="crispEdges"
        aria-label="GCash QR Code for 09091423431"
      >
        {/* Top-Left Finder Pattern */}
        <path
          fill="#1b43b4"
          fillRule="evenodd"
          d="M0,0 h7 v7 h-7 z M1,1 v5 h5 v-5 z M2,2 h3 v3 h-3 z"
        />
        {/* Top-Right Finder Pattern */}
        <path
          fill="#1b43b4"
          fillRule="evenodd"
          d="M18,0 h7 v7 h-7 z M19,1 v5 h5 v-5 z M20,2 h3 v3 h-3 z"
        />
        {/* Bottom-Left Finder Pattern */}
        <path
          fill="#1b43b4"
          fillRule="evenodd"
          d="M0,18 h7 v7 h-7 z M1,19 v5 h5 v-5 z M2,20 h3 v3 h-3 z"
        />
        {/* Bottom-Right Alignment Pattern */}
        <path
          fill="#1b43b4"
          fillRule="evenodd"
          d="M16,16 h5 v5 h-5 z M17,17 v3 h3 v-3 z M18,18 h1 v1 h-1 z"
        />
        {/* Data & Timing Modules */}
        {matrix.map((row, r) =>
          row.split('').map((bit, c) =>
            !isReserved(r, c) && bit === '1' ? (
              <rect
                key={`${r}-${c}`}
                x={c + 0.08}
                y={r + 0.08}
                width={0.84}
                height={0.84}
                fill="#1b43b4"
              />
            ) : null
          )
        )}
      </svg>

      {/* Center GCash Badge */}
      <div className="pointer-events-none absolute grid h-8 w-8 place-items-center rounded-lg border-2 border-white bg-[#007dfe] text-xs font-black text-white shadow-sm">
        G
      </div>
    </div>
  );
}

export default function PayBillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<'GCash' | 'Walk-in'>('GCash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUpdatingPending, setIsUpdatingPending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState<Bill | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [receiptBill, setReceiptBill] = useState<Bill | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Load account and bills
  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, billsRes] = await Promise.all([
        fetch('/api/account'),
        fetch('/api/bills'),
      ]);

      if (accRes.ok) {
        const accData = await accRes.json();
        if (accData.data) setAccount(accData.data);
      }

      if (billsRes.ok) {
        const billsData = await billsRes.json();
        if (Array.isArray(billsData.data)) {
          setBills(billsData.data);
        }
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Find active unpaid bill (or first bill)
  const activeBill =
    bills.find((b) => b.status === 'Unpaid' || b.status === 'Overdue') ||
    bills[0];

  const hasUnpaid = activeBill && activeBill.status !== 'Paid';
  const isPendingReview = Boolean(activeBill && activeBill.paymentStatus === 'Pending_Confirmation');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Handle receipt image selection
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPaymentError('Please upload an image file (PNG, JPG, or WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPaymentError('Image size exceeds 8MB. Please choose a smaller image.');
      return;
    }
    setPaymentError('');
    setReceiptFile(file);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (receiptInputRef.current) receiptInputRef.current.value = '';
  };

  // Submit payment
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill) return;

    if (!referenceNumber.trim()) {
      setPaymentError('Please enter the Reference / Transaction Number.');
      return;
    }

    if (!receiptFile && !activeBill.receiptImage) {
      setPaymentError(
        method === 'GCash'
          ? 'Please upload your GCash payment receipt or screenshot.'
          : 'Please upload your Cash payment receipt or Official Receipt (OR) photo.'
      );
      return;
    }

    setIsSubmitting(true);
    setPaymentError('');

    try {
      const formData = new FormData();
      formData.append('paymentMethod', method);
      formData.append('referenceNumber', referenceNumber.trim());
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const response = await fetch(`/api/bills/${activeBill.id}/pay`, {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        setPaymentError(result.error || 'Payment submission failed.');
      } else {
        const updatedBill: Bill = result.data || {
          ...activeBill,
          paymentMethod: method,
          referenceNumber: referenceNumber.trim(),
          receiptImage: receiptPreview || activeBill.receiptImage,
          paymentStatus: 'Pending_Confirmation',
        };
        if (updatedBill.status === 'Paid') {
          setPaymentSuccess(updatedBill);
        }
        setIsUpdatingPending(false);
        setReferenceNumber('');
        removeReceipt();
        // Refresh bills list
        setBills((current) =>
          current.map((b) => (b.id === activeBill.id ? updatedBill : b))
        );
      }
    } catch {
      setPaymentError('Network connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalShell role="subscriber">
      <div className="bg-[#f8fafc] pb-8 text-slate-900">
        {/* Top Header Banner with Gradient & Brand */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] text-white shadow-lg">
          {/* Subtle Fiber Background Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.18),transparent_50%)] pointer-events-none" />
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/subscriber/my-account"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-150 hover:-translate-x-0.5"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      Billing & Payments
                    </h1>
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Account
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-blue-100/80">
                    Official payment gateway for Sky-Tech Pure Fiber subscribers
                  </p>
                </div>
              </div>

              {/* Official Brand Logo from /images/Skytech.jpg */}
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 backdrop-blur-md">
                <div className="h-9 w-9 overflow-hidden rounded-xl bg-white p-0.5 shadow-sm">
                  <Image src="/images/Skytech.jpg" alt="Sky-Tech Fiber Logo" width={36} height={36} className="h-full w-full object-contain rounded-lg" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white">
                    Sky-Tech Fiber
                  </p>
                  <p className="text-[10px] text-blue-200">Billing Center</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-8 lg:px-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#2563eb] border-t-transparent mb-3" />
              <p className="text-sm font-semibold">Loading your billing details...</p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Left Column: Current Invoice Card & Payment Method (7 cols) */}
              <div className="space-y-6 lg:col-span-7">
                {/* 1. CURRENT BILL HERO CARD */}
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
                  {/* Status Gradient Strip */}
                  <div
                    className={`absolute inset-x-0 top-0 h-2 ${
                      hasUnpaid
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500'
                    }`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2563eb]">
                        <Wifi size={24} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          {account?.planName || 'Fiber Internet Plan'}
                        </h2>
                        <p className="text-xs text-slate-500">
                          Account #{account?.id || activeBill?.subscriberId || '100000001'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wide shadow-2xs ${
                        !hasUnpaid
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isPendingReview
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {!hasUnpaid ? (
                        <>
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>All Caught Up</span>
                        </>
                      ) : isPendingReview ? (
                        <>
                          <Clock3 size={13} className="text-amber-700 animate-pulse" />
                          <span>Pending Confirmation</span>
                        </>
                      ) : (
                        <>
                          <Clock3 size={13} className="text-amber-600" />
                          <span>Payment Due</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Pricing and Due Date Info */}
                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total Amount Due
                      </p>
                      <p
                        className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 ${
                          hasUnpaid ? 'text-slate-900' : 'text-emerald-600'
                        }`}
                      >
                        {hasUnpaid
                          ? `₱${Number(activeBill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '₱0.00'}
                      </p>
                      {isPendingReview && (
                        <p className="mt-1.5 text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                          Verification in progress · Clears automatically once admin confirms
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400">Due Date</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {activeBill?.dueDate
                          ? new Date(activeBill.dueDate).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'End of Month'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Period: {activeBill?.billingPeriod || 'Current Month'}
                      </p>
                    </div>
                  </div>

                  {/* All Caught Up / Paid Celebratory State */}
                  {!hasUnpaid && (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <ShieldCheck size={22} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-emerald-950 text-sm">
                          Your fiber internet is active & fully paid!
                        </h4>
                        <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
                          No pending balance is required. Your high-speed connection will continue without interruption. Next billing cycle starts on the 10th.
                        </p>
                        {bills.length > 0 && bills[0].status === 'Paid' && (
                          <button
                            type="button"
                            onClick={() => setReceiptBill(bills[0])}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            <FileText size={14} />
                            View Latest Official Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. PAYMENT METHODS & FORM (Rendered when there is an active bill or payment is requested) */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Select Payment Method
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Instant payment confirmation available 24/7
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                      <Sparkles size={13} />
                      Zero Convenience Fee
                    </span>
                  </div>

                  {/* Payment Method Selector Tabs */}
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
                    {[
                      { id: 'GCash', label: 'GCash QR & Transfer', icon: QrCode, popular: true },
                      { id: 'Walk-in', label: 'Office Cash Payment', icon: Building2, popular: false },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMethod(tab.id as 'GCash' | 'Walk-in')}
                        className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all cursor-pointer ${
                          method === tab.id
                            ? 'border-[#2563eb] bg-blue-50/70 text-[#2563eb] shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {tab.popular && (
                          <span className="absolute -top-2 rounded-full bg-[#2563eb] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                            Recommended
                          </span>
                        )}
                        <tab.icon size={22} />
                        <span className="text-xs sm:text-sm font-bold">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab Details */}
                  <div className="mt-6">
                    {method === 'GCash' && (
                      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-5 space-y-4">
                        <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                          <Info size={17} className="text-[#2563eb]" />
                          Pay with GCash QR or Express Send
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
                          <div className="shrink-0 flex flex-col items-center">
                            <VisualQr />
                            <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Scan with GCash
                            </p>
                          </div>

                          <div className="flex-1 space-y-3 text-left w-full">
                            <div className="rounded-xl bg-white p-3 border border-blue-100 shadow-2xs">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Official GCash Mobile Number
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-mono text-base font-bold text-slate-900">
                                  09091423431
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard('09091423431', 'gcash')}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                  {copiedText === 'gcash' ? (
                                    <>
                                      <Check size={12} className="text-emerald-600" />
                                      <span className="text-emerald-700">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 border border-blue-100 shadow-2xs">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Registered Account Name
                              </p>
                              <p className="font-bold text-sm text-slate-800 mt-0.5">
                                SKY-TECH FIBER ISP / GALIT ENTERPRISES
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {method === 'Walk-in' && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-4">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                          <Building2 size={18} className="text-[#2563eb]" />
                          Walk-in Over-The-Counter Payment
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Pay directly with cash at our main business office. Our customer service representative will issue an official printed receipt immediately.
                        </p>
                        <div className="rounded-xl bg-white p-4 border border-slate-200 text-xs space-y-3">
                          <div className="flex items-start gap-2.5 text-slate-800 font-semibold">
                            <MapPin size={16} className="text-[#2563eb] shrink-0 mt-0.5" />
                            <span>Main St., Poblacion, Sibagat, Agusan del Sur</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-600">
                            <Clock3 size={16} className="text-slate-400 shrink-0" />
                            <span>Office Hours: Monday to Saturday, 8:00 AM – 5:00 PM</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-600">
                            <Phone size={16} className="text-slate-400 shrink-0" />
                            <span>Hotline: (085) 815-2026 / 09091423431</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hidden File Input for Receipt Upload */}
                  <input
                    type="file"
                    ref={receiptInputRef}
                    onChange={handleReceiptChange}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    className="hidden"
                  />

                  {/* -------------------- PAYMENT FORM OR PENDING STATUS -------------------- */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    {paymentError && (
                      <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 flex items-center gap-2">
                        <AlertCircle size={15} className="shrink-0 text-rose-600" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    {paymentSuccess && (
                      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-2">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Check size={20} />
                        </div>
                        <h4 className="font-bold text-emerald-950 text-sm">
                          Payment Confirmed Successfully!
                        </h4>
                        <p className="text-xs text-emerald-800">
                          Reference #{paymentSuccess.referenceNumber || 'Approved'}. Your account balance is now updated.
                        </p>
                        <button
                          type="button"
                          onClick={() => setReceiptBill(paymentSuccess)}
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          <FileText size={14} />
                          Print / View Official Receipt
                        </button>
                      </div>
                    )}

                    {/* Pending Confirmation Status Card */}
                    {isPendingReview && !isUpdatingPending ? (
                      <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-200 text-amber-800 shrink-0">
                              <Clock3 size={20} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-amber-950">
                                {activeBill.paymentMethod === 'Walk-in' || activeBill.paymentMethod === 'Cash'
                                  ? 'Cash Payment Submitted — Awaiting Admin Confirmation'
                                  : 'GCash Payment Submitted — Awaiting Admin Confirmation'}
                              </h4>
                              <p className="text-xs text-amber-800 font-mono">
                                {activeBill.paymentMethod === 'Walk-in' || activeBill.paymentMethod === 'Cash'
                                  ? `OR Number: #${activeBill.referenceNumber}`
                                  : `Ref: #${activeBill.referenceNumber}`}
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full bg-amber-200/80 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 shrink-0">
                            Under Review
                          </span>
                        </div>

                        <p className="text-xs text-amber-900/90 leading-relaxed">
                          Your {activeBill.paymentMethod === 'Walk-in' || activeBill.paymentMethod === 'Cash' ? 'cash payment receipt' : 'GCash receipt'} and transaction number have been sent to our admin billing team for verification. Once confirmed by the admin, your due bill will automatically be cleared.
                        </p>

                        {/* Uploaded Receipt Preview */}
                        {(receiptPreview || activeBill.receiptImage) && (
                          <div className="rounded-xl border border-amber-200 bg-white p-3 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Uploaded {activeBill.paymentMethod === 'Walk-in' || activeBill.paymentMethod === 'Cash' ? 'Cash Official Receipt' : 'GCash Receipt'}
                            </p>
                            <div className="relative h-48 w-full overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
                              <img
                                src={receiptPreview || activeBill.receiptImage || ''}
                                alt="Uploaded Payment Receipt"
                                className="h-full w-full object-contain"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsUpdatingPending(true);
                              setReferenceNumber(activeBill.referenceNumber || '');
                            }}
                            className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                          >
                            Update Reference Number or Re-upload Receipt
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Payment Submission Form */
                      <form onSubmit={handlePayment} className="space-y-4">
                        {isUpdatingPending && (
                          <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-2 text-xs font-semibold text-blue-800">
                            <span>Updating {method === 'GCash' ? 'GCash' : 'Cash'} Payment Proof</span>
                            <button
                              type="button"
                              onClick={() => setIsUpdatingPending(false)}
                              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* 1. Upload Receipt Field (For both GCash and Cash/Walk-in) */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            {method === 'GCash'
                              ? 'Upload GCash Payment Receipt / Screenshot *'
                              : 'Upload Cash Payment Receipt / Official Receipt (OR) *'}
                          </label>

                          {receiptPreview || (isUpdatingPending && activeBill?.receiptImage && !receiptFile) ? (
                            <div className="relative rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center gap-3">
                                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-200 flex items-center justify-center">
                                  <img
                                    src={receiptPreview || activeBill?.receiptImage || ''}
                                    alt="Receipt preview"
                                    className="h-full w-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-800 truncate">
                                    {receiptFile?.name ||
                                      (method === 'GCash'
                                        ? 'Attached GCash Receipt'
                                        : 'Attached Cash Official Receipt')}
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {receiptFile
                                      ? `${(receiptFile.size / (1024 * 1024)).toFixed(2)} MB`
                                      : 'Currently uploaded receipt'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => receiptInputRef.current?.click()}
                                    className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                                  >
                                    Change Image
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={removeReceipt}
                                  title="Remove receipt"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => receiptInputRef.current?.click()}
                              className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 p-6 text-center transition"
                            >
                              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white border border-slate-200 shadow-2xs text-[#2563eb] group-hover:scale-105 transition">
                                <Upload size={20} />
                              </div>
                              <p className="mt-2 text-xs font-bold text-slate-800">
                                {method === 'GCash'
                                  ? 'Tap or drag & drop to upload GCash receipt screenshot'
                                  : 'Tap or drag & drop to upload Cash / Official Receipt photo'}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                Supports PNG, JPG, or WebP (max 8MB)
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 2. Reference / Transaction Number Field */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                            {method === 'Walk-in'
                              ? 'Official Receipt (OR) Number *'
                              : 'Reference / Transaction Number *'}
                          </label>
                          <input
                            required
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            placeholder={
                              method === 'GCash'
                                ? 'e.g. 1002938472910 (13-digit GCash Ref)'
                                : 'e.g. OR-2026-9482 (Office Receipt No.)'
                            }
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            {method === 'GCash'
                              ? 'Found on your GCash transaction confirmation receipt screen.'
                              : 'Found on your printed or stamped office official receipt slip.'}
                          </p>
                        </div>

                        {/* Auto-deduct information tip */}
                        <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                          <span>
                            Once submitted, the admin will verify your receipt and reference number. Upon admin confirmation, your due bill will automatically be cleared.
                          </span>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isSubmitting || !hasUnpaid}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-6 py-4 text-base font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={18} className="animate-spin text-white" />
                              <span>Uploading & Submitting Proof...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={18} />
                              <span>
                                {isUpdatingPending
                                  ? `Update ${method === 'GCash' ? 'GCash' : 'Cash'} Payment Proof`
                                  : hasUnpaid
                                    ? `Submit ${method === 'GCash' ? 'GCash' : 'Cash'} Payment (₱${Number(activeBill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })})`
                                    : 'All Bills Paid (No Payment Due)'}
                              </span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Statement History & Account Summary (5 cols) */}
              <div className="space-y-6 lg:col-span-5">
                {/* Account Snapshot Card */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                    Subscription Overview
                  </h3>
                  <div className="mt-4 space-y-3.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Subscriber Name</span>
                      <span className="font-bold text-slate-800">{account?.name || 'Loading...'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Account ID</span>
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {account?.id || 'SUB-100000001'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Internet Plan</span>
                      <span className="font-bold text-slate-800">{account?.planName || 'Fiber 100 Mbps'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Bandwidth Speed</span>
                      <span className="font-bold text-emerald-600">
                        {account?.speedMbps || 100} Mbps Pure Fiber
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Billing Cut-off</span>
                      <span className="font-semibold text-slate-700">Every 9th of Month</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400">Payment Due Date</span>
                      <span className="font-semibold text-slate-700">Every 30th of Month</span>
                    </div>
                  </div>
                </div>

                {/* Invoices & Statement History */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900">
                      Billing Statements
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {bills.length} {bills.length === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {bills.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">
                        No previous billing statements found.
                      </p>
                    ) : (
                      bills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-800">
                                {bill.billingPeriod} Invoice
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  bill.status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-amber-50 text-amber-600'
                                }`}
                              >
                                {bill.status}
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-slate-400">
                              {bill.id}
                            </p>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="font-bold text-sm text-slate-900">
                                ₱{Number(bill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(bill.dueDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setReceiptBill(bill)}
                              title="View and print official receipt"
                              className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              <FileText size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Need Assistance Card */}
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                      <Phone size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-blue-950">
                        Need Billing Assistance?
                      </h4>
                      <p className="text-xs text-blue-800/80 mt-0.5">
                        Our local dispatch team is ready to assist.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-blue-200/50 flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-900">Customer Support Hotline</span>
                    <span className="font-mono font-bold text-blue-700">(085) 815-2026</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----------------- OFFICIAL STATEMENT / RECEIPT MODAL ----------------- */}
      {receiptBill && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onMouseDown={() => setReceiptBill(null)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Official Billing Statement</h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptBill(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Printable Card */}
            <div className="p-6 sm:p-8 space-y-6 text-slate-900">
              {/* Receipt Top Header with Logo */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-sky-500 bg-[#071329] shadow-sm flex items-center justify-center">
                    <Image src="/images/Skytech.jpg" alt="Skytech" width={44} height={44} className="h-full w-full object-cover rounded-full scale-110" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                      Sky-Tech Fiber ISP
                    </h4>
                    <p className="text-[11px] text-slate-400">Poblacion, Sibagat, Agusan del Sur</p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      receiptBill.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {receiptBill.status === 'Paid' ? 'PAID IN FULL' : 'UNPAID STATEMENT'}
                  </span>
                  <p className="font-mono text-[10px] text-slate-400 mt-1">{receiptBill.id}</p>
                </div>
              </div>

              {/* Subscriber & Bill Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Billed To</span>
                  <p className="font-bold text-slate-900 mt-0.5">{account?.name || 'Subscriber'}</p>
                  <p className="text-slate-500 mt-0.5">{account?.address || 'Sibagat, Agusan del Sur'}</p>
                  <p className="font-mono text-slate-400 mt-0.5">ID: {account?.id || '100000001'}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Invoice Period</span>
                  <p className="font-bold text-slate-900 mt-0.5">{receiptBill.billingPeriod}</p>
                  <p className="text-slate-500 mt-0.5">
                    Due: {new Date(receiptBill.dueDate).toLocaleDateString()}
                  </p>
                  {receiptBill.referenceNumber && (
                    <p className="font-mono text-emerald-700 font-bold mt-0.5">
                      Ref: {receiptBill.referenceNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice Breakdown Table */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2 font-bold text-slate-500 uppercase text-[10px]">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>{account?.planName || 'Pure Fiber Monthly Subscription'}</span>
                  <span>₱{Number(receiptBill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1 text-slate-500 text-[11px]">
                  <span>Value-Added Tax (12% VAT Included)</span>
                  <span>₱{(Number(receiptBill.amount) * 0.12).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-[#2563eb]">
                    ₱{Number(receiptBill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => setReceiptBill(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm cursor-pointer"
              >
                <Printer size={14} />
                Print Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
