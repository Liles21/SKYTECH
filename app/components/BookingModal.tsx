'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, X } from 'lucide-react';
import { Spinner } from '@/app/components/Spinner';
import { DEFAULT_PLANS, PlanItem } from '@/app/lib/settings';

type SubmittedBooking = { id: string; name: string; email: string; contact: string; plan: string };

// Comprehensive local data for Agusan & surrounding regions (Zero network latency or failure)
const PROVINCE_DATA: Record<
  string,
  {
    cities: Record<string, string[]>;
    defaultZip: Record<string, string>;
  }
> = {
  'Agusan del Norte': {
    cities: {
      Sibagat: [
        'Poblacion',
        'Mahayahay',
        'San Vicente',
        'El Rio',
        'Afga',
        'Ilihan',
        'Tabon-tabon',
        'Perez',
        'Kauswagan',
        'Sinai',
        'Kolambugan',
        'Villangit',
        'Del Rosario',
        'Banagbanag',
        'San Isidro',
        'Magkalape',
        'Magsaysay',
        'Santa Maria',
        'Santa Cruz',
        'New Tubigon',
        'Anislagan',
        'Padiay',
      ],
      'Butuan City': [
        'Libertad',
        'Doongan',
        'Bancasi',
        'Ampayon',
        'Villa Kananga',
        'San Vicente',
        'Holy Redeemer',
        'Baan Riverside',
        'Ambago',
        'Dagohoy',
        'Pangabugan',
        'Obrero',
      ],
      'Cabadbaran City': [
        'Poblacion 1',
        'Poblacion 2',
        'Comagascas',
        'Calamba',
        'Bayabas',
        'Mabini',
        'Cabinet',
        'Concepcion',
        'Del Pilar',
      ],
      Buenavista: ['Poblacion 1', 'Poblacion 2', 'Abilan', 'Agong-ong', 'Alubihid', 'Manapa', 'Matabao', 'Simbalan'],
      Nasipit: ['Poblacion', 'Aclan', 'Amontay', 'Camagong', 'Cubi-cubi', 'Jaguimitan', 'Kinabjangan', 'Punta'],
      Carmen: ['Poblacion', 'Cahayag', 'Gosoon', 'Manoligao', 'Rojales', 'San Agustin', 'Tagcatong', 'Vinapor'],
      Tubay: ['Poblacion 1', 'Poblacion 2', 'Binuangan', 'Cabontalan', 'Doña Rosario', 'La Fraternidad', 'Santa Ana'],
      Santiago: ['Poblacion 1', 'Poblacion 2', 'Estanislao', 'Jagupit', 'Pangaylan', 'San Isidro', 'Tagbuyacan'],
      'Las Nieves': ['Poblacion', 'Ambacon', 'Balungagan', 'Casiklan', 'Consorcia', 'Katipunan', 'Lingayao', 'Maningalao'],
      Jabonga: ['Poblacion', 'Baleguian', 'Bangonay', 'A. Beltran', 'Cuyago', 'Libas', 'Magdago', 'Magsaysay'],
      Kitcharao: ['Poblacion', 'Bangayan', 'Canaway', 'Hinimbangan', 'Jaliobong', 'Mahayahay', 'San Isidro', 'San Roque'],
      Magallanes: ['Poblacion', 'Buhang', 'Caloc-an', 'Guiasan', 'Marcos', 'Santo Niño', 'Santo Rosario', 'Taod-oy'],
    },
    defaultZip: {
      Sibagat: '8503',
      'Butuan City': '8600',
      'Cabadbaran City': '8605',
      Buenavista: '8601',
      Nasipit: '8602',
      Carmen: '8603',
      Tubay: '8606',
      Santiago: '8608',
      'Las Nieves': '8610',
      Jabonga: '8607',
      Kitcharao: '8609',
      Magallanes: '8604',
    },
  },
  'Agusan del Sur': {
    cities: {
      Sibagat: [
        'Poblacion',
        'Mahayahay',
        'San Vicente',
        'El Rio',
        'Afga',
        'Ilihan',
        'Tabon-tabon',
        'Perez',
        'Kauswagan',
        'Sinai',
        'Kolambugan',
        'Villangit',
      ],
      'Bayugan City': [
        'Poblacion',
        'Taglatawan',
        'Noli',
        'Maygatasan',
        'Gamao',
        'Mt. Carmel',
        'Salvacion',
        'San Juan',
        'Claro Cortez',
        'Hamogaway',
      ],
      Esperanza: ['Poblacion', 'Dakutan', 'Bentahon', 'Bunaguit', 'Cebulan', 'Crossing Luna', 'Guadalupe', 'Hawilian'],
      Prosperidad: ['Poblacion', 'Patin-ay', 'Awa', 'Azpetia', 'La Caridad', 'La Suerte', 'Lucena', 'Mabuhay', 'San Martin'],
      'San Francisco': ['Poblacion', 'Hubang', 'Alegria', 'Barangay 1', 'Barangay 2', 'Bitan-agan', 'Borbon', 'Caimpugan'],
      Bunawan: ['Poblacion', 'San Teodoro', 'Bunawan Brook', 'Consuelo', 'Imelda', 'Libertad', 'Mambalili', 'Nueva Era'],
      Trento: ['Poblacion', 'Basa', 'Cuevas', 'Kapatungan', 'Langkilaan', 'Manat', 'Pangyan', 'Pulang-lupa', 'San Ignacio'],
      Rosario: ['Poblacion', 'Bayugan 3', 'Cabantao', 'Cabawan', 'Marfil', 'Santa Cruz', 'Tagbayagan', 'Wasian'],
    },
    defaultZip: {
      Sibagat: '8503',
      'Bayugan City': '8502',
      Esperanza: '8513',
      Prosperidad: '8500',
      'San Francisco': '8501',
      Bunawan: '8506',
      Trento: '8505',
      Rosario: '8504',
    },
  },
  'Surigao del Norte': {
    cities: {
      'Surigao City': ['Washington', 'Taft', 'San Juan', 'Rizal', 'Luna', 'Lipata', 'Ipil', 'Cagdianao', 'Canlanipa'],
      Placer: ['Poblacion', 'Bad-as', 'Boyongan', 'Bugas-bugas', 'Central', 'Magsaysay', 'San Isidro'],
      Claver: ['Poblacion', 'Cabugo', 'Cagdianao', 'Hayanggabon', 'Ladgaron', 'Magallanes', 'Panatao', 'Urbiztondo'],
    },
    defaultZip: {
      'Surigao City': '8400',
      Placer: '8405',
      Claver: '8410',
    },
  },
  'Surigao del Sur': {
    cities: {
      'Tandag City': ['Bagong Lungsod', 'Bongtud', 'Buenavista', 'Dagocdoc', 'Mabua', 'San Agustin Norte', 'Telaje'],
      'Bislig City': ['Mangagoy', 'Poblacion', 'Cumawas', 'Coleto', 'Kahayag', 'Tabon', 'San Fernando'],
    },
    defaultZip: {
      'Tandag City': '8300',
      'Bislig City': '8311',
    },
  },
};

