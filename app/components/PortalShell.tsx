'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  Ticket,
  User,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { Spinner } from '@/app/components/Spinner';
import { setTheme, useTheme } from '@/app/lib/theme';

type Role = 'admin' | 'technician' | 'subscriber';
type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
};

export function PortalShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { data: session } = useSession();
  const path = usePathname();
  const isFixedMobilePage =
    role !== 'admin' &&
    [
      '/subscriber/profile',
      '/technician/profile',
      '/subscriber/plan-details',
      '/subscriber/my-transactions',
      '/subscriber/pay-bills',
      '/subscriber/notifications',
      '/technician/notifications',
      '/technician/tasks',
    ].includes(path);

  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationError, setNotificationError] = useState('');
  const [isMarkingNotificationsRead, setIsMarkingNotificationsRead] = useState(false);
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const topProfileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAvatar = () => {
      if (role === 'subscriber') {
        fetch('/api/account')
          .then((res) => res.json())
          .then((result) => {
            if (result.data?.image) {
              setLiveAvatar(result.data.image);
            } else {
              setLiveAvatar(null);
            }
          })
          .catch(() => undefined);
      }
    };

    fetchAvatar();
    window.addEventListener('avatar-updated', fetchAvatar);
    return () => window.removeEventListener('avatar-updated', fetchAvatar);
  }, [role, path]);

  // Check for active maintenance advisory for subscribers
  const [subscriberMaintenance, setSubscriberMaintenance] = useState<{
    maintenanceMode: boolean;
    maintenanceTitle?: string;
    maintenanceImpact?: string;
    maintenanceMessage?: string;
  } | null>(null);

  useEffect(() => {
    if (role === 'subscriber') {
      fetch('/api/maintenance')
        .then((res) => res.json())
        .then((result) => {
          if (result?.data?.maintenanceMode) {
            setSubscriberMaintenance(result.data);
          } else {
            setSubscriberMaintenance(null);
          }
        })
        .catch(() => undefined);
    }
  }, [role, path]);

  // Manage Users submenu toggle (auto-open if path matches a sub-item)
  const isUserSectionActive =
    path.startsWith('/admin/subscribers') ||
    path.startsWith('/admin/technicians') ||
    path.startsWith('/admin/tickets');
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(true);

  const { isDark: isDarkMode } = useTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('admin-dark-mode', role === 'admin' && isDarkMode);
    return () => {
      if (role === 'admin') document.documentElement.classList.remove('admin-dark-mode');
    };
  }, [isDarkMode, role]);

  // Destination when clicking company logo (never sends to landing page)
  const homeLink =
    role === 'admin'
      ? '/admin/dashboard'
      : role === 'technician'
        ? '/technician/my-tasks'
        : '/subscriber/my-account';

  function requestSignOut() {
    setIsProfileOpen(false);
    setShowLogoutConfirm(true);
  }

  async function confirmSignOut() {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  }

  // Close logout confirmation on Escape key
  useEffect(() => {
    if (!showLogoutConfirm) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isLoggingOut) setShowLogoutConfirm(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutConfirm, isLoggingOut]);

  async function loadNotifications() {
    setNotificationError('');
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load notifications.');
      const result = await response.json();
      if (!Array.isArray(result.data)) throw new Error('Unable to load notifications.');
      setNotifications(result.data);
    } catch {
      setNotificationError('Notifications could not be loaded. Please try again.');
    }
  }

  useEffect(() => {
    if (role === 'admin') {
      void loadNotifications();
      const interval = setInterval(() => {
        void loadNotifications();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [role]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    function closeNotifications(event: MouseEvent) {
      if (!notificationContainerRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', closeNotifications);
    return () => document.removeEventListener('mousedown', closeNotifications);
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isProfileOpen) return;
    function closeTopProfile(event: MouseEvent) {
      if (!topProfileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', closeTopProfile);
    return () => document.removeEventListener('mousedown', closeTopProfile);
  }, [isProfileOpen]);

  function toggleNotifications() {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);
    if (nextOpen) void loadNotifications();
  }

  async function markNotificationRead(item: NotificationItem) {
    if (item.read) return;
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === item.id ? { ...notification, read: true } : notification
      )
    );
    try {
      const response = await fetch(`/api/notifications/${item.id}/read`, { method: 'PUT' });
      if (!response.ok) throw new Error('Unable to mark notification as read.');
    } catch {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, read: false } : notification
        )
      );
      setNotificationError('The notification could not be marked as read.');
    }
  }

  async function markAllNotificationsRead() {
    setIsMarkingNotificationsRead(true);
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
      if (!response.ok) throw new Error('Unable to mark notifications as read.');
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    } catch {
      setNotificationError('Notifications could not be marked as read.');
    } finally {
      setIsMarkingNotificationsRead(false);
    }
  }

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

  type NonAdminLink = [string, string, typeof LayoutDashboard];

  // Technician / Subscriber nav links
  const nonAdminLinks: NonAdminLink[] =
    role === 'technician'
      ? [
        ['/technician/my-tasks', 'Home', LayoutDashboard],
        ['/technician/tasks', 'My Tasks', Ticket],
        ['/technician/profile', 'Profile', Users],
      ]
      : [
        ['/subscriber/my-account', 'Home', LayoutDashboard],
        ['/subscriber/pay-bills', 'Pay Bills', CreditCard],
        ['/subscriber/my-tickets', 'My Requests', Ticket],
        ['/subscriber/help', 'Help', MessageSquare],
      ];

  const userInitials = (session?.user?.name || '')
    .trim()
    .split(/\s+/)
    .filter((part: string) => Boolean(part))
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || (role === 'admin' ? 'AD' : role === 'technician' ? 'TC' : 'SB');

  return (
    <div
      className={`portal-shell ${role !== 'admin' ? 'portal-scrollbar-hidden' : ''} ${role === 'admin' && isDarkMode ? 'admin-dark-mode' : ''
        } min-h-screen overflow-x-hidden text-slate-950 ${role === 'admin' ? 'bg-[#f8fafc]' : 'bg-[#eef4fb]'
        }`}
    >
      {isOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/30 opacity-100 transition-opacity duration-200 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* -------------------- SIDEBAR -------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[#2d3b56] bg-[#17233b] transition-transform duration-250 ease-out ${isOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'
          }`}
      >
        {/* Top Logo (Links to Dashboard, NOT landing page) */}
        <div className="flex items-center justify-between border-b border-[#2d3b56] px-5 py-5">
          <Link
            href={homeLink}
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            title="Go to Dashboard"
          >
            {/* Official Sky-Tech Fiber Logo from /images/Skytech.jpg */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-sky-400 bg-[#071329] shadow-xs transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
              <img
                src="/images/Skytech.jpg"
                alt="Sky-Tech Fiber"
                className="h-full w-full rounded-full object-cover scale-110"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-100 leading-tight">
                Sky-Tech Fiber
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-tight leading-tight mt-0.5">
                Fast. Stable. Connected.
              </span>
            </div>
          </Link>

          <button
            aria-label="Close navigation"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#111c31] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {role === 'admin' ? (
            <nav className="space-y-1">
              {/* 1. Dashboard (Single item with active left bar) */}
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${path === '/admin/dashboard'
                    ? 'bg-blue-50/90 font-bold text-[#2563eb] shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`}
              >
                {path === '/admin/dashboard' && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 rounded-r-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                )}
                <LayoutGrid
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${path === '/admin/dashboard' ? 'text-[#2563eb]' : 'text-slate-500'
                    }`}
                />
                <span>Dashboard</span>
              </Link>

              {/* 2. Manage Users (Expandable section) */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsManageUsersOpen(!isManageUsersOpen)}
                  className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${isUserSectionActive
                      ? 'text-[#2563eb] font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Users
                      size={19}
                      className={`transition-transform duration-200 group-hover:scale-110 ${isUserSectionActive ? 'text-[#2563eb]' : 'text-slate-500'
                        }`}
                    />
                    <span>Manage Users</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${isManageUsersOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                  />
                </button>

                {/* Sub-items with bullet points */}
                <div
                  className={`ml-5 space-y-1 border-l-2 border-slate-100 pl-3 transition-all duration-200 overflow-hidden ${isManageUsersOpen ? 'max-h-48 my-1 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                >
                  <Link
                    href="/admin/subscribers"
                    onClick={() => setIsOpen(false)}
                    className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150 hover:translate-x-1 ${path.startsWith('/admin/subscribers')
                        ? 'bg-blue-50/80 font-bold text-[#2563eb]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-transform duration-150 group-hover:scale-150 ${path.startsWith('/admin/subscribers') ? 'bg-[#2563eb]' : 'bg-slate-400'
                        }`}
                    />
                    <span>Subscribers</span>
                  </Link>

                  <Link
                    href="/admin/technicians"
                    onClick={() => setIsOpen(false)}
                    className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150 hover:translate-x-1 ${path.startsWith('/admin/technicians')
                        ? 'bg-blue-50/80 font-bold text-[#2563eb]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-transform duration-150 group-hover:scale-150 ${path.startsWith('/admin/technicians') ? 'bg-[#2563eb]' : 'bg-slate-400'
                        }`}
                    />
                    <span>Technicians</span>
                  </Link>

                  <Link
                    href="/admin/tickets"
                    onClick={() => setIsOpen(false)}
                    className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150 hover:translate-x-1 ${path.startsWith('/admin/tickets')
                        ? 'bg-blue-50/80 font-bold text-[#2563eb]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-transform duration-150 group-hover:scale-150 ${path.startsWith('/admin/tickets') ? 'bg-[#2563eb]' : 'bg-slate-400'
                        }`}
                    />
                    <span>Support</span>
                  </Link>
                </div>
              </div>

              {/* 3. Billing (Direct link, no dropdown) */}
              <Link
                href="/admin/billing"
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${path.startsWith('/admin/billing')
                    ? 'bg-blue-50/90 font-bold text-[#2563eb] shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`}
              >
                {path.startsWith('/admin/billing') && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 rounded-r-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                )}
                <FileText
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${path.startsWith('/admin/billing') ? 'text-[#2563eb]' : 'text-slate-500'
                    }`}
                />
                <span>Billing</span>
              </Link>

              {/* 4. Bookings (Direct link, no dropdown) */}
              <Link
                href="/admin/bookings"
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${path.startsWith('/admin/bookings')
                    ? 'bg-blue-50/90 font-bold text-[#2563eb] shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`}
              >
                {path.startsWith('/admin/bookings') && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 rounded-r-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                )}
                <CalendarDays
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${path.startsWith('/admin/bookings') ? 'text-[#2563eb]' : 'text-slate-500'
                    }`}
                />
                <span>Bookings</span>
              </Link>

              {/* 5. Installations (Direct link, no dropdown) */}
              <Link
                href="/admin/installations"
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${path.startsWith('/admin/installations')
                    ? 'bg-blue-50/90 font-bold text-[#2563eb] shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`}
              >
                {path.startsWith('/admin/installations') && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 rounded-r-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                )}
                <Wrench
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${path.startsWith('/admin/installations') ? 'text-[#2563eb]' : 'text-slate-500'
                    }`}
                />
                <span>Installations</span>
              </Link>

              {/* 6. Reports (Direct link, no dropdown) */}
              <Link
                href="/admin/reports"
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${path.startsWith('/admin/reports')
                    ? 'bg-blue-50/90 font-bold text-[#2563eb] shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`}
              >
                {path.startsWith('/admin/reports') && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 rounded-r-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                )}
                <BarChart3
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${path.startsWith('/admin/reports') ? 'text-[#2563eb]' : 'text-slate-500'
                    }`}
                />
                <span>Reports</span>
              </Link>

              {/* 7. Maintenance (Direct link, with alert icon) */}
              <Link
                href="/admin/maintenance"
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ${path.startsWith('/admin/maintenance')
                    ? 'bg-blue-50/90 font-bold text-[#2563eb] shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                  }`}
              >
                {path.startsWith('/admin/maintenance') && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1.5 rounded-r-full bg-[#2563eb] shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                )}
                <AlertTriangle
                  size={19}
                  className={`transition-transform duration-200 group-hover:scale-110 ${path.startsWith('/admin/maintenance') ? 'text-[#2563eb]' : 'text-slate-500'
                    }`}
                />
                <span>Maintenance</span>
              </Link>
            </nav>
          ) : (
            <nav className="space-y-1">
              {nonAdminLinks.map(([href, label, IconComponent]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-xl border-l-2 px-3 py-3 text-sm font-semibold transition-all duration-150 ${path === href
                      ? 'border-[#2563eb] bg-blue-50 text-[#2166f3]'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                >
                  <IconComponent size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>

      </aside>

      {/* -------------------- TOP NAVBAR HEADER -------------------- */}
      <header
        className="fixed right-0 top-0 left-0 lg:left-64 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-8 backdrop-blur-md transition-all"
      >
        {/* Left Section: Mobile Menu Toggle & Portal Branding */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="lg:hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {role === 'admin'
                ? 'Sky-Tech Admin Console'
                : role === 'technician'
                  ? 'Field Technician Portal'
                  : 'Sky-Tech Fiber Subscriber Portal'}
            </span>
          </div>
        </div>

        {/* Right Section: Actions & Profile Icon Dropdown */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Admin Notifications Popover */}
          {role === 'admin' && (
            <div ref={notificationContainerRef} className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                onClick={toggleNotifications}
                className="relative rounded-xl p-2.5 text-slate-500 transition-all duration-150 hover:bg-slate-100 active:scale-95 group cursor-pointer"
              >
                <Bell size={20} className="transition-transform group-hover:rotate-12 text-slate-600" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white shadow-md shadow-rose-500/30">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="notification-popover absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]">
                  <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-800">Notifications</h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {unreadNotificationCount} unread notifications
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-[#2166f3]">
                      {unreadNotificationCount} new
                    </span>
                  </div>

                  <div className="notification-scroll max-h-45 overflow-y-scroll">
                    {notificationError && (
                      <p className="px-4 py-3 text-xs text-red-500">{notificationError}</p>
                    )}
                    {!notificationError && notifications.length === 0 && (
                      <p className="px-4 py-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </p>
                    )}
                    {notifications.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => void markNotificationRead(item)}
                        className={`flex w-full items-start gap-2.5 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer ${!item.read ? 'bg-[#f7faff]' : 'bg-white'
                          }`}
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-[#2166f3]">
                          <Bell size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-slate-800">
                              {item.title}
                            </span>
                            {!item.read && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-[#2f68e6]"
                                aria-label="Unread"
                              />
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {item.body}
                          </span>
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {new Date(item.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </span>
                        {item.read && <Check size={14} className="mt-1 shrink-0 text-slate-400" />}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <Link
                      href="/admin/notifications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#2166f3] cursor-pointer"
                    >
                      <List size={14} />
                      See all
                    </Link>
                    <button
                      type="button"
                      disabled={isMarkingNotificationsRead || unreadNotificationCount === 0}
                      onClick={() => void markAllNotificationsRead()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2166f3] hover:text-[#2458c8] cursor-pointer disabled:opacity-50"
                    >
                      <Check size={14} />
                      {isMarkingNotificationsRead ? 'Marking...' : 'Mark all as read'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* ----------------- PROFILE ICON DROPDOWN ----------------- */}
          <div ref={topProfileRef} className="relative">
            <button
              type="button"
              aria-label="Open profile account menu"
              aria-expanded={isProfileOpen}
              onClick={() => setIsProfileOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-2xl p-1.5 pr-2.5 hover:bg-slate-100/90 transition-all duration-200 cursor-pointer group active:scale-[0.98]"
            >
              {/* Profile Avatar Icon with Online Status */}
              <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-[#1b43b4] to-[#0284c7] text-xs font-black text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200 overflow-hidden">
                {liveAvatar || session?.user?.image ? (
                  <img
                    src={liveAvatar || session?.user?.image || ''}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitials
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 z-10" />
              </div>

              {/* User Name & Status (Desktop) */}
              <div className="hidden md:block text-left">
                <p className="truncate text-xs font-bold text-slate-800 leading-tight max-w-[130px]">
                  {session?.user?.name || (role === 'admin' ? 'Admin' : 'Subscriber')}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {role === 'admin'
                    ? 'Administrator'
                    : role === 'technician'
                      ? 'Technician'
                      : 'Fiber Active'}
                </p>
              </div>

              {/* Chevron Down Arrow */}
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${isProfileOpen ? 'rotate-180 text-[#2563eb]' : ''
                  }`}
              />
            </button>

            {/* Dropdown Menu Modal */}
            {isProfileOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.14)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                {/* User Header Summary */}
                <div className="flex items-center gap-3 p-3 border-b border-slate-100 bg-slate-50/70 rounded-xl mb-1">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-[#1b43b4] to-[#0284c7] text-sm font-black text-white shrink-0 shadow-sm overflow-hidden">
                    {liveAvatar || session?.user?.image ? (
                      <img
                        src={liveAvatar || session?.user?.image || ''}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900 leading-tight">
                      {session?.user?.name || (role === 'admin' ? 'Administrator' : 'Valued Subscriber')}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {session?.user?.email || (role === 'admin' ? 'admin@skytech.net' : 'subscriber@skytech.net')}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {role === 'admin' ? 'System Administrator' : 'Fiber Active'}
                    </span>
                  </div>
                </div>

                {/* Role Specific Navigation Links */}
                {role === 'admin' ? (
                  <div className="space-y-0.5 py-1">
                    <Link
                      href="/admin/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      <Settings size={15} className="text-slate-400" />
                      <span>Settings & Configurations</span>
                    </Link>
                  </div>
                ) : role === 'technician' ? (
                  <div className="space-y-0.5 py-1">
                    <Link
                      href="/technician/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      <User size={15} className="text-blue-600" />
                      <span>Technician Profile</span>
                    </Link>
                    <Link
                      href="/technician/tasks"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      <Ticket size={15} className="text-purple-600" />
                      <span>My Assigned Tasks</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-0.5 py-1">
                    <Link
                      href="/subscriber/profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                    >
                      <User size={15} className="text-blue-600" />
                      <span>Profile & Settings</span>
                    </Link>
                  </div>
                )}

                {/* Theme Switcher in Profile Menu */}
                <div className="py-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setTheme(!isDarkMode)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDarkMode ? (
                        <Sun size={15} className="text-amber-400 shrink-0" />
                      ) : (
                        <Moon size={15} className="text-indigo-600 shrink-0" />
                      )}
                      <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${isDarkMode ? 'bg-amber-400/20 text-amber-300' : 'bg-blue-50 text-blue-700'
                        }`}
                    >
                      {isDarkMode ? 'Dark' : 'Light'}
                    </span>
                  </button>
                </div>

                <hr className="my-1 border-slate-100" />

                {/* Log Out Button */}
                <button
                  type="button"
                  onClick={requestSignOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut size={15} className="text-rose-500" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Bar for Subscriber/Technician */}
      {role !== 'admin' && (
        <nav
          className={`fixed inset-x-0 bottom-0 z-50 grid h-16 border-t border-slate-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] lg:hidden ${role === 'subscriber' ? 'grid-cols-4' : 'grid-cols-3'
            }`}
        >
          {nonAdminLinks.map(([href, label, IconComponent]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 border-t-2 text-[10px] font-semibold transition-colors duration-150 ${path === href
                  ? 'border-[#2166f3] text-[#2166f3]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
            >
              <IconComponent size={17} />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* Main Content Area */}
      <main
        className={`${
          role === 'admin'
            ? 'min-h-screen lg:ml-64 min-w-0 pt-16'
            : `min-h-screen pb-20 lg:pb-0 lg:ml-64 pt-16 ${isFixedMobilePage ? 'max-lg:h-[100svh] max-lg:overflow-hidden max-lg:pb-0' : ''}`
        }`}
      >
        {/* Subscriber Active Maintenance Banner */}
        {role === 'subscriber' && subscriberMaintenance?.maintenanceMode && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-3 shadow-md sticky top-16 z-30">
            <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="shrink-0 animate-pulse text-amber-100" />
                <div>
                  <span className="font-extrabold uppercase tracking-wide">
                    ⚠️ Network Advisory ({(subscriberMaintenance.maintenanceImpact || 'Slow Internet').replace(/_/g, ' ')}):
                  </span>{' '}
                  <span className="font-bold text-amber-50">{subscriberMaintenance.maintenanceTitle}.</span>{' '}
                  <span className="hidden sm:inline text-amber-100">{subscriberMaintenance.maintenanceMessage}</span>
                </div>
              </div>
              <div className="shrink-0 text-[11px] font-mono bg-black/20 px-2.5 py-1 rounded-lg">
                Sibagat Dispatch: (085) 815-2026
              </div>
            </div>
          </div>
        )}

        <div
          className={`mx-auto w-full max-w-7xl ${
            role === 'technician' || role === 'subscriber'
              ? `px-0 lg:pb-0 ${isFixedMobilePage ? 'max-lg:h-full' : ''}`
              : 'px-4 py-5 sm:px-6 lg:px-8 lg:py-7'
          }`}
        >
          {children}
        </div>
      </main>
      {/* -------------------- LOGOUT CONFIRMATION MODAL -------------------- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Warning / Logout Icon */}
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 mb-4 shadow-sm shadow-rose-500/10">
              <LogOut size={26} className="translate-x-0.5" />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Confirm Logout
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Are you sure you want to log out of your session? You will need to enter your credentials again to access your account.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={confirmSignOut}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-rose-500/20 hover:bg-rose-700 active:scale-95 transition disabled:opacity-75"
              >
                {isLoggingOut && <Spinner />}
                {isLoggingOut ? 'Logging out...' : 'Yes, Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
