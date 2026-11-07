"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Plus,
  Search,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Copy,
  Sparkles,
  MoreHorizontal,
  Pencil,
  Archive,
  Undo2,
  Trash2,
} from "lucide-react";
import { PortalShell } from "@/app/components/PortalShell";

export type Subscriber = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  connectionDate: string;
  contact: string;
  address: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  zipCode: string;
  archived: boolean;
  image?: string | null;
};

type LocationOption = {
  code: string;
  name: string;
  regionCode?: string;
  provinceCode?: string | false;
};

const PSGC_API = "https://psgc.gitlab.io/api";

function formatPlanName(plan: string) {
  return plan.replace(/_/g, " ").replace(/\s+Mbps$/i, "Mbps");
}

function sortLocations(options: LocationOption[]) {
  return [...options].sort((first, second) =>
    first.name.localeCompare(second.name, "en", { sensitivity: "base" }),
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      {children}
    </label>
  );
}

function displayFirstAndLastName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export function AdminSubscribersPage() {
  // Database & UI state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [showArchived, setShowArchived] = useState(false);
  const [plans, setPlans] = useState<string[]>([]);

  // Add / Edit Subscriber Form state (controlled via useState)
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("Active");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PSGC Locations state
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<string[]>([]);

  // 3-Dots actions menu & Password reset state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [passwordModalSubscriber, setPasswordModalSubscriber] = useState<Subscriber | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);

  // 1. Fetch all subscribers from database on mount and render via useState
  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/subscribers");
      const result = await response.json();
      if (Array.isArray(result.data)) {
        setSubscribers(
          result.data.map(
            (item: {
              id: string;
              name?: string;
              email?: string;
              plan?: string;
              status?: string;
              connectionDate?: string;
              contact?: string;
              address?: string;
              province?: string;
              city?: string;
              barangay?: string;
              street?: string;
              zipCode?: string;
              archived?: boolean;
            }) => ({
              id: String(item.id),
              name: item.name || "",
              email: item.email || "",
              plan: formatPlanName(item.plan || "Fiber 100Mbps"),
              status: (item.status || "Active").replace(/_/g, " "),
              connectionDate: item.connectionDate
                ? String(item.connectionDate).slice(0, 10)
                : new Date().toISOString().slice(0, 10),
              contact: item.contact || "",
              address: item.address || "",
              province: item.province || "",
              city: item.city || "",
              barangay: item.barangay || "",
              street: item.street || item.address || "",
              zipCode: item.zipCode || "",
              archived: Boolean(item.archived),
            }),
          ),
        );
      }
    } catch (err) {
      console.error("Failed to load subscribers from database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  // 2. Fetch plans from settings
  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.data?.plans)) {
          const loadedPlans = result.data.plans
            .map((p: { name?: string } | string) =>
              formatPlanName(typeof p === "string" ? p : p.name || ""),
            )
            .filter(Boolean);
          setPlans(loadedPlans);
          if (loadedPlans.length && !plan) {
            setPlan(loadedPlans[0]);
          }
        }
      })
      .catch(() => undefined);
  }, []);

  // 3. Close 3-dots menu when clicking outside or scrolling/resizing
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".subscriber-action-menu-root")) {
        setActiveMenuId(null);
      }
    }
    function handleScrollOrResize() {
      setActiveMenuId(null);
    }
    document.addEventListener("click", handleOutsideClick);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  // 4. PSGC Provinces & NCR cities
  useEffect(() => {
    if (!isAdding || provinces.length) return;
    let cancelled = false;
    Promise.all([
      fetch(`${PSGC_API}/provinces/`).then((response) => response.json()),
      fetch(`${PSGC_API}/regions/130000000/cities-municipalities/`).then(
        (response) => response.json(),
      ),
    ])
      .then(([provinceOptions, ncrCities]) => {
        if (cancelled) return;
        const allProvinces = sortLocations([
          {
            code: "130000000",
            name: "NCR (Metro Manila)",
            regionCode: "130000000",
            provinceCode: false,
          },
          ...provinceOptions,
        ]);
        const sortedNcrCities = sortLocations(ncrCities);
        setProvinces(allProvinces);
        setCityOptions(sortedNcrCities);
        setCities(sortedNcrCities.map((option) => option.name));
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [isAdding, provinces.length]);

  // 5. PSGC Cities on province change
  useEffect(() => {
    if (!province || !provinces.length) return;
    const selected = provinces.find((option) => option.name === province);
    const isSavedProvince = editingSubscriber?.province === province;
    if (selected) {
      void loadCities(
        selected,
        isSavedProvince ? editingSubscriber?.city || "" : "",
        isSavedProvince ? editingSubscriber?.barangay || "" : "",
      );
    }
  }, [province, provinces, editingSubscriber]);

  // 6. PSGC Barangays on city change
  useEffect(() => {
    if (!city || !cityOptions.length) return;
    const selected = cityOptions.find((option) => option.name === city);
    if (selected) {
      void loadBarangays(
        selected,
        editingSubscriber?.city === city ? editingSubscriber?.barangay || "" : "",
      );
    }
  }, [city, cityOptions, editingSubscriber]);

  async function loadCities(
    provinceOption: LocationOption,
    selectedCity = "",
    selectedBarangay = "",
  ) {
    setCity(selectedCity);
    setBarangay(selectedBarangay);
    setCities([]);
    setCityOptions([]);
    setBarangays([]);
    try {
      const endpoint =
        provinceOption.code === "130000000"
          ? `${PSGC_API}/regions/130000000/cities-municipalities/`
          : `${PSGC_API}/provinces/${provinceOption.code}/cities-municipalities/`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Location request failed");
      const options: LocationOption[] = await response.json();
      const sortedOptions = sortLocations(options);
      setCityOptions(sortedOptions);
      setCities(sortedOptions.map((option) => option.name));
    } catch { }
  }

  async function loadBarangays(
    cityOption: LocationOption,
    selectedBarangay = "",
  ) {
    setBarangay(selectedBarangay);
    setBarangays([]);
    try {
      const response = await fetch(
        `${PSGC_API}/cities-municipalities/${cityOption.code}/barangays/`,
      );
      if (!response.ok) throw new Error("Location request failed");
      const options: LocationOption[] = await response.json();
      const names = sortLocations(options).map((option) => option.name);
      setBarangays(names);
      if (selectedBarangay && names.includes(selectedBarangay)) {
        setBarangay(selectedBarangay);
      }
    } catch { }
  }

  // Filter subscribers based on search query, status, and archive state
  const rows = useMemo(() => {
    return subscribers.filter((sub) => {
      // Archive toggle filter
      if (showArchived ? !sub.archived : sub.archived) return false;
      // Status dropdown filter
      if (filter !== "All" && sub.status !== filter) return false;
      // Search query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const searchable =
          `${sub.id} ${sub.name} ${sub.email} ${sub.plan} ${sub.status} ${sub.contact} ${sub.address}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [subscribers, showArchived, filter, query]);

  // Open Add Subscriber Modal
  function openAddModal() {
    setEditingSubscriber(null);
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setContact("");
    setPlan(plans[0] || "Fiber 100Mbps");
    setStatus("Active");
    setStreet("");
    setZipCode("");
    setProvince("");
    setCity("");
    setBarangay("");
    setIsAdding(true);
  }

  // Open Edit Subscriber Modal
  function openEditModal(sub: Subscriber) {
    setEditingSubscriber(sub);
    const parts = sub.name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    const middle = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
    setFirstName(first);
    setMiddleName(middle);
    setLastName(last);
    setEmail(sub.email);
    setContact(sub.contact);
    setPlan(formatPlanName(sub.plan));
    setStatus(sub.status);
    setStreet(sub.street);
    setZipCode(sub.zipCode);
    setProvince(sub.province);
    setCity(sub.city);
    setBarangay(sub.barangay);
    setIsAdding(true);
  }

  // Handle Add / Edit form submit
  async function handleSubscriberFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");
    const fullAddress =
      [street.trim(), barangay.trim(), city.trim(), province.trim(), zipCode.trim()]
        .filter(Boolean)
        .join(", ") || "Address not provided";

    try {
      if (editingSubscriber) {
        const response = await fetch(`/api/subscribers/${editingSubscriber.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            contact,
            address: fullAddress,
            province,
            city,
            barangay,
            street,
            zipCode,
            plan: plan.replace(/\s+/g, "_"),
            status,
            connectionDate: editingSubscriber.connectionDate,
          }),
        });
        if (!response.ok) {
          const res = await response.json().catch(() => null);
          window.alert(res?.error || "Failed to update subscriber.");
          return;
        }
        setSubscribers((current) =>
          current.map((sub) =>
            sub.id === editingSubscriber.id
              ? {
                ...sub,
                name: fullName,
                email,
                contact,
                address: fullAddress,
                province,
                city,
                barangay,
                street,
                zipCode,
                plan: formatPlanName(plan),
                status,
              }
              : sub,
          ),
        );
        setIsAdding(false);
      } else {
        const response = await fetch("/api/subscribers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            contact,
            address: fullAddress,
            province,
            city,
            barangay,
            street,
            zipCode,
            plan: plan.replace(/\s+/g, "_"),
            status,
            connectionDate: new Date().toISOString().slice(0, 10),
          }),
        });
        if (!response.ok) {
          const res = await response.json().catch(() => null);
          window.alert(res?.error || "Failed to create subscriber.");
          return;
        }
        const res = await response.json();
        const created = res.data;
        if (created) {
          setSubscribers((current) => [
            {
              id: String(created.id),
              name: created.name || fullName,
              email: created.email || email,
              plan: formatPlanName(created.plan || plan),
              status: (created.status || status).replace(/_/g, " "),
              connectionDate: created.connectionDate
                ? String(created.connectionDate).slice(0, 10)
                : new Date().toISOString().slice(0, 10),
              contact: created.contact || contact,
              address: created.address || fullAddress,
              province: created.province || province,
              city: created.city || city,
              barangay: created.barangay || barangay,
              street: created.street || street,
              zipCode: created.zipCode || zipCode,
              archived: false,
            },
            ...current,
          ]);
        }
        setIsAdding(false);
      }
    } catch {
      window.alert("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Archive / Unarchive
  function handleArchive(id: string, archived: boolean) {
    fetch(`/api/subscribers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    })
      .then((response) => {
        if (response.ok) {
          setSubscribers((current) =>
            current.map((item) =>
              item.id === id ? { ...item, archived } : item,
            ),
          );
        }
      })
      .catch(() => undefined);
  }

  // Handle Delete
  function handleDelete(id: string) {
    if (window.confirm("Delete this subscriber permanently?")) {
      fetch(`/api/subscribers/${id}`, { method: "DELETE" })
        .then((response) => {
          if (response.ok) {
            setSubscribers((current) => current.filter((item) => item.id !== id));
          }
        })
        .catch(() => undefined);
    }
  }

  // Open Password Reset Modal
  function openPasswordModal(sub: Subscriber) {
    setPasswordModalSubscriber(sub);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
    setShowPasswordText(false);
    setCopiedNotice(false);
  }

  // Generate strong random password
  function generateRandomPassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let pwd = "Sky@";
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setPasswordError("");
  }

  // Submit Password Change
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordModalSubscriber) return;
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const response = await fetch(
        `/api/subscribers/${passwordModalSubscriber.id}/password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setPasswordError(result?.error || "Failed to update subscriber password.");
      } else {
        setPasswordSuccess(
          `Password updated successfully for ${passwordModalSubscriber.name}!`,
        );
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  const selectClass =
    "mt-2 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3b4fd8] disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer";

  return (
    <PortalShell role="admin">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscribers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage subscriber accounts rendered live from database
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-full bg-[#3b4fd8] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#2d3fc7] transition-colors cursor-pointer"
        >
          <Plus size={17} />
          Add Subscriber
        </button>
      </div>

      <div className="subscriber-table-shell mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        {/* Table Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4">
          <div className="relative w-full max-w-xs">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subscribers..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#3b4fd8]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="status-filter-container relative">
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter subscribers"
                className="admin-filter-dropdown status-filter-select appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-slate-600 outline-none focus:border-[#3b4fd8] cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                size={16}
              />
            </label>

            <button
              type="button"
              onClick={() => setShowArchived((current) => !current)}
              className="admin-archive-toggle rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 ease-out hover:bg-slate-50 cursor-pointer"
            >
              {showArchived ? "Show Active" : "Show Archived"}
            </button>

            {/* Live record counter rendered via React state */}
            <span className="live-record-counter text-sm font-medium text-slate-400 pl-2">
              {rows.length} {rows.length === 1 ? "record" : "records"}
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left">
            <thead className="border-b border-slate-100 bg-white text-xs font-bold uppercase tracking-wide text-slate-400">
              <tr>
                {[
                  "SUBSCRIBER ID",
                  "Name",
                  "Email",
                  "Plan",
                  "Status",
                  "Actions",
                ].map((heading) => (
                  <th
                    className={`px-5 py-4 ${heading === "Actions" ? "text-right" : ""}`}
                    key={heading}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3b4fd8] border-t-transparent" />
                      <span className="text-sm font-medium">
                        Loading subscribers from database...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <p className="text-base font-semibold text-slate-700">
                      No subscribers found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {query
                        ? "Try adjusting your search query or filter."
                        : showArchived
                          ? "There are no archived subscribers."
                          : "No subscribers registered in database."}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((subscriber) => (
                  <tr className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors" key={subscriber.id}>
                    <td className="px-5 py-4 font-mono text-slate-900">{subscriber.id}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-3">
                        {subscriber.image ? (
                          <img
                            src={subscriber.image}
                            alt={subscriber.name}
                            className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-xs text-[#2563eb]">
                            {subscriber.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{displayFirstAndLastName(subscriber.name)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{subscriber.email}</td>
                    <td className="px-5 py-4 text-slate-500">{subscriber.plan}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`admin-status-pill rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${subscriber.status === "Active"
                            ? "bg-emerald-50 text-emerald-500"
                            : "bg-amber-50 text-amber-500"
                          }`}
                      >
                        {subscriber.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {/* 3-Dots Action Menu */}
                      <div className="subscriber-action-menu-root relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMenuId === subscriber.id) {
                              setActiveMenuId(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const openUp = spaceBelow < 165;
                            setMenuPosition({
                              top: openUp ? undefined : rect.bottom + 6,
                              bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
                              right: Math.max(12, window.innerWidth - rect.right),
                            });
                            setActiveMenuId(subscriber.id);
                          }}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all cursor-pointer ${activeMenuId === subscriber.id
                              ? "border-slate-300 bg-slate-100 text-slate-900 shadow-xs"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 shadow-2xs"
                            }`}
                          title="Subscriber actions"
                          aria-label="Subscriber actions"
                          aria-expanded={activeMenuId === subscriber.id}
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeMenuId === subscriber.id && menuPosition && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              top: menuPosition.top,
                              bottom: menuPosition.bottom,
                              right: menuPosition.right,
                            }}
                            className="subscriber-action-dropdown fixed z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 text-left"
                          >
                            {!subscriber.archived ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openEditModal(subscriber);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2563eb] transition-colors cursor-pointer"
                                >
                                  <Pencil size={14} className="text-blue-600" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openPasswordModal(subscriber);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                                >
                                  <KeyRound size={14} className="text-amber-600" />
                                  <span>Reset Password</span>
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleArchive(subscriber.id, true);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  <Archive size={14} className="text-slate-400" />
                                  <span>Archive</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleArchive(subscriber.id, false);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#2563eb] transition-colors cursor-pointer"
                                >
                                  <Undo2 size={14} className="text-blue-600" />
                                  <span>Unarchive</span>
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleDelete(subscriber.id);
                                  }}
                                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} className="text-red-500" />
                                  <span>Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Subscriber Modal (Fully controlled React state) */}
      {isAdding && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5"
          onMouseDown={() => setIsAdding(false)}
        >
          <form
            onSubmit={handleSubscriberFormSubmit}
            onMouseDown={(event) => event.stopPropagation()}
            className="admin-form-modal-scrollbar flex h-[calc(100vh-2rem)] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editingSubscriber ? "Edit Subscriber" : "Add Subscriber"}
              </h2>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {editingSubscriber && (
              <div className="px-6 pt-4 pb-1">
                <div className="subscriber-summary-card flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  {editingSubscriber.image ? (
                    <img
                      src={editingSubscriber.image}
                      alt={editingSubscriber.name}
                      className="h-12 w-12 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="subscriber-avatar grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-base text-[#2563eb]">
                      {editingSubscriber.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="subscriber-name text-xs font-bold text-slate-900 leading-tight">
                      {editingSubscriber.name}
                    </p>
                    <p className="subscriber-id font-mono text-[11px] text-blue-700 font-semibold">
                      ID: {editingSubscriber.id}
                    </p>
                    <p className="subscriber-email text-[11px] text-slate-400 truncate">
                      {editingSubscriber.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name *">
                  <input
                    name="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Juan"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
                <Field label="Middle Name">
                  <input
                    name="middleName"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="e.g. Protacio"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
              </div>

              <Field label="Last Name *">
                <input
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Santos"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                />
              </Field>

              <Field label="Email *">
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@skytech.net"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                />
              </Field>

              <Field label="Contact Number *">
                <input
                  name="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 09XXXXXXXXX"
                  required
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan *">
                  <div className="relative mt-2">
                    <select
                      name="plan"
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      className={selectClass}
                    >
                      {plans.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>

                <Field label="Status *">
                  <div className="relative mt-2">
                    <select
                      name="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className={selectClass}
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>
              </div>

              {/* Philippine Location PSGC Fields */}
              <div className="space-y-3 pt-2">
                <Field label="Province / Region *">
                  <div className="relative mt-2">
                    <select
                      name="province"
                      value={province}
                      onChange={(e) => {
                        setProvince(e.target.value);
                        setCity("");
                        setBarangay("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Select province / region...</option>
                      {provinces.map((option) => (
                        <option key={option.code} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>

                <Field label="City / Municipality *">
                  <div className="relative mt-2">
                    <select
                      name="city"
                      value={city}
                      disabled={!province}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setBarangay("");
                      }}
                      className={selectClass}
                    >
                      <option value="">Select city / municipality...</option>
                      {cities.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === "SantaRosa" ? "Santa Rosa" : opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>

                <Field label="Barangay *">
                  <div className="relative mt-2">
                    <select
                      name="barangay"
                      value={barangay}
                      disabled={!city}
                      onChange={(e) => setBarangay(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select barangay...</option>
                      {barangays.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
                      size={16}
                    />
                  </div>
                </Field>

                <Field label="House No. / Street *">
                  <input
                    name="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. 12 Sampaguita St."
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                  />
                </Field>

                <Field label="Zip Code">
                  <input
                    name="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="e.g. 1000"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#3b4fd8]"
                  />
                </Field>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
              {editingSubscriber ? (
                <button
                  type="button"
                  onClick={() => {
                    openPasswordModal(editingSubscriber);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <KeyRound size={14} />
                  Reset Password
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingSubscriber
                      ? "Save changes"
                      : "Add Subscriber"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Change / Reset Password Modal */}
      {passwordModalSubscriber && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-xs"
          onMouseDown={() => {
            if (!isChangingPassword) setPasswordModalSubscriber(null);
          }}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-2xs">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">
                    Change Subscriber Password
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Reset credentials for forgotten passwords
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isChangingPassword}
                onClick={() => setPasswordModalSubscriber(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Subscriber Info Box */}
            <div className="px-6 pt-5 pb-2">
              <div className="subscriber-summary-card rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="font-semibold text-slate-600">Subscriber Account</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    {passwordModalSubscriber.id}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {passwordModalSubscriber.image ? (
                    <img
                      src={passwordModalSubscriber.image}
                      alt={passwordModalSubscriber.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="subscriber-avatar grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-xs text-[#2563eb]">
                      {passwordModalSubscriber.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="subscriber-name font-bold text-slate-900 text-sm">
                      {passwordModalSubscriber.name}
                    </div>
                    <div className="subscriber-email text-slate-600 truncate mt-0.5">
                      {passwordModalSubscriber.email}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form or Success State */}
            {passwordSuccess ? (
              <div className="px-6 py-6 text-center space-y-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Password Updated Successfully!
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    The subscriber can now sign in using their new credentials.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">
                      New Password
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-900 select-all">
                      {newPassword}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword);
                      setCopiedNotice(true);
                      setTimeout(() => setCopiedNotice(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    {copiedNotice ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPasswordModalSubscriber(null)}
                  className="w-full rounded-xl bg-[#2563eb] py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="px-6 pb-6 pt-2 space-y-4">
                {passwordError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
                    {passwordError}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      New Password
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <Sparkles size={12} />
                      Generate Strong Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordText ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 chars)"
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      aria-label={showPasswordText ? "Hide password" : "Show password"}
                    >
                      {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type={showPasswordText ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isChangingPassword}
                    onClick={() => setPasswordModalSubscriber(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                  >
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