const PUROK_OPTIONS = [
  'Purok 1',
  'Purok 2',
  'Purok 3',
  'Purok 4',
  'Purok 5',
  'Purok 6',
  'Purok 7',
  'Purok 8',
  'Purok 9',
  'Purok 10',
  'Purok Central',
  'Purok Riverside',
  'Purok Maharlika',
  'National Highway',
  'Main Street',
];

const TIME_SLOT_OPTIONS = [
  'Morning (8:00 AM - 12:00 PM)',
  'Afternoon (1:00 PM - 5:00 PM)',
  'Weekend Priority (Saturday / Sunday)',
  'Anytime / Earliest Available Tech',
];

const PROPERTY_TYPES = [
  'Single-Family Residential House',
  'Apartment / Rental Unit',
  'Boarding House / Room',
  'Commercial Store / Sari-Sari Store',
  'Office / Business Facility',
];

const AVAILABLE_PLANS = [
  { value: 'Fiber_25Mbps', label: 'Fiber Starter · 25 Mbps (₱599/mo)' },
  { value: 'Fiber_50Mbps', label: 'Home Plus · 50 Mbps (₱799/mo) [Most Popular]' },
  { value: 'Fiber_100Mbps', label: 'Max Ultra · 100 Mbps (₱999/mo)' },
  { value: 'Fiber_200Mbps', label: 'Pro Ultra · 200 Mbps (₱1,499/mo)' },
  { value: 'Fiber_300Mbps', label: 'Gigabit · 300 Mbps (₱1,999/mo)' },
];

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: string;
  initialAddress?: string;
  initialBarangay?: string;
  availablePlans?: PlanItem[];
};

