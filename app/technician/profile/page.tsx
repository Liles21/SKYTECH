'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';

type Technician = {
  id: string;
  name: string;
  email: string;
  contact?: string | null;
  status: string;
};
type ProfileForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  contact: string;
};

function getForm(technician: Technician): ProfileForm {
  const parts = technician.name.trim().split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.pop() || '';
  return {
    firstName,
    middleName: parts.join(' '),
    lastName,
    email: technician.email,
    contact: technician.contact || '',
  };
}

export default function TechnicianProfilePage() {
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetch('/api/technician/account')
      .then((response) => response.json())
      .then((result) => {
        if (result.data) {
          setTechnician(result.data);
          setForm(getForm(result.data));
        } else {
          setError(result.error || 'Unable to load profile details.');
        }
      })
      .catch(() => setError('Unable to load profile details.'));
  }, []);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!technician || !form) return;
    setIsSaving(true);
    setError('');
    const name = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
    const response = await fetch('/api/technician/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: form.email, contact: form.contact }),
    });
    const result = await response.json();
    if (!response.ok || !result.data) {
      setError(result.error || 'Unable to save profile details.');
      setIsSaving(false);
      return;
    }
    setTechnician(result.data);
    setForm(getForm(result.data));
    setIsEditing(false);
    setIsSaving(false);
    setSuccessMessage('Profile details updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3500);
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: '/login' });
  }

  if (!technician || !form) {
    return (
      <PortalShell role="technician">
        <div className="p-8 text-sm text-slate-500">{error || 'Loading profile...'}</div>
      </PortalShell>
    );
  }

  const displayName = formatPersonName(technician.name);
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const inputClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#2161e8]';

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.newPassword !== values.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    const response = await fetch('/api/account/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Unable to change password.');
      return;
    }
    setIsChangingPassword(false);
    setSuccessMessage('Password updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3500);
  }

  if (isEditing) {
    return (
      <PortalShell role="technician">
        <div className="bg-[#f8fafc] pb-12 text-slate-900">
          <header className="bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] px-4 py-6 text-white shadow-md sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-3xl items-center gap-3.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Back to profile"
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200">
                  PROFILE
                </span>
                <h1 className="text-xl font-black sm:text-2xl">Profile details</h1>
              </div>
            </div>
          </header>

          <form
            onSubmit={saveProfile}
            className="mx-auto max-w-3xl px-4 pt-6 sm:px-8 lg:px-10"
          >
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#2161e8] text-xl font-black text-white shadow-md shadow-blue-500/20">
                  {initials}
                </span>
                <div>
                  <p className="text-xl font-extrabold text-slate-900">{displayName}</p>
                  <p className="text-sm font-bold text-[#2161e8]">ID #{technician.id}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Update your technician profile details anytime.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">
                  Email address
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">
                  Primary contact number
                  <input
                    required
                    value={form.contact}
                    onChange={(event) => updateField('contact', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  First name
                  <input
                    required
                    value={form.firstName}
                    onChange={(event) => updateField('firstName', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Middle name
                  <input
                    value={form.middleName}
                    onChange={(event) => updateField('middleName', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 sm:col-span-2">
                  Last name
                  <input
                    required
                    value={form.lastName}
                    onChange={(event) => updateField('lastName', event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>

              {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}

              <div className="mt-7 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-[#2161e8] px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </PortalShell>
    );
  }

  if (isChangingPassword) {
    return (
      <PortalShell role="technician">
        <div className="bg-[#f8fafc] pb-12 text-slate-900">
          <header className="bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] px-4 py-6 text-white shadow-md sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-3xl items-center gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(false);
                  setError('');
                }}
                aria-label="Back to profile"
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200">
                  PROFILE
                </span>
                <h1 className="text-xl font-black sm:text-2xl">Change password</h1>
              </div>
            </div>
          </header>

          <form
            onSubmit={changePassword}
            className="mx-auto max-w-3xl px-4 pt-6 sm:px-8 lg:px-10"
          >
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2161e8]">
                  <LockKeyhole size={26} />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">Account Security</h2>
                  <p className="text-xs text-slate-500">
                    Create a strong password with at least 8 characters to keep your account secure.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                {[
                  ['currentPassword', 'Current password', 'Enter current password'],
                  ['newPassword', 'New password', 'Enter new password'],
                  ['confirmPassword', 'Confirm new password', 'Enter confirm new password'],
                ].map(([name, label, placeholder]) => (
                  <label
                    key={name}
                    className="text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    {label}
                    <div className="relative">
                      <input
                        required
                        minLength={name === 'currentPassword' ? undefined : 8}
                        type="password"
                        name={name}
                        placeholder={placeholder}
                        className={`${inputClass} pr-10`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-5 text-slate-400">
                        {name === 'currentPassword' ? <Eye size={18} /> : <EyeOff size={18} />}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}

              <div className="mt-7 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setError('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2161e8] px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                >
                  Change password
                </button>
              </div>
            </div>
          </form>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell role="technician">
      <div className="bg-[#f8fafc] pb-12 text-slate-900">
        {/* Top Profile Hero Banner */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] px-4 py-8 text-white shadow-lg sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_50%)] pointer-events-none" />
          <div className="relative mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-white/15 border border-white/25 text-2xl font-black text-white shadow-lg backdrop-blur-sm">
                {initials}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-100">
                    ID #{technician.id}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                    <ShieldCheck size={12} />
                    {technician.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-blue-100/90">
                  Sky-Tech Field Operations Technician
                </p>
              </div>
            </div>

            <Link
              href="/technician/my-tasks"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition-all backdrop-blur-sm"
            >
              <Wrench size={15} />
              <span>Dispatch Dashboard</span>
            </Link>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-8 lg:px-10 space-y-6">
          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Account Summary Details Card */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Technician Contact & Credentials
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2161e8]">
                  <Mail size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Email Address
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">{technician.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2161e8]">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Contact Number
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {technician.contact || 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Actions Card */}
          <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <button
              onClick={() => setIsEditing(true)}
              className="flex w-full items-center gap-4 border-b border-slate-100 px-6 py-5 text-left text-base font-bold text-slate-800 transition-colors hover:bg-slate-50"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2161e8]">
                <UserRound size={20} />
              </span>
              <div className="flex-1">
                <span className="block text-sm sm:text-base font-extrabold text-slate-900">
                  Profile details
                </span>
                <span className="block text-xs font-normal text-slate-400">
                  Update your name, email address, and primary mobile number
                </span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>

            <button
              onClick={() => {
                setError('');
                setIsChangingPassword(true);
              }}
              className="flex w-full items-center gap-4 px-6 py-5 text-left text-base font-bold text-slate-800 transition-colors hover:bg-slate-50"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2161e8]">
                <LockKeyhole size={20} />
              </span>
              <div className="flex-1">
                <span className="block text-sm sm:text-base font-extrabold text-slate-900">
                  Change password
                </span>
                <span className="block text-xs font-normal text-slate-400">
                  Update your technician portal login password
                </span>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </section>

          <div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-4 text-sm sm:text-base font-bold text-red-600 transition-colors hover:bg-red-100"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
