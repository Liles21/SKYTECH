'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Building,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
  Wifi,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Account = {
  id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  street?: string | null;
  zipCode?: string | null;
  image?: string | null;
  plan?: string;
  planName?: string;
  speedMbps?: number;
  monthlyPrice?: number;
  status?: string;
  connectionDate?: string;
};

type LocationOption = {
  code: string;
  name: string;
  regionCode?: string;
  provinceCode?: string | false;
};

type ProfileForm = {
  nickname: string;
  email: string;
  contact: string;
  firstName: string;
  middleName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  street: string;
  province: string;
  city: string;
  barangay: string;
  zipCode: string;
};

const PSGC_API = 'https://psgc.gitlab.io/api';

const emptyForm: ProfileForm = {
  nickname: '',
  email: '',
  contact: '',
  firstName: '',
  middleName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  street: '',
  province: '',
  city: '',
  barangay: '',
  zipCode: '',
};

function sortLocations(options: LocationOption[]) {
  return [...options].sort((first, second) =>
    first.name.localeCompare(second.name, 'en', { sensitivity: 'base' })
  );
}

function getForm(account: Account): ProfileForm {
  const parts = account.name.trim().split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.pop() || '';
  return {
    ...emptyForm,
    firstName,
    middleName: parts.join(' '),
    lastName,
    email: account.email || '',
    contact: account.contact || '',
    addressLine1: account.address || '',
    street: account.street || '',
    province: account.province || '',
    city: account.city || '',
    barangay: account.barangay || '',
    zipCode: account.zipCode || '',
  };
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '₱999.00';
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SubscriberProfilePage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location selector state
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);

  // Fetch account data
  const loadAccount = async () => {
    try {
      const response = await fetch('/api/account');
      const result = await response.json();
      if (result.data) {
        setAccount(result.data);
        setForm(getForm(result.data));
      }
    } catch {
      setError('Unable to load profile details.');
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  // PSGC Location API
  useEffect(() => {
    Promise.all([
      fetch(`${PSGC_API}/provinces/`).then((res) => res.json()),
      fetch(`${PSGC_API}/regions/130000000/cities-municipalities/`).then((res) => res.json()),
    ])
      .then(([provinceOptions, ncrCities]) => {
        setProvinces(
          sortLocations([
            { code: '130000000', name: 'NCR (Metro Manila)', regionCode: '130000000', provinceCode: false },
            ...provinceOptions,
          ])
        );
        if (form.province === 'NCR (Metro Manila)') {
          setCities(sortLocations(ncrCities));
        }
      })
      .catch(() => setError('Unable to load Philippine locations.'));
  }, [form.province]);

  useEffect(() => {
    const province = provinces.find((opt) => opt.name === form.province);
    if (!province || province.provinceCode === false) return;
    fetch(`${PSGC_API}/provinces/${province.code}/cities-municipalities/`)
      .then((res) => res.json())
      .then((options: LocationOption[]) => setCities(sortLocations(options)))
      .catch(() => setError('Unable to load cities.'));
  }, [form.province, provinces]);

  useEffect(() => {
    const city = cities.find((opt) => opt.name === form.city);
    if (!city) return;
    fetch(`${PSGC_API}/cities-municipalities/${city.code}/barangays/`)
      .then((res) => res.json())
      .then((options: LocationOption[]) => setBarangays(sortLocations(options)))
      .catch(() => setError('Unable to load barangays.'));
  }, [form.city, cities]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'province' ? { city: '', barangay: '' } : {}),
      ...(field === 'city' ? { barangay: '' } : {}),
    }));
  }

  const copyAccountId = () => {
    if (!account?.id) return;
    navigator.clipboard.writeText(account.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Upload Profile Picture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select an image under 5MB.');
      return;
    }

    setIsUploadingImage(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/account/avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.data?.image) {
        setError(result.error || 'Failed to upload profile picture.');
      } else {
        setAccount((prev) => (prev ? { ...prev, image: result.data.image } : prev));
        setSuccessMessage('Profile picture updated successfully! Admin and portal will see it.');
        // Trigger live navbar update
        window.dispatchEvent(new Event('avatar-updated'));
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch {
      setError('Network error while uploading photo. Please try again.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    setIsSaving(true);
    setError('');

    const name = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    const address = [
      form.addressLine1,
      form.addressLine2,
      form.street,
      form.barangay,
      form.city,
      form.province,
      form.zipCode,
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const response = await fetch(`/api/subscribers/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: form.email.trim(),
          contact: form.contact.trim(),
          address,
          province: form.province,
          city: form.city,
          barangay: form.barangay,
          street: form.street,
          zipCode: form.zipCode,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.data) {
        setError(result.error || 'Unable to save profile details.');
      } else {
        setAccount(result.data);
        setForm(getForm(result.data));
        setIsEditing(false);
        setSuccessMessage('Profile details updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3500);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  const displayName = formatPersonName(account?.name || 'Valued Subscriber');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SB';

  const provinceOptions = Array.from(
    new Map(
      [...provinces, ...(form.province ? [{ code: 'saved-province', name: form.province }] : [])].map(
        (opt) => [opt.name, opt]
      )
    ).values()
  );

  const cityOptions = Array.from(
    new Map(
      [...cities, ...(form.city ? [{ code: 'saved-city', name: form.city }] : [])].map((opt) => [
        opt.name,
        opt,
      ])
    ).values()
  );

  const barangayOptions = Array.from(
    new Map(
      [...barangays, ...(form.barangay ? [{ code: 'saved-barangay', name: form.barangay }] : [])].map(
        (opt) => [opt.name, opt]
      )
    ).values()
  );

  return (
    <PortalShell role="subscriber">
      <div className="bg-[#f8fafc] pb-8 text-slate-900">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
        />

        {/* -------------------- TOP GRADIENT BANNER -------------------- */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] text-white shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_50%)] pointer-events-none" />
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <Link
                  href="/subscriber/my-account"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-150 hover:-translate-x-0.5 cursor-pointer"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft size={20} />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      Subscriber Profile
                    </h1>
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Fiber Active
                    </span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-blue-100/80">
                    Personal information, profile photo, and registered installation address
                  </p>
                </div>
              </div>

              {/* Official Brand Badge */}
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 backdrop-blur-md">
                <div className="h-9 w-9 overflow-hidden rounded-full border border-sky-400/80 bg-[#071329] p-0.5 shadow-sm">
                  <Image
                    src="/images/Skytech.jpg"
                    alt="Sky-Tech Logo"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover rounded-full scale-110"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white">
                    Sky-Tech Fiber
                  </p>
                  <p className="text-[10px] text-blue-200">Sibagat, Agusan del Sur</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------- MAIN CONTENT CONTAINER -------------------- */}
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-8 lg:px-10">
          {/* Success Toast */}
          {successMessage && (
            <div className="mb-6 flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 flex items-center justify-between gap-2.5 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm font-semibold text-red-800 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={18} className="text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* 1. SUBSCRIBER HERO CARD WITH PROFILE PICTURE UPLOAD */}
          <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Large Avatar with Upload Overlay */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()} title="Click to change profile picture">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-sky-400 opacity-60 blur-sm" />
                  <div className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#1b43b4] to-[#2563eb] text-3xl font-black text-white shadow-xl border-2 border-white overflow-hidden">
                    {account?.image ? (
                      <img
                        src={account.image}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}

                    {/* Hover Camera Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {isUploadingImage ? (
                        <Loader2 size={22} className="animate-spin text-white" />
                      ) : (
                        <>
                          <Camera size={20} />
                          <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Change</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 shadow-sm z-10" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      {displayName}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/70 px-3 py-0.5 text-xs font-bold text-blue-700">
                      <Sparkles size={12} className="text-blue-500" />
                      Sky-Tech Subscriber
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
                      ID: {account?.id || '10000000'}
                      <button
                        type="button"
                        onClick={copyAccountId}
                        title="Copy Account ID"
                        className="ml-1 text-blue-500 hover:text-blue-700 transition cursor-pointer"
                      >
                        {copiedId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail size={14} className="text-slate-400" />
                      {account?.email || 'No email registered'}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone size={14} className="text-slate-400" />
                      {account?.contact || 'No contact number'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit Details */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95 cursor-pointer"
                >
                  <Edit3 size={15} />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>
          </div>

          {/* -------------------- TWO COLUMN DETAILS GRID -------------------- */}
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-12">
            {/* Left Column (7 cols): Personal Details, Registered Installation Address */}
            <div className="min-w-0 space-y-6 lg:col-span-7">
              {/* Card 1: Personal & Contact Information */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <User size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
                      <p className="text-xs text-slate-500">Contact details and subscriber identity</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setIsEditing(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    Update
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Full Legal Name
                    </p>
                    <p className="mt-1 font-bold text-slate-900">{displayName}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Account Number
                    </p>
                    <p className="mt-1 font-mono font-bold text-blue-700">{account?.id || '—'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Email Address
                    </p>
                    <p className="mt-1 font-semibold text-slate-800 break-all">
                      {account?.email || '—'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Contact Number
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">{account?.contact || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Registered Service Address */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Registered Service Address</h3>
                      <p className="text-xs text-slate-500">Optical line installation point</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setIsEditing(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                  >
                    Edit Address
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Complete Installation Address
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-800 leading-relaxed">
                      {account?.address || 'No service address registered yet.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Barangay</p>
                      <p className="mt-0.5 font-bold text-slate-800 truncate">
                        {account?.barangay || 'Poblacion'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Municipality</p>
                      <p className="mt-0.5 font-bold text-slate-800 truncate">
                        {account?.city || 'Sibagat'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Province</p>
                      <p className="mt-0.5 font-bold text-slate-800 truncate">
                        {account?.province || 'Agusan del Sur'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-2.5">
                      <p className="text-[10px] font-bold uppercase text-slate-400">ZIP Code</p>
                      <p className="mt-0.5 font-bold text-slate-800">
                        {account?.zipCode || '8503'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Subscription & Local Support */}
            <div className="min-w-0 space-y-6 lg:col-span-5">
              {/* Card 3: Plan & Bandwidth Summary */}
              <div className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-b from-[#0a192f] via-[#0b1d3a] to-[#071329] p-6 sm:p-7 text-white shadow-md">
                <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-[11px] font-bold text-sky-300">
                    <Wifi size={13} />
                    <span>Pure Optical Fiber</span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    Active
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase font-extrabold tracking-wider text-sky-300">
                    Subscribed Plan
                  </p>
                  <h4 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {account?.planName || 'Fiber 50 Mbps'}
                  </h4>
                  <p className="mt-1 text-xs text-slate-300">
                    Unlimited Pure Fiber Broadband · Sibagat Node
                  </p>
                </div>

                <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Monthly Rate</p>
                    <p className="text-xl font-black text-sky-400">
                      {formatMoney(account?.monthlyPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Bandwidth</p>
                    <p className="text-xl font-black text-white">
                      {account?.speedMbps || 50} <span className="text-xs font-normal text-slate-400">Mbps</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  <Link
                    href="/subscriber/plan-details"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-2.5 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <span>Plan Details</span>
                    <ExternalLink size={13} />
                  </Link>
                  <Link
                    href="/subscriber/pay-bills"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                  >
                    <CreditCard size={13} />
                    <span>Pay Bills</span>
                  </Link>
                </div>
              </div>

              {/* Card 4: Local Support & Dispatch */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                    <Building size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Sibagat Hub Dispatch</h4>
                    <p className="text-xs text-slate-500">Local fiber maintenance & support</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span className="font-semibold text-slate-800">+63 912 345 6789</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span>Poblacion, Sibagat, Agusan del Sur</span>
                  </p>
                </div>
                <Link
                  href="/subscriber/help"
                  className="mt-4 block text-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Contact Support / File Ticket →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* -------------------- EDIT PROFILE MODAL -------------------- */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => !isSaving && setIsEditing(false)} />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                    <Edit3 size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Edit Profile Details</h3>
                    <p className="text-xs text-slate-500">Update your name, contact and address</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form Scroll Area */}
              <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-5">
                {error && (
                  <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200">
                    {error}
                  </div>
                )}

                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      required
                      value={form.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="e.g. John"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Middle Name</label>
                    <input
                      value={form.middleName}
                      onChange={(e) => updateField('middleName', e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                    <input
                      required
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="e.g. Santos"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Contact & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="you@email.com"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Primary Mobile / Contact *</label>
                    <input
                      required
                      value={form.contact}
                      onChange={(e) => updateField('contact', e.target.value)}
                      placeholder="09123456789"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Street / Address Line */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">House No. / Street / Purok *</label>
                  <input
                    required
                    value={form.addressLine1}
                    onChange={(e) => updateField('addressLine1', e.target.value)}
                    placeholder="e.g. Purok 3, National Highway"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Province, City, Barangay */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Province *</label>
                    <select
                      value={form.province}
                      onChange={(e) => updateField('province', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value="">Select Province...</option>
                      {provinceOptions.map((opt) => (
                        <option key={opt.code} value={opt.name}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City / Municipality *</label>
                    <select
                      value={form.city}
                      disabled={!form.province}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                    >
                      <option value="">Select City/Municipality...</option>
                      {cityOptions.map((opt) => (
                        <option key={opt.code} value={opt.name}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Barangay *</label>
                    <select
                      value={form.barangay}
                      disabled={!form.city}
                      onChange={(e) => updateField('barangay', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                    >
                      <option value="">Select Barangay...</option>
                      {barangayOptions.map((opt) => (
                        <option key={opt.code} value={opt.name}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ZIP Code */}
                <div className="w-full sm:w-1/3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ZIP Code</label>
                  <input
                    value={form.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    placeholder="e.g. 8503"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95 cursor-pointer disabled:opacity-75"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
