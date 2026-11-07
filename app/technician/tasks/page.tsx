'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  MapPin,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { PortalShell } from '@/app/components/PortalShell';
import { formatPersonName } from '@/app/lib/name';
import { formatTicketStatus } from '@/app/lib/ticket-status';

type Task = readonly [string, string, string, string, string, string];

type InstallationApiItem = {
  id: string;
  date: string | null;
  time: string | null;
  type: string;
  status: string;
  address?: string | null;
  technician?: { name?: string | null } | null;
  subscriber?: { name?: string | null; address?: string | null } | null;
};
type Ticket = {
  id: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  visitDate?: string | null;
  visitTime?: string | null;
  details?: string | null;
  technician?: { name: string } | null;
  subscriber?: { name: string; address?: string | null };
};

const taskCategories = ['All', 'Installation', 'Repair'] as const;
const subStatusFilters = ['All', 'Confirmed', 'Rescheduled', 'Closed'] as const;
const installationStatusOptions = [
  ['Installation_Closed', 'Installation Closed'],
  ['Installation_Rescheduled', 'Installation Rescheduled'],
] as const;
const technicianTicketStatuses = [
  ['Resolved', 'Repair Closed'],
  ['Closed', 'Repair Rescheduled'],
] as const;

const statusStyles: Record<string, string> = {
  Submitted: 'border-blue-200 bg-blue-50 text-blue-600',
  'Repair Confirmed': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'Installation Confirmed': 'border-emerald-200 bg-emerald-50 text-emerald-600',
  'Repair Closed': 'border-slate-200 bg-slate-50 text-slate-600',
  'Installation Closed': 'border-slate-200 bg-slate-50 text-slate-600',
  'Repair Rescheduled': 'border-amber-200 bg-amber-50 text-amber-600',
  'Installation Rescheduled': 'border-amber-200 bg-amber-50 text-amber-600',
};

