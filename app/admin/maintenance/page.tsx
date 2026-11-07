'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Power,
  Send,
  Settings,
  ShieldAlert,
  Users,
  Wifi,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

type MaintenanceLogItem = {
  id: string;
  type: string;
  impact: string;
  title: string;
  message: string;
  startTime: string | null;
  endTime: string | null;
  recipients: number;
  sentBy: string | null;
  createdAt: string;
};

type MaintenanceSettings = {
  maintenanceMode: boolean;
  maintenanceType: string;
  maintenanceImpact: string;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceStartTime: string | null;
  maintenanceEndTime: string | null;
  smtpUser?: string;
  smtpPass?: string;
  smtpHost?: string;
  smtpPort?: number;
};

// Preset maintenance types with auto-fill templates
const MAINTENANCE_PRESETS: Record<
  string,
  { defaultImpact: string; defaultTitle: string; defaultMessage: string }
> = {
  'Slow Internet Advisory': {
    defaultImpact: 'Slow_Internet',
    defaultTitle: 'Network Advisory: Temporary Slow Internet & High Latency',
    defaultMessage:
      'Please be advised that we are experiencing upstream backbone bandwidth optimization and node calibration in the Sibagat area. Subscribers may experience slower internet speeds, video buffering, or elevated ping latency while technicians calibrate the fiber distribution hubs. Our team is actively working to restore full symmetrical speeds as swiftly as possible.',
  },
  'Emergency Fiber Cable Repair': {
    defaultImpact: 'Internet_Disabled',
    defaultTitle: 'Emergency Advisory: Optical Fiber Cable Repair & Splicing',
    defaultMessage:
      'Our optical engineering field crew is performing urgent emergency fiber optic cable repairs and core fusion splicing due to physical line damage. Internet service is temporarily suspended / disabled for affected clusters during active splicing. Full gigabit fiber connectivity will be automatically restored upon splice completion.',
  },
  'Scheduled Network Maintenance': {
    defaultImpact: 'Slow_Internet',
    defaultTitle: 'Notice: Scheduled Fiber Optical Network Maintenance',
    defaultMessage:
      'Sky-Tech Fiber will be conducting scheduled preventive maintenance and optical node upgrades to improve overall network reliability and speed capacity across Sibagat and surrounding areas. Internet connectivity may fluctuate or experience temporary speed slowdowns during this maintenance window.',
  },
  'Total Internet Outage / Line Shutdown': {
    defaultImpact: 'Internet_Disabled',
    defaultTitle: 'Urgent Notice: Temporary Total Internet Connection Outage',
    defaultMessage:
      'Please be informed that a complete line shutdown is required to replace main distribution terminal hardware and core feeder fiber lines. All subscriber internet connections are temporarily disabled during this operation. Please keep your fiber modem / ONT powered on; your connection will reconnect immediately once field works are finalized.',
  },
  'Power Substation Maintenance': {
    defaultImpact: 'Slow_Internet',
    defaultTitle: 'Advisory: Power Substation Maintenance Affecting Optical Nodes',
    defaultMessage:
      'Due to scheduled electrical power utility maintenance affecting optical distribution nodes and relay antennas, backup battery systems are operating. Some subscribers may experience intermittent connections or reduced bandwidth until primary grid power is fully normalized.',
  },
  'Custom Maintenance Announcement': {
    defaultImpact: 'Slow_Internet',
    defaultTitle: 'Sky-Tech Fiber Network Maintenance Announcement',
    defaultMessage:
      'We are conducting system maintenance to enhance our pure fiber network performance. We appreciate your patience and cooperation as we work to deliver the best internet experience in Sibagat.',
  },
};