export function BookingModal({
  isOpen,
  onClose,
  initialPlan,
  initialAddress,
  initialBarangay,
  availablePlans,
}: BookingModalProps) {
  const [sent, setSent] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<SubmittedBooking | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customPlans, setCustomPlans] = useState<PlanItem[]>(DEFAULT_PLANS);

  // Form Fields State
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [barangay, setBarangay] = useState<string>('');
  const [purok, setPurok] = useState<string>('');
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('');

  // Fetch plans from API if not passed from parent
  useEffect(() => {
    if (!availablePlans) {
      fetch('/api/settings')
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          if (Array.isArray(data?.data?.plans) && data.data.plans.length > 0) {
            setCustomPlans(data.data.plans);
          }
        })
        .catch(() => {});
    }
  }, [availablePlans]);

  const activePlanList = availablePlans && availablePlans.length > 0 ? availablePlans : customPlans;

  // Synchronize initial values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSent(false);
      setSubmittedBooking(null);
      setError('');
      if (initialPlan) {
        // Find matching plan name
        const match = activePlanList.find(
          (p) =>
            p.name.toLowerCase() === initialPlan.toLowerCase() ||
            p.name.replace(/\s+/g, '_').toLowerCase() === initialPlan.toLowerCase()
        );
        setSelectedPlan(match ? match.name : initialPlan);
      } else {
        setSelectedPlan('');
      }
      if (initialBarangay) {
        setProvince('Agusan del Norte');
        setCity('Sibagat');
        setBarangay(initialBarangay);
        setZipCode('8503');
      } else {
        setProvince('');
        setCity('');
        setBarangay('');
        setZipCode('');
      }
      setLandmark(initialAddress || '');
      setPurok('');
      setPropertyType('');
      setTimeSlot('');
    }
  }, [isOpen, initialPlan, initialBarangay, initialAddress, activePlanList]);

  // Update city and zip when province changes
  const handleProvinceChange = (newProvince: string) => {
    setProvince(newProvince);
    const availableCities = Object.keys(PROVINCE_DATA[newProvince]?.cities || {});
    const defaultCity = availableCities.includes('Sibagat') ? 'Sibagat' : availableCities[0] || '';
    setCity(defaultCity);

    const availableBarangays = PROVINCE_DATA[newProvince]?.cities[defaultCity] || [];
    setBarangay(availableBarangays[0] || '');
    setZipCode(PROVINCE_DATA[newProvince]?.defaultZip[defaultCity] || '8503');
  };

  // Update barangays and zip when city changes
  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const availableBarangays = PROVINCE_DATA[province]?.cities[newCity] || [];
    setBarangay(availableBarangays[0] || '');
    setZipCode(PROVINCE_DATA[province]?.defaultZip[newCity] || '8503');
  };

  // Close on Escape key
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
    setIsSubmitting(true);
    try {
      const formEl = event.currentTarget;
      const formData = new FormData(formEl);
      const data = Object.fromEntries(formData);

      const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
      const fullAddress = [
        data.purok,
        data.landmark,
        data.barangay,
        data.city,
        data.province,
        `ZIP: ${data.zipCode || zipCode}`,
      ]
        .filter(Boolean)
        .join(', ');

      const payload = {
        name: fullName,
        email: data.email,
        contact: data.contact,
        plan: data.plan || selectedPlan,
        address: fullAddress,
        preferredDate: new Date().toISOString(),
        message: `Property: ${propertyType} | Slot: ${timeSlot}`,
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.data) {
        setError(result.error || 'We could not submit your request. Please try again.');
        return;
      }

      setSubmittedBooking({
        id: String(result.data.id),
        name: String(fullName),
        email: String(data.email),
        contact: String(data.contact),
        plan: String(payload.plan).replace(/_/g, ' '),
      });
      setSent(true);
    } catch {
      setError('We could not submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentCities = Object.keys(PROVINCE_DATA[province]?.cities || {});
  const currentBarangays = PROVINCE_DATA[province]?.cities[city] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5 backdrop-blur-sm transition-all overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-[460px] rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-2xl my-auto max-h-[88vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-250 ease-out">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {sent && submittedBooking ? (
          <div className="text-center py-4">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-500">
              <CheckCircle2 size={32} />
            </span>
            <h2 className="mt-4 text-xl sm:text-2xl font-black tracking-tight text-[#071329]">
              Request Submitted
            </h2>
            <p className="mx-auto mt-1.5 max-w-xs text-xs sm:text-sm text-slate-500">
              We&apos;ll get back to you within 24 hours.
            </p>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Booking ID</p>
              <p className="mt-0.5 text-xl font-black tracking-tight text-[#071329]">{submittedBooking.id}</p>
            </div>
            <div className="mt-5 space-y-2.5 text-left text-xs sm:text-sm">
              {[
                ['Name', submittedBooking.name],
                ['Email', submittedBooking.email],
                ['Contact', submittedBooking.contact],
                ['Plan', submittedBooking.plan],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between border-b border-slate-100 pb-2" key={label}>
                  <span className="text-slate-400 font-medium">{label}</span>
                  <span className="text-right font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 block w-full rounded-xl bg-[#2166f3] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-[#1a55d4]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center pb-2 pt-1">
              <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-[#071329]">
                Apply for Internet Connection
              </h2>
              <p className="mt-1 text-sm text-slate-500 font-medium">
                We&apos;ll get back to you within 24 hours.
              </p>
            </div>

            {/* Form in Clean Single-Column Layout matching design */}
            <form onSubmit={submit} className="mt-5 space-y-3.5">
              {/* First Name * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                First Name *
                <input
                  required
                  name="firstName"
                  type="text"
                  placeholder="e.g. Juan"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Middle Name (Optional) */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Middle Name (Optional)
                <input
                  name="middleName"
                  type="text"
                  placeholder="e.g. Santos"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Last Name * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Last Name *
                <input
                  required
                  name="lastName"
                  type="text"
                  placeholder="e.g. Dela Cruz"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Email * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Email *
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="juan@example.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Contact * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Contact *
                <input
                  required
                  name="contact"
                  type="tel"
                  placeholder="0917 123 4567"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* Plan Dropdown */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Plan
                <div className="relative mt-1">
                  <select
                    name="plan"
                    required
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-normal text-slate-900 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Select plan...</option>
                    {activePlanList.map((plan) => (
                      <option key={plan.name} value={plan.name}>
                        {plan.name} · {plan.speedMbps} Mbps (₱{plan.price.toLocaleString()}/mo)
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </label>

              {/* Province / State * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Province / State *
                <div className="relative mt-1">
                  <select
                    name="province"
                    required
                    value={province}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-normal text-slate-900 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Select province / state...</option>
                    {Object.keys(PROVINCE_DATA).map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </label>

              {/* City / Municipality * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                City / Municipality *
                <div className="relative mt-1">
                  <select
                    name="city"
                    required
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-normal text-slate-900 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Select city / municipality...</option>
                    {currentCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </label>

              {/* Barangay * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Barangay *
                <div className="relative mt-1">
                  <select
                    name="barangay"
                    required
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-normal text-slate-900 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Select barangay...</option>
                    {currentBarangays.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </label>

              {/* House No. / Street * */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                House No. / Street *
                <input
                  required
                  name="landmark"
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Blk 12 Lot 4, Sunflower St."
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {/* ZIP Code */}
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                ZIP Code
                <input
                  name="zipCode"
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="e.g. 8503"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#2166f3] focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2166f3] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 transition hover:bg-[#1a55d4] disabled:opacity-70 active:scale-[0.99]"
              >
                {isSubmitting && <Spinner />}
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
