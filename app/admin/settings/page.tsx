'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Edit3, LoaderCircle, Moon, Plus, Save, Sun, Trash2, X } from 'lucide-react';
import { PortalShell } from '@/app/components/PortalShell';
import { DEFAULT_PLANS, DEFAULT_SETTINGS, PlanItem } from '@/app/lib/settings';
import { useTheme } from '@/app/lib/theme';

type Plan = PlanItem;

type Settings = {
  companyName: string;
  companyEmail: string;
  phone: string;
  address: string;
  lateFeePercent: number;
  gracePeriodDays: number;
  billingDay: number;
  plans: Plan[];
};

const blank: Settings = {
  ...DEFAULT_SETTINGS,
};

function normalizePlans(value: unknown): Plan[] {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_PLANS;
  return value.map((plan: { name?: string; speedMbps?: number; speed?: string | number; price?: number }) => {
    const name = plan.name || '';
    return {
      name,
      speedMbps: Number(
        plan.speedMbps ||
          String(plan.speed ?? '').replace(/[^0-9.]/g, '') ||
          name.match(/[0-9]+/)?.[0] ||
          0
      ),
      price: Number(plan.price || 0),
    };
  });
}

export default function SettingsPage() {
  const { isDark: isDarkMode, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>(blank);
  const [planDraft, setPlanDraft] = useState<Plan | null>(null);
  const [planIndex, setPlanIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load settings.');
        if (result.data) {
          setSettings({
            ...blank,
            ...result.data,
            plans: normalizePlans(result.data.plans),
          });
        }
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load settings.')
      )
      .finally(() => setLoading(false));
  }, []);

  function setField(field: keyof Omit<Settings, 'plans'>, value: string) {
    setSettings((current) => ({
      ...current,
      [field]: ['lateFeePercent', 'gracePeriodDays', 'billingDay'].includes(field)
        ? Number(value)
        : value,
    }));
    setSaved(false);
  }

  function savePlanDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!planDraft) return;
    setSettings((current) => ({
      ...current,
      plans:
        planIndex === null
          ? [...current.plans, planDraft]
          : current.plans.map((plan, index) => (index === planIndex ? planDraft : plan)),
    }));
    setPlanDraft(null);
    setPlanIndex(null);
    setSaved(false);
  }

  function openNewPlan() {
    setPlanIndex(null);
    setPlanDraft({ name: '', speedMbps: 100, price: 999 });
  }

  function openEditPlan(plan: Plan, index: number) {
    setPlanIndex(index);
    setPlanDraft({ ...plan });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save settings.');
      setSettings({
        ...settings,
        ...result.data,
        plans: normalizePlans(result.data?.plans || settings.plans),
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const textField = (label: string, name: keyof Omit<Settings, 'plans'>, type = 'text') => (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      <input
        type={type}
        value={settings[name] as string | number}
        onChange={(event) => setField(name, event.target.value)}
        required
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8]"
      />
    </label>
  );

  return (
    <PortalShell role="admin">
      <div className="max-w-6xl pb-12">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage company information, billing rules, and internet plans displayed on the website.
        </p>

        {loading ? (
          <div className="mt-7 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <LoaderCircle className="animate-spin text-blue-600" size={18} />
            Loading settings...
          </div>
        ) : (
          <form onSubmit={save} className="mt-7 space-y-6">
            {/* Appearance & Theme (Light Mode / Dark Mode) */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="font-bold text-slate-900">Appearance & Theme</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select your preferred interface display mode. Choose Light Mode for a clean, high-contrast look or Dark Mode for reduced glare.
                </p>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme(false)}
                  className={`group relative flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all duration-200 cursor-pointer ${
                    !isDarkMode
                      ? 'border-[#2563eb] bg-blue-50/50 shadow-md shadow-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-600">
                        <Sun size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Light Mode</span>
                          {!isDarkMode && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          Clean white background with dark text
                        </span>
                      </div>
                    </div>
                    {!isDarkMode && (
                      <span className="rounded-full bg-[#2563eb] p-1 text-white shadow-sm">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <div className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <div className="h-2 w-16 rounded bg-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded bg-slate-100" />
                      <div className="h-2 w-3/4 rounded bg-slate-100" />
                    </div>
                  </div>
                </button>

                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setTheme(true)}
                  className={`group relative flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all duration-200 cursor-pointer ${
                    isDarkMode
                      ? 'border-[#2563eb] bg-blue-50/50 shadow-md shadow-blue-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-950/70 text-indigo-400">
                        <Moon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Dark Mode</span>
                          {isDarkMode && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          Eye-friendly deep navy and slate tones
                        </span>
                      </div>
                    </div>
                    {isDarkMode && (
                      <span className="rounded-full bg-[#2563eb] p-1 text-white shadow-sm">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <div className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xs">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      <div className="h-2 w-16 rounded bg-slate-700" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded bg-slate-800" />
                      <div className="h-2 w-3/4 rounded bg-slate-800" />
                    </div>
                  </div>
                </button>
              </div>
            </section>

            {/* Company Info */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="font-bold text-slate-900">Company Information</h2>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                {textField('Company name', 'companyName')}
                {textField('Company email', 'companyEmail', 'email')}
                {textField('Phone', 'phone')}
                {textField('Address', 'address')}
              </div>
            </section>

            {/* Billing Rules */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="font-bold text-slate-900">Billing Rules</h2>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-3">
                {textField('Late fee (%)', 'lateFeePercent', 'number')}
                {textField('Grace period (days)', 'gracePeriodDays', 'number')}
                {textField('Billing day', 'billingDay', 'number')}
              </div>
            </section>

            {/* Internet Plans */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Internet Plans</h2>
                  <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
                    Manage available internet plans. These plans are dynamically displayed on the landing page and booking form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewPlan}
                  className="admin-add-plan-button inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-95 transition"
                >
                  <Plus size={17} />
                  Add plan
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-3.5">Plan Name</th>
                      <th className="px-6 py-3.5">Speed (Mbps)</th>
                      <th className="px-6 py-3.5">Price / Month</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {settings.plans.map((plan, index) => (
                      <tr className="hover:bg-slate-50/70 transition" key={`${plan.name}-${index}`}>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{plan.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                          {plan.speedMbps} Mbps
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-[#0284c7]">
                          ₱{plan.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => openEditPlan(plan, index)}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline"
                            >
                              <Edit3 size={15} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete ${plan.name}?`)) {
                                  setSettings((current) => ({
                                    ...current,
                                    plans: current.plans.filter((_, planIndex) => planIndex !== index),
                                  }));
                                  setSaved(false);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-rose-500 hover:text-rose-700 hover:underline"
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#1d4ed8] active:scale-95 transition"
              >
                {saved ? <Check size={18} /> : <Save size={18} />}
                {saving ? 'Saving...' : saved ? 'Saved' : 'Save settings'}
              </button>
            </div>
          </form>
        )}

        {/* Modal for Add / Edit Plan */}
        {planDraft && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={() => setPlanDraft(null)}
          >
            <form
              onSubmit={savePlanDraft}
              onMouseDown={(event) => event.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
                <h2 className="text-xl font-black text-slate-900">
                  {planIndex === null ? 'Add Internet Plan' : 'Edit Internet Plan'}
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setPlanDraft(null)}
                  className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-5 px-7 py-6">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Plan Name *
                  <input
                    autoFocus
                    required
                    placeholder="e.g. Fiber 100 Mbps"
                    value={planDraft.name}
                    onChange={(event) => setPlanDraft({ ...planDraft, name: event.target.value })}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Speed (Mbps) *
                  <input
                    required
                    min="1"
                    type="number"
                    placeholder="100"
                    value={planDraft.speedMbps || ''}
                    onChange={(event) =>
                      setPlanDraft({ ...planDraft, speedMbps: Number(event.target.value) })
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Price / Month (₱) *
                  <input
                    required
                    min="0"
                    type="number"
                    placeholder="999"
                    value={planDraft.price || ''}
                    onChange={(event) =>
                      setPlanDraft({ ...planDraft, price: Number(event.target.value) })
                    }
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-7 py-4">
                <button
                  type="button"
                  onClick={() => setPlanDraft(null)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#1d4ed8]"
                >
                  {planIndex === null ? 'Add Plan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
