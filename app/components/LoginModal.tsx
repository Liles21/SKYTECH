'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  BookOpen,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Spinner } from '@/app/components/Spinner';
import { DEMO_ACCOUNTS } from '@/app/lib/demo-accounts';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBooking: () => void;
};

export function LoginModal({ isOpen, onClose, onBooking }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSigningIn(true);

    try {
      const cleanEmail = email.trim();
      const result = await signIn('credentials', {
        email: cleanEmail,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('The email or password you entered is incorrect.');
        setIsSigningIn(false);
        return;
      }

      // Check session role for accurate redirect
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;
        if (role === 'admin') {
          router.replace('/admin/dashboard');
          return;
        } else if (role === 'technician') {
          router.replace('/technician/my-tasks');
          return;
        } else if (role === 'subscriber') {
          router.replace('/subscriber/my-account');
          return;
        }
      } catch {
        // Fallback
      }

      const matchedAccount = Object.values(DEMO_ACCOUNTS).find(
        (acc) => acc.email.toLowerCase() === cleanEmail.toLowerCase()
      );
      const userRole =
        matchedAccount?.role ||
        (cleanEmail.includes('admin')
          ? 'admin'
          : cleanEmail.includes('tech')
          ? 'technician'
          : 'subscriber');

      if (userRole === 'admin') {
        router.replace('/admin/dashboard');
      } else if (userRole === 'technician') {
        router.replace('/technician/my-tasks');
      } else {
        router.replace('/subscriber/my-account');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsSigningIn(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm transition-all overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Card matching image */}
      <div className="relative z-10 w-full max-w-[420px] rounded-3xl border border-blue-100/90 bg-white p-7 sm:p-8 shadow-2xl my-auto bg-[radial-gradient(ellipse_at_top,_rgba(2,132,199,0.06),_transparent_70%)] animate-in zoom-in-95 fade-in duration-250 ease-out">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Title & Subtitle */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-sky-400 bg-[#071329] shadow-sm">
              <Image
                src="/images/Skytech.jpg"
                alt="Sky-Tech Logo"
                width={48}
                height={48}
                className="h-full w-full object-cover rounded-full scale-110"
              />
            </div>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-black text-[#0f172a] tracking-tight">
            Welcome back
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter your credentials to access your account.
          </p>
          {/* Blue accent pill line */}
          <div className="mx-auto mt-2.5 h-1 w-14 rounded-full bg-gradient-to-r from-sky-400 to-blue-600" />
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Email or Account ID */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#0f172a] mb-1.5">
              <Mail size={15} className="text-[#0f172a]" />
              <span>Email or Account ID</span>
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-sky-100">
              <Mail size={16} className="mr-2.5 shrink-0 text-slate-400" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or account ID"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                className="w-full border-0 border-none bg-transparent p-0 text-sm text-slate-900 placeholder-slate-400 outline-none ring-0 shadow-none focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:shadow-none"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#0f172a] mb-1.5">
              <Lock size={15} className="text-[#0f172a]" />
              <span>Password</span>
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-[#0284c7] focus-within:ring-2 focus-within:ring-sky-100">
              <Lock size={16} className="mr-2.5 shrink-0 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                className="w-full border-0 border-none bg-transparent p-0 text-sm text-slate-900 placeholder-slate-400 outline-none ring-0 shadow-none focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:shadow-none pr-1"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ml-1 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Checkbox & Forgot Password */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-[#0f172a]">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0284c7] focus:ring-[#0284c7] cursor-pointer"
              />
              <span>Keep me signed in for 30 days</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setRecoveryEmail(email);
                setRecoverySent(false);
                setIsRecoveryOpen(true);
              }}
              className="font-bold text-[#0284c7] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-600 border border-red-200">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSigningIn}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#0284c7] to-[#0066ff] hover:from-[#0369a1] hover:to-[#0052cc] py-3.5 text-sm font-bold text-white shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-70"
          >
            {isSigningIn ? (
              <>
                <Spinner />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In to Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400">
            New to Sky-Tech Fiber?
          </span>
        </div>

        {/* Check Coverage & Book Now Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onBooking();
          }}
          className="w-full rounded-2xl border border-sky-300 bg-sky-50/60 hover:bg-sky-100/70 py-2.5 text-xs font-bold text-[#0284c7] flex items-center justify-center gap-2 transition shadow-sm"
        >
          <BookOpen size={15} />
          <span>Check Coverage & Book Now →</span>
        </button>
      </div>

      {/* Password Recovery Dialog */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsRecoveryOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-full"
            >
              <X size={18} />
            </button>

            {recoverySent ? (
              <div className="text-center py-2">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-900">Check your inbox</h3>
                <p className="mt-1.5 text-xs text-slate-500">
                  If an account exists for <strong className="text-slate-800">{recoveryEmail}</strong>, you will receive a reset link.
                </p>
                <button
                  type="button"
                  onClick={() => setIsRecoveryOpen(false)}
                  className="mt-5 w-full rounded-xl bg-[#0284c7] py-2.5 text-xs font-bold text-white transition hover:bg-[#0369a1]"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-black text-slate-900">Reset Password</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your email to receive a recovery link.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRecoverySent(true);
                  }}
                  className="mt-4 space-y-3"
                >
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="you@skytech.net"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none focus:border-[#0284c7]"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#0284c7] py-2.5 text-xs font-bold text-white transition hover:bg-[#0369a1]"
                  >
                    Send Recovery Link
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