function formatVisitDateTime(ticket: Ticket) {
  if (!ticket.visitDate && !ticket.visitTime) return 'Not scheduled yet';
  const date = ticket.visitDate
    ? new Date(`${ticket.visitDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  return [date, ticket.visitTime].filter(Boolean).join(', ') || 'Not scheduled yet';
}

function formatVisitDateOnly(ticket: Ticket) {
  if (!ticket.visitDate) return 'Not scheduled yet';
  return new Date(`${ticket.visitDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTaskDate(date: string) {
  if (!date) return 'Not scheduled yet';
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatInstallationStatus(status: string) {
  const normalized = String(status || '').trim();
  const displayMap: Record<string, string> = {
    Scheduled: 'Installation Confirmed',
    'In Progress': 'Installation Confirmed',
    In_Progress: 'Installation Confirmed',
    'Installation Confirmed': 'Installation Confirmed',
    Installation_Confirmed: 'Installation Confirmed',
    Completed: 'Installation Closed',
    'Installation Closed': 'Installation Closed',
    Installation_Closed: 'Installation Closed',
    Cancelled: 'Installation Rescheduled',
    'Installation Rescheduled': 'Installation Rescheduled',
    Installation_Rescheduled: 'Installation Rescheduled',
  };
  return displayMap[normalized] || normalized.replace(/_/g, ' ');
}

function getInstallationStatusValue(status: string) {
  return formatInstallationStatus(status);
}

function getInstallationStatusOptionValue(status: string) {
  const displayStatus = formatInstallationStatus(status);
  return installationStatusOptions.find(([, label]) => label === displayStatus)?.[0] || '';
}

function getRepairStatusOptionValue(status: string) {
  const normalized = String(status || '').trim().replace(/_/g, ' ');
  if (normalized === 'Resolved' || normalized === 'Repair Closed') return 'Resolved';
  if (normalized === 'Closed' || normalized === 'Repair Rescheduled') return 'Closed';
  return '';
}

function isInstallationClosed(status: string) {
  return getInstallationStatusOptionValue(status) === 'Installation_Closed';
}

function isRepairClosed(status: string) {
  return getRepairStatusOptionValue(status) === 'Resolved';
}

export default function TechnicianTaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [installations, setInstallations] = useState<InstallationApiItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationApiItem | null>(
    null,
  );
  const [ticketStatus, setTicketStatus] = useState('Open');
  const [installationStatus, setInstallationStatus] = useState('');
  const [pendingStatus, setPendingStatus] = useState<{ value: string; label: string } | null>(null);
  const [hasStatusSelection, setHasStatusSelection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/installations')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          const nextInstallations = result.data as InstallationApiItem[];
          setInstallations(nextInstallations);
          setTasks(
            nextInstallations.map((item) => [
              item.id,
              item.subscriber?.name || 'Subscriber',
              item.type.replace(/_/g, ' '),
              item.time || '',
              getInstallationStatusValue(item.status),
              item.date?.slice(0, 10) || '',
            ]),
          );
          const requestedTaskId = new URLSearchParams(window.location.search).get('taskId');
          const requestedInstallation = requestedTaskId
            ? nextInstallations.find((item) => item.id === requestedTaskId)
            : null;
          if (requestedInstallation) {
            setSelectedTicket(null);
            setSelectedInstallation(requestedInstallation);
            setInstallationStatus(getInstallationStatusOptionValue(requestedInstallation.status));
          }
        }
      })
      .catch(() => {
        setInstallations([]);
        setTasks([]);
      });
    fetch('/api/tickets')
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data)) {
          const nextTickets = result.data as Ticket[];
          setTickets(nextTickets);
          const requestedTaskId = new URLSearchParams(window.location.search).get('taskId');
          const requestedTicket = requestedTaskId
            ? nextTickets.find((ticket) => ticket.id === requestedTaskId)
            : null;
          if (requestedTicket) openTicket(requestedTicket);
        }
      })
      .catch(() => setTickets([]));
  }, []);

  const visibleTasks = tasks.filter(
    (task) => filter === 'All' || filter === 'Installation' || task[4] === filter,
  );
  const visibleTickets = tickets.filter((ticket) => {
    if (filter === 'All' || filter === 'Repair') return true;
    if (!filter.startsWith('Repair')) return false;
    return formatTicketStatus(ticket.status) === filter;
  });
  const activeCategory = filter.startsWith('Installation')
    ? 'Installation'
    : filter.startsWith('Repair')
      ? 'Repair'
      : filter;
  const activeSubStatus = filter.endsWith('Confirmed')
    ? 'Confirmed'
    : filter.endsWith('Rescheduled')
      ? 'Rescheduled'
      : filter.endsWith('Closed')
        ? 'Closed'
        : 'All';

  const visibleTaskCards = [
    ...visibleTickets.map((ticket) => ({
      kind: 'repair' as const,
      id: ticket.id,
      sortKey: `${(ticket.visitDate || ticket.createdAt).slice(0, 10)} ${ticket.visitTime || ''}`,
      ticket,
    })),
    ...visibleTasks.map((task) => ({
      kind: 'installation' as const,
      id: task[0],
      sortKey: `${task[5]} ${task[3]}`,
      task,
    })),
  ].sort((first, second) => second.sortKey.localeCompare(first.sortKey));

  const currentDate = new Date();
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const allStatuses = [
    ...tasks.map((task) => task[4]),
    ...tickets.map((ticket) => formatTicketStatus(ticket.status)),
  ];
  const counts = {
    total: tasks.length + tickets.length,
    today:
      tasks.filter((task) => task[5] === today).length +
      tickets.filter((ticket) => ticket.visitDate?.slice(0, 10) === today).length,
    pending: allStatuses.filter(
      (status) => status.endsWith('Confirmed') || status.endsWith('Rescheduled'),
    ).length,
    done: allStatuses.filter((status) => status.endsWith('Closed')).length,
  };

  function selectStatus(value: string, label: string, setStatus: (status: string) => void) {
    const currentStatus = selectedInstallation ? installationStatus : ticketStatus;
    if (value === currentStatus) {
      setStatus(value);
      setHasStatusSelection(true);
      return;
    }
    if (label.includes('Closed') || label.includes('Rescheduled')) {
      setPendingStatus({ value, label });
      return;
    }
    setStatus(value);
    setHasStatusSelection(true);
  }

  function confirmPendingStatus() {
    if (!pendingStatus) return;
    if (selectedInstallation) setInstallationStatus(pendingStatus.value);
    else setTicketStatus(pendingStatus.value);
    setHasStatusSelection(true);
    setPendingStatus(null);
  }

  function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setSelectedInstallation(null);
    setTicketStatus(ticket.status === 'Open' ? 'In Progress' : ticket.status.replace(/_/g, ' '));
    setHasStatusSelection(false);
  }

  function openInstallationTask(
    name: string,
    type: string,
    detail: string,
    status: string,
    date: string,
  ) {
    const installation =
      installations.find(
        (item) =>
          item.subscriber?.name === name &&
          item.date?.slice(0, 10) === date &&
          item.time === detail &&
          item.type.replace(/_/g, ' ') === type,
      ) ||
      installations.find(
        (item) => item.subscriber?.name === name && item.date?.slice(0, 10) === date,
      ) ||
      null;

    setSelectedTicket(null);
    setSelectedInstallation(
      installation ?? {
        id: `${date}-${name}`.replace(/\s+/g, '-'),
        date,
        time: detail,
        type,
        status,
        address: 'No address provided',
        technician: { name: 'Not assigned yet' },
        subscriber: { name, address: 'No address provided' },
      },
    );
    setInstallationStatus(getInstallationStatusOptionValue(installation?.status || status));
    setHasStatusSelection(false);
  }

  async function saveTicketStatus() {
    if (!selectedTicket) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: ticketStatus,
          ...(ticketStatus === 'Closed'
            ? { technicianId: null, visitDate: null, visitTime: null }
            : {}),
        }),
      });
      if (!response.ok) return;
      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === selectedTicket.id ? { ...ticket, status: ticketStatus } : ticket,
        ),
      );
      setSelectedTicket(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveInstallationStatus() {
    if (!selectedInstallation) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/installations/${selectedInstallation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: installationStatus,
          ...(installationStatus === 'Installation_Rescheduled'
            ? { technicianId: null, date: null, time: null, technicianName: null }
            : {}),
        }),
      });
      if (!response.ok) return;
      setInstallations((current) =>
        current.map((item) =>
          item.id === selectedInstallation.id ? { ...item, status: installationStatus } : item,
        ),
      );
      setTasks((current) =>
        current.map((item) =>
          item[0] === selectedInstallation.id
            ? [item[0], item[1], item[2], item[3], installationStatus.replace(/_/g, ' '), item[5]]
            : item,
        ),
      );
      setSelectedInstallation(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PortalShell role="technician">
      <div className="bg-[#f8fafc] pb-10 text-slate-900">
        {/* Top Gradient Header */}
        <header className="relative overflow-hidden bg-gradient-to-r from-[#173896] via-[#214ebc] to-[#1e3a8a] px-4 py-7 text-white shadow-lg sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_50%)] pointer-events-none" />
          <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Link
                href="/technician/my-tasks"
                aria-label="Back to home"
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">My Tasks</h1>
                <p className="mt-0.5 text-xs sm:text-sm text-blue-100/90">
                  Manage assigned fiber installations and subscriber repair tickets
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/15 border border-white/20 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
              {counts.total} Total Work Orders
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 lg:px-10">
          {/* 4 KPI Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              [counts.total, 'Total'],
              [counts.today, 'Today'],
              [counts.pending, 'Pending'],
              [counts.done, 'Done'],
            ].map(([value, label]) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 text-center shadow-xs sm:p-5"
              >
                <p className="text-2xl font-black text-[#2447b6] sm:text-3xl">{value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </p>
              </article>
            ))}
          </div>

          {/* Category Filter Tabs */}
          <div className="mt-5 grid grid-cols-3 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xs">
            {taskCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`min-h-10 rounded-xl px-3 text-xs sm:text-sm font-bold transition-all ${
                  activeCategory === category
                    ? 'bg-[#2447b6] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {activeCategory !== 'All' && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
              {subStatusFilters.map((subStatus) => {
                const nextFilter =
                  subStatus === 'All' ? activeCategory : `${activeCategory} ${subStatus}`;
                return (
                  <button
                    key={subStatus}
                    type="button"
                    onClick={() => setFilter(nextFilter)}
                    className={`min-h-9 rounded-full border px-3 text-xs font-bold transition-all sm:px-4 ${
                      activeSubStatus === subStatus
                        ? 'border-[#2447b6] bg-[#2447b6] text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {subStatus}
                  </button>
                );
              })}
            </div>
          )}

          {/* Task List */}
          <div className="mt-5 grid gap-3">
            {visibleTaskCards.map((item) =>
              item.kind === 'repair' ? (
                <button
                  type="button"
                  key={`repair-${item.id}`}
                  onClick={() => openTicket(item.ticket)}
                  className="group flex min-h-[82px] w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-blue-300 hover:bg-slate-50/70 sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-105">
                      <Wrench size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                          #{item.ticket.id}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                          {item.ticket.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h2 className="mt-1 truncate text-base font-extrabold text-slate-900">
                        {formatPersonName(item.ticket.subscriber?.name || 'Subscriber')}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {formatVisitDateOnly(item.ticket)}
                        </span>
                        {item.ticket.subscriber?.address && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[220px] sm:max-w-xs">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{item.ticket.subscriber.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                      statusStyles[formatTicketStatus(item.ticket.status)] ||
                      'border-blue-200 bg-blue-50 text-blue-600'
                    }`}
                  >
                    {formatTicketStatus(item.ticket.status)}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  key={`installation-${item.id}`}
                  onClick={() =>
                    openInstallationTask(
                      item.task[1],
                      item.task[2],
                      item.task[3],
                      item.task[4],
                      item.task[5],
                    )
                  }
                  className="group flex min-h-[82px] w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-blue-300 hover:bg-slate-50/70 sm:p-5"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2166f3] transition-transform group-hover:scale-105">
                      <CalendarDays size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                          #{item.task[0]}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                          {item.task[2]}
                        </span>
                      </div>
                      <h2 className="mt-1 truncate text-base font-extrabold text-slate-900">
                        {formatPersonName(item.task[1])}
                      </h2>
                      <p className="mt-1 inline-flex items-center gap-1 truncate text-xs text-slate-400">
                        <Clock3 size={12} />
                        {formatTaskDate(item.task[5])}
                        {item.task[3] ? ` · ${item.task[3]}` : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                      statusStyles[item.task[4]] || 'border-blue-200 bg-blue-50 text-blue-600'
                    }`}
                  >
                    {item.task[4]}
                  </span>
                </button>
              ),
            )}
            {!visibleTasks.length && !visibleTickets.length && (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-2xs">
                <CheckCircle2 size={36} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-600">No tasks found for this filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Slide-Over Work Order Details Drawer */}
        {(selectedTicket || selectedInstallation) && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs"
            onMouseDown={() => {
              setSelectedTicket(null);
              setSelectedInstallation(null);
            }}
          >
            <section
              className="absolute inset-y-0 right-0 flex w-full max-w-[680px] flex-col overflow-hidden bg-[#eef4fb] shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="flex shrink-0 items-center justify-between bg-gradient-to-r from-[#173896] to-[#2447b6] px-5 py-5 text-white sm:px-7">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 border border-white/20">
                    <FileText size={21} />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                      Status
                    </p>
                    <h2 className="text-xl font-black">
                      {selectedInstallation
                        ? formatInstallationStatus(selectedInstallation.status || 'Scheduled')
                        : formatTicketStatus(selectedTicket?.status || 'Open')}
                    </h2>
                  </div>
                </div>
                <button
                  aria-label="Close ticket details"
                  onClick={() => {
                    setSelectedTicket(null);
                    setSelectedInstallation(null);
                  }}
                  className="rounded-full bg-white/15 p-2.5 transition-colors hover:bg-white/25"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto space-y-5 p-5 sm:p-7">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Work order number
                  </span>
                  <strong className="font-mono text-lg font-black text-slate-900">
                    #{selectedInstallation?.id || selectedTicket?.id}
                  </strong>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                    Work order details
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Technician visit date and time
                      </p>
                      <p
                        className={`mt-1 text-base font-bold ${
                          (
                            selectedInstallation
                              ? selectedInstallation.date || selectedInstallation.time
                              : selectedTicket?.visitDate || selectedTicket?.visitTime
                          )
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {selectedInstallation
                          ? selectedInstallation.date || selectedInstallation.time
                            ? `${new Date(`${selectedInstallation.date?.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${selectedInstallation.time || ''}`
                            : 'Not scheduled yet'
                          : formatVisitDateTime(selectedTicket as Ticket)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Technician
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-800">
                        {selectedInstallation?.technician?.name ||
                          selectedTicket?.technician?.name ||
                          'Not assigned yet'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                  <h3 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                    Request details
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Name
                        </p>
                        <p className="mt-1 text-base font-bold text-slate-800">
                          {formatPersonName(
                            selectedInstallation?.subscriber?.name ||
                              selectedTicket?.subscriber?.name ||
                              'Subscriber',
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {selectedInstallation ? 'Request Type' : 'Concern'}
                        </p>
                        <p className="mt-1 text-base font-bold text-slate-800">
                          {selectedInstallation
                            ? selectedInstallation.type.replace(/_/g, ' ')
                            : selectedTicket?.type.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Address
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-800">
                        {selectedInstallation?.address ||
                          selectedInstallation?.subscriber?.address ||
                          selectedTicket?.subscriber?.address ||
                          'No address provided'}
                      </p>
                    </div>
                    {!selectedInstallation && selectedTicket && (
                      <>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Description
                          </p>
                          <p className="mt-1 text-base font-semibold text-slate-800">
                            {selectedTicket.subject}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Details
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {selectedTicket.details ||
                              selectedTicket.description ||
                              'No additional details provided.'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {selectedInstallation ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                    <h3 className="text-lg font-extrabold text-slate-900">Update Status</h3>
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {installationStatusOptions.map(([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          disabled={
                            value === 'Installation_Rescheduled' &&
                            isInstallationClosed(selectedInstallation.status)
                          }
                          onClick={() => selectStatus(value, label, setInstallationStatus)}
                          className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                            installationStatus === value
                              ? 'border-[#2447b6] bg-[#2447b6] text-white shadow-md shadow-blue-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {installationStatus === value && <span className="mr-2">✓</span>}
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={
                        isSaving ||
                        !installationStatus ||
                        !hasStatusSelection ||
                        installationStatus ===
                          getInstallationStatusOptionValue(selectedInstallation?.status || '')
                      }
                      onClick={saveInstallationStatus}
                      className="mt-4 w-full rounded-xl bg-[#2447b6] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-[#1d3ea5] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Save Status'}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                    <h3 className="text-lg font-extrabold text-slate-900">Update Status</h3>
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                      {technicianTicketStatuses.map(([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          disabled={
                            value === 'Closed' && isRepairClosed(selectedTicket?.status || '')
                          }
                          onClick={() => selectStatus(value, label, setTicketStatus)}
                          className={`rounded-xl border px-4 py-3 text-sm font-bold transition-all ${
                            ticketStatus === value
                              ? 'border-[#2447b6] bg-[#2447b6] text-white shadow-md shadow-blue-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {ticketStatus === value && <span className="mr-2">✓</span>}
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={
                        isSaving ||
                        !ticketStatus ||
                        ticketStatus === 'Open' ||
                        !hasStatusSelection ||
                        ticketStatus === getRepairStatusOptionValue(selectedTicket?.status || '')
                      }
                      onClick={saveTicketStatus}
                      className="mt-4 w-full rounded-xl bg-[#2447b6] px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-colors hover:bg-[#1d3ea5] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving ? 'Saving...' : 'Save Status'}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {pendingStatus && (
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-5 backdrop-blur-xs"
            onMouseDown={() => setPendingStatus(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-status-title"
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#2166f3]">
                <CircleAlert size={22} />
              </div>
              <h2 id="confirm-status-title" className="mt-4 text-base font-extrabold text-slate-950">
                Confirm Status Update
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {pendingStatus.label.includes('Rescheduled')
                  ? `Are you sure you want to reschedule this ${selectedInstallation ? 'installation' : 'repair'}?`
                  : `Are you sure you want to mark this ${selectedInstallation ? 'installation' : 'repair'} as complete?`}
              </p>
              <button
                type="button"
                onClick={confirmPendingStatus}
                className="mt-5 w-full rounded-xl bg-[#2447b6] px-4 py-3 text-xs font-bold text-white"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setPendingStatus(null)}
                className="mt-2 w-full rounded-xl bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