export default function AdminMaintenancePage() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState('Slow Internet Advisory');
  const [maintenanceImpact, setMaintenanceImpact] = useState('Slow_Internet');
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [broadcastEmail, setBroadcastEmail] = useState(true);

  // Stats & Logs
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<MaintenanceLogItem[]>([]);

  // SMTP Settings Drawer
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);

  // Load maintenance data
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/maintenance');
      const result = await res.json();

      if (res.ok && result.data) {
        const s: MaintenanceSettings = result.data.settings;
        setMaintenanceMode(Boolean(s.maintenanceMode));
        setMaintenanceType(s.maintenanceType || 'Slow Internet Advisory');
        setMaintenanceImpact(s.maintenanceImpact || 'Slow_Internet');
        setMaintenanceTitle(s.maintenanceTitle || MAINTENANCE_PRESETS['Slow Internet Advisory'].defaultTitle);
        setMaintenanceMessage(s.maintenanceMessage || MAINTENANCE_PRESETS['Slow Internet Advisory'].defaultMessage);

        if (s.maintenanceStartTime) {
          try {
            setStartTime(new Date(s.maintenanceStartTime).toISOString().slice(0, 16));
          } catch {
            setStartTime('');
          }
        }
        if (s.maintenanceEndTime) {
          try {
            setEndTime(new Date(s.maintenanceEndTime).toISOString().slice(0, 16));
          } catch {
            setEndTime('');
          }
        }

        setSmtpUser(s.smtpUser || '');
        setSmtpPass(s.smtpPass || '');
        setSmtpHost(s.smtpHost || '');
        setSmtpPort(s.smtpPort || 587);

        setSubscriberCount(result.data.subscriberCount || 0);
        setRecentLogs(result.data.recentLogs || []);
      } else {
        setErrorMessage(result.error || 'Unable to load maintenance settings.');
      }
    } catch {
      setErrorMessage('Network error while loading maintenance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When type changes, auto-fill template if title/message match previous default or is empty
  const handleTypeChange = (newType: string) => {
    setMaintenanceType(newType);
    const preset = MAINTENANCE_PRESETS[newType];
    if (preset) {
      setMaintenanceImpact(preset.defaultImpact);
      setMaintenanceTitle(preset.defaultTitle);
      setMaintenanceMessage(preset.defaultMessage);
    }
  };

  // Save changes & optionally broadcast
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceMode,
          maintenanceType,
          maintenanceImpact,
          maintenanceTitle,
          maintenanceMessage,
          maintenanceStartTime: startTime ? new Date(startTime).toISOString() : null,
          maintenanceEndTime: endTime ? new Date(endTime).toISOString() : null,
          broadcastEmail,
          smtpUser,
          smtpPass,
          smtpHost,
          smtpPort,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.data) {
        setErrorMessage(result.error || 'Failed to update maintenance settings.');
      } else {
        const bResult = result.data.broadcastResult;
        if (bResult) {
          setSuccessMessage(
            `Maintenance settings saved and broadcast sent! Delivered to ${bResult.successfulEmails} of ${bResult.totalRecipients} subscriber email accounts.`
          );
        } else {
          setSuccessMessage('Maintenance mode and settings updated successfully.');
        }
        await loadData();
      }
    } catch {
      setErrorMessage('Network connection error while saving maintenance settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant broadcast trigger without changing mode
  const handleBroadcastOnly = async () => {
    if (!confirm(`Are you sure you want to send this announcement email to all ${subscriberCount} subscribers?`)) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: maintenanceType,
          impact: maintenanceImpact,
          title: maintenanceTitle,
          message: maintenanceMessage,
          startTime: startTime ? new Date(startTime).toISOString() : null,
          endTime: endTime ? new Date(endTime).toISOString() : null,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.data) {
        setErrorMessage(result.error || 'Failed to dispatch broadcast announcement.');
      } else {
        setSuccessMessage(
          `Announcement broadcasted successfully! ${result.data.successfulEmails} emails delivered to subscribers' Gmail accounts.`
        );
        await loadData();
      }
    } catch {
      setErrorMessage('Network error during broadcast dispatch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInternetDisabled =
    maintenanceImpact === 'Internet_Disabled' || maintenanceType.toLowerCase().includes('outage');

  return (
    <PortalShell role="admin">
      <div className="bg-[#f8fafc] pb-12 text-slate-900">
        {/* Top Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#111827] text-white shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.12),transparent_60%)] pointer-events-none" />
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-400 shadow-md">
                  <ShieldAlert size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                      Maintenance & Broadcasts
                    </h1>
                    {maintenanceMode ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-400/40 px-3 py-1 text-xs font-black text-rose-300 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        MAINTENANCE MODE ON
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        Normal Operations
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300">
                    Publish network advisories (slow internet, line repairs, outages) and email announcements to subscribers.
                  </p>
                </div>
              </div>

              {/* Subscriber Target Count Pill */}
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 px-4 py-2.5 backdrop-blur-md">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/20 text-sky-300">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Target Subscribers
                  </p>
                  <p className="text-sm font-black text-white">{subscriberCount} Active Accounts</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-8 lg:px-10">
          {/* Feedback alerts */}
          {successMessage && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-semibold text-rose-800 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-rose-600 hover:text-rose-900 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 animate-pulse">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm font-semibold">Loading maintenance controllers...</p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-12">
              {/* Left Column (8 cols): Main Form & Controls */}
              <div className="space-y-6 lg:col-span-8">
                {/* 1. MASTER MAINTENANCE MODE SWITCH CARD */}
                <div
                  className={`relative overflow-hidden rounded-3xl border p-6 sm:p-7 shadow-sm transition-all ${
                    maintenanceMode
                      ? 'border-rose-200 bg-rose-50/70 ring-2 ring-rose-300'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`grid h-12 w-12 place-items-center rounded-2xl shadow-sm ${
                          maintenanceMode
                            ? 'bg-rose-600 text-white animate-bounce'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Power size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-slate-900">
                            Subscriber Maintenance Mode
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                              maintenanceMode
                                ? 'bg-rose-200 text-rose-900'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {maintenanceMode ? 'Active / Locked' : 'Disabled / Normal'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 max-w-xl">
                          {maintenanceMode
                            ? '⚠️ System login is locked for all subscribers. Subscribers will be blocked at login and shown this active maintenance advisory.'
                            : 'All subscriber accounts have full access to login, view bills, file requests, and use internet services.'}
                        </p>
                      </div>
                    </div>

                    {/* Big Interactive Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => setMaintenanceMode(!maintenanceMode)}
                      className={`relative inline-flex h-10 w-20 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          maintenanceMode ? 'translate-x-10' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. ANNOUNCEMENT COMPOSITION FORM */}
                <form
                  onSubmit={handleSave}
                  className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6"
                >
                  <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Wrench size={19} className="text-blue-600" />
                        <span>Maintenance Announcement Details</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose maintenance preset or tailor the exact message sent to subscriber emails.
                      </p>
                    </div>
                  </div>

                  {/* Dropdowns Row: Maintenance Type & Subscriber Impact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Maintenance Type Dropdown */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Maintenance Category (Dropdown) *
                      </label>
                      <select
                        value={maintenanceType}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer font-medium"
                      >
                        {Object.keys(MAINTENANCE_PRESETS).map((presetKey) => (
                          <option key={presetKey} value={presetKey}>
                            {presetKey}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select a category to auto-fill recommended title & details.
                      </p>
                    </div>

                    {/* Subscriber Impact Dropdown */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Subscriber Impact Level (Dropdown) *
                      </label>
                      <select
                        value={maintenanceImpact}
                        onChange={(e) => setMaintenanceImpact(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer font-medium"
                      >
                        <option value="Slow_Internet">Slow Internet / High Latency Advisory</option>
                        <option value="Internet_Disabled">Internet Disabled / Total Outage</option>
                        <option value="Intermittent_Fluctuations">Intermittent Fluctuations / Core Splicing</option>
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Reflects whether internet is disabled or simply running slow.
                      </p>
                    </div>
                  </div>

                  {/* Impact Alert Preview Pill */}
                  <div
                    className={`rounded-2xl p-3.5 border flex items-center gap-3 ${
                      isInternetDisabled
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {isInternetDisabled ? (
                      <WifiOff size={20} className="text-rose-600 shrink-0" />
                    ) : (
                      <Wifi size={20} className="text-amber-600 shrink-0" />
                    )}
                    <div className="text-xs">
                      <span className="font-bold">
                        {isInternetDisabled
                          ? 'INTERNET DISABLED STATUS'
                          : 'SLOW INTERNET SPEEDS STATUS'}
                        :
                      </span>{' '}
                      <span>
                        {isInternetDisabled
                          ? "Subscribers will be alerted that internet connection is temporarily disconnected during the repair."
                          : "Subscribers will be notified that connection is online but speeds are slower than usual."}
                      </span>
                    </div>
                  </div>

                  {/* Title / Subject */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Announcement Title / Email Subject *
                    </label>
                    <input
                      required
                      value={maintenanceTitle}
                      onChange={(e) => setMaintenanceTitle(e.target.value)}
                      placeholder="e.g. Scheduled Fiber Optical Network Maintenance"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Message Details */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Announcement Description & Instructions (Sent via Email) *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="Detailed explanation of the work being performed, affected areas, and guidance for subscribers..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 leading-relaxed resize-y"
                    />
                  </div>

                  {/* Schedule Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>Maintenance Start Window</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>Estimated Completion / Restoration</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Email Broadcast Checkbox */}
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={broadcastEmail}
                        onChange={(e) => setBroadcastEmail(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-blue-950 flex items-center gap-1.5">
                          <Mail size={15} className="text-blue-600" />
                          <span>Automatically dispatch email announcement to all subscribers</span>
                        </span>
                        <p className="text-xs text-blue-800/80 mt-0.5">
                          Sends this branded HTML notice to all {subscriberCount} registered subscriber email/Gmail accounts and creates in-app notification alerts.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleBroadcastOnly}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={15} className="text-blue-600" />
                      <span>Send Email Broadcast Only</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer disabled:opacity-75"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-white" />
                          <span>Saving & Broadcasting...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Save & Apply Maintenance</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* 3. OPTIONAL SMTP / GMAIL SENDER DRAWER */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
                        <Settings size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          Mail Delivery & SMTP Configuration (Optional)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {smtpUser ? `Custom Sender: ${smtpUser}` : 'Default simulated mailer active (configure Gmail for direct live inbox delivery)'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      {showSmtpConfig ? 'Hide Settings' : 'Configure SMTP'}
                    </button>
                  </div>

                  {showSmtpConfig && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-in fade-in">
                      <p className="text-xs text-slate-500">
                        To send real emails directly to subscribers from your own Sky-Tech Google Workspace or Gmail account, enter your Gmail address and 16-character App Password (generated in Google Account Security).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Gmail / Sender Email
                          </label>
                          <input
                            value={smtpUser}
                            onChange={(e) => setSmtpUser(e.target.value)}
                            placeholder="support@skytech.net or your@gmail.com"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Gmail App Password / SMTP Password
                          </label>
                          <input
                            type="password"
                            value={smtpPass}
                            onChange={(e) => setSmtpPass(e.target.value)}
                            placeholder="16-character Google App Password"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            SMTP Server Host (Optional)
                          </label>
                          <input
                            value={smtpHost}
                            onChange={(e) => setSmtpHost(e.target.value)}
                            placeholder="smtp.gmail.com (defaults automatically)"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            SMTP Port (Default 587)
                          </label>
                          <input
                            type="number"
                            value={smtpPort}
                            onChange={(e) => setSmtpPort(Number(e.target.value))}
                            placeholder="587"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (4 cols): Live Preview & Broadcast Log */}
              <div className="space-y-6 lg:col-span-4">
                {/* Live Subscriber Announcement Preview */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Subscriber Email Preview
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                      Live Preview
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden text-xs">
                    {/* Fake Header */}
                    <div className="bg-[#173896] p-4 text-center text-white">
                      <p className="font-extrabold text-sm tracking-tight">SKY-TECH FIBER</p>
                      <p className="text-[10px] text-blue-200 mt-0.5">Official Service Advisory</p>
                    </div>

                    <div
                      className={`px-3 py-1.5 text-center font-bold text-[10px] ${
                        isInternetDisabled
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isInternetDisabled
                        ? '⚠️ INTERNET DISABLED / TOTAL OUTAGE'
                        : '⚠️ SLOW INTERNET / HIGH LATENCY'}
                    </div>

                    <div className="p-4 space-y-2.5 bg-white text-slate-800">
                      <p className="font-bold text-xs text-slate-900">
                        {maintenanceTitle || 'Maintenance Announcement Title'}
                      </p>
                      <p className="text-[11px] text-slate-600 line-clamp-4 leading-relaxed">
                        {maintenanceMessage || 'Announcement details and impact description...'}
                      </p>

                      <div className="rounded-xl bg-slate-50 p-2.5 text-[10px] space-y-1 border border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Category:</span>
                          <span className="font-bold text-slate-700">{maintenanceType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Impact:</span>
                          <span className="font-bold text-amber-700">
                            {maintenanceImpact.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Restoration:</span>
                          <span className="font-semibold text-slate-700">
                            {endTime ? new Date(endTime).toLocaleDateString() : 'As scheduled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Broadcast History Log */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Announcement Broadcast Log
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {recentLogs.length} previous
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {recentLogs.length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-400">
                        No previous maintenance broadcasts recorded yet.
                      </p>
                    ) : (
                      recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 truncate max-w-[180px]">
                              {log.title}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                log.impact.includes('Disabled') || log.impact.includes('Outage')
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {log.impact.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{log.message}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>
                              {new Date(log.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="font-bold text-blue-600">
                              {log.recipients} emails sent
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
