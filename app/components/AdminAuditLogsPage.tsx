'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  Filter,
  History,
  KeyRound,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';

export type AuditLogItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  status: string;
  createdAt: string;
};

type AuditStats = {
  total: number;
  today: number;
  security: number;
  settings: number;
};

function formatTimestamp(isoString: string) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function getRelativeTime(isoString: string) {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}

function getActionBadge(action: string) {
  const norm = action.toUpperCase();
  if (norm.includes('CREATE') || norm.includes('INIT')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (norm.includes('DELETE') || norm.includes('REMOVE')) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  }
  if (norm.includes('PASSWORD') || norm.includes('SECURITY')) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }
  if (norm.includes('LOGIN') || norm.includes('AUTH')) {
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
  }
  return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
}

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats>({ total: 0, today: 0, security: 0, settings: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('query', query.trim());
      if (entityFilter !== 'All') params.set('entity', entityFilter);
      if (actionFilter !== 'All') params.set('action', actionFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const result = await res.json();
      if (result.success && result.data) {
        setLogs(result.data.logs || []);
        if (result.data.stats) setStats(result.data.stats);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Export CSV function
  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Entity', 'Entity ID', 'User', 'Role', 'IP Address', 'Status', 'Details'];
    const rows = logs.map((log) => [
      `"${formatTimestamp(log.createdAt)}"`,
      `"${log.action}"`,
      `"${log.entity}"`,
      `"${log.entityId || ''}"`,
      `"${log.userName || ''}"`,
      `"${log.userRole || ''}"`,
      `"${log.ipAddress || ''}"`,
      `"${log.status}"`,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `skytech_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PortalShell role="admin">
      <div className="pb-12 max-w-7xl mx-auto space-y-6">
        {/* Page Top Heading & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#2563eb] transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Settings</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-[#2563eb]">Audit Logs</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track administrative operations, security events, configuration updates, and system activities.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Events</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-[#2563eb]">
                <History size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.total}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">All recorded audit logs</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Calendar size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.today}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Events in last 24 hours</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Security</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <ShieldAlert size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.security}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Logins & password resets</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Config Changes</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Settings size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.settings}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Settings & plans modified</p>
          </div>
        </div>

        {/* Filter and Table Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search audit logs..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </div>

            {/* Entity and Action Filter Selectors */}
            <div className="flex w-full sm:w-auto flex-wrap items-center gap-2.5">
              <label className="relative">
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563eb] cursor-pointer"
                >
                  <option value="All">All Entities</option>
                  <option value="Settings">Settings</option>
                  <option value="Subscriber">Subscriber</option>
                  <option value="Technician">Technician</option>
                  <option value="Installation">Installation</option>
                  <option value="Bill">Billing</option>
                  <option value="Booking">Booking</option>
                  <option value="User">User / Auth</option>
                  <option value="System">System</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400" size={14} />
              </label>

              <label className="relative">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-[#2563eb] cursor-pointer"
                >
                  <option value="All">All Actions</option>
                  <option value="SETTINGS_UPDATE">Settings Update</option>
                  <option value="LOGIN">User Login</option>
                  <option value="PASSWORD_RESET">Password Reset</option>
                  <option value="CREATE">Record Creation</option>
                  <option value="UPDATE">Record Update</option>
                  <option value="DELETE">Record Deletion</option>
                  <option value="SYSTEM_INIT">System Init</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400" size={14} />
              </label>

              <span className="ml-auto sm:ml-0 text-xs font-medium text-slate-400 pl-1">
                {logs.length} {logs.length === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          {/* Table Container (Fully Responsive Swipe with touch-pan-x) */}
          <div
            className="w-full overflow-x-auto touch-pan-x overscroll-x-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table className="min-w-[950px] w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Actor / User</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Action</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Module</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Event Details</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Inspect</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
                        <span className="text-sm font-medium">Loading audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400 mb-2">
                        <ShieldCheck size={24} />
                      </div>
                      <p className="font-semibold text-slate-700">No audit logs found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {query ? 'Try clearing your search query or filters.' : 'No audit events recorded yet.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-800 leading-tight">
                          {formatTimestamp(log.createdAt)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          {getRelativeTime(log.createdAt)}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-100 text-xs font-bold text-[#2563eb]">
                            {(log.userName || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 leading-tight">
                              {log.userName || 'Administrator'}
                            </div>
                            <div className="text-[10px] uppercase font-mono font-semibold text-slate-400">
                              {log.userRole || 'admin'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Entity / Module */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-700">{log.entity}</div>
                        {log.entityId && (
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                            #{log.entityId}
                          </div>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-xs text-slate-600 truncate max-w-xs lg:max-w-md font-medium" title={log.details}>
                          {log.details}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {log.status}
                        </span>
                      </td>

                      {/* Inspect Action */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-[#2563eb] hover:bg-blue-50 hover:text-[#2563eb] transition-all cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inspect Log Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedLog(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-[#2563eb]">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audit Event Details</h3>
                  <p className="text-[11px] font-mono text-slate-400">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Event Description</label>
                <p className="mt-1 text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedLog.details}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Action</span>
                  <span className="font-bold text-slate-800 mt-0.5 inline-block">{selectedLog.action}</span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Module / Entity</span>
                  <span className="font-bold text-slate-800 mt-0.5 inline-block">{selectedLog.entity}</span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Actor Name</span>
                  <span className="font-bold text-slate-800 mt-0.5 inline-block">{selectedLog.userName || 'Administrator'}</span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Role</span>
                  <span className="font-bold uppercase text-slate-800 mt-0.5 inline-block">{selectedLog.userRole || 'admin'}</span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-600 mt-0.5 inline-block">{selectedLog.status}</span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">IP Address</span>
                  <span className="font-mono text-slate-800 mt-0.5 inline-block">{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Timestamp</label>
                <p className="mt-1 text-xs text-slate-600 font-mono">
                  {selectedLog.createdAt} ({formatTimestamp(selectedLog.createdAt)})
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

