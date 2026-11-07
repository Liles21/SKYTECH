'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wifi,
  Zap,
  Users,
  Coins,
  ShieldCheck,
  Smartphone,
  Check,
  MapPin,
  ArrowRight,
  Phone,
  Mail,
  Menu,
  X,
  Search,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { BookingModal } from './BookingModal';

type Props = {
  onLogin: () => void;
  onBook: () => void;
};

// Key barangays in Sibagat with coverage status
const SIBAGAT_ZONES = [
  { name: 'Poblacion', status: 'Active', coverage: '100% Pure Fiber', speed: 'Up to 300 Mbps', note: 'Central Network Hub' },
  { name: 'Mahayahay', status: 'Active', coverage: '100% Pure Fiber', speed: 'Up to 300 Mbps', note: 'High Density Residential' },
  { name: 'San Vicente', status: 'Active', coverage: '100% Pure Fiber', speed: 'Up to 200 Mbps', note: 'Fast Track Installation' },
  { name: 'El Rio', status: 'Active', coverage: '100% Pure Fiber', speed: 'Up to 200 Mbps', note: 'Pure Optical Lines' },
  { name: 'Afga', status: 'Active', coverage: '98% Fiber Ready', speed: 'Up to 200 Mbps', note: 'Highway Commercial & Home' },
  { name: 'Tabon-tabon', status: 'Active', coverage: '95% Fiber Ready', speed: 'Up to 100 Mbps', note: 'Direct Fiber Feed' },
  { name: 'Ilihan', status: 'Active', coverage: '95% Fiber Ready', speed: 'Up to 100 Mbps', note: 'Active Distribution Box' },
  { name: 'Sinai', status: 'Active', coverage: '92% Fiber Ready', speed: 'Up to 100 Mbps', note: 'Fast Fiber Access' },
  { name: 'Perez', status: 'Expanding', coverage: 'Expanding Q1', speed: 'Pre-booking Ready', note: 'Line Deployment Underway' },
  { name: 'Kauswagan', status: 'Expanding', coverage: 'Expanding Q1', speed: 'Pre-booking Ready', note: 'Line Deployment Underway' },
];

export function LandingPage({ onLogin }: Props) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('Fiber_50Mbps');
  const [prefilledAddress, setPrefilledAddress] = useState<string>('');
  const [prefilledBarangay, setPrefilledBarangay] = useState<string>('Poblacion');
  
  const [heroAddress, setHeroAddress] = useState<string>('');
  const [coverageAddress, setCoverageAddress] = useState<string>('');
  const [coverageResult, setCoverageResult] = useState<{
    tested: boolean;
    available: boolean;
    barangayName: string;
    message: string;
  } | null>(null);

  const [activeZone, setActiveZone] = useState<typeof SIBAGAT_ZONES[0]>(SIBAGAT_ZONES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Opens the application modal for a plan
  const openPlanModal = (planName: string) => {
    setSelectedPlan(planName);
    setIsModalOpen(true);
  };

  // Scrolls smoothly to the coverage & map section
  const scrollToCoverage = () => {
    const el = document.getElementById('check-coverage');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // When user checks address in Hero, scroll to coverage and run the check
  const handleHeroCheckAddress = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    scrollToCoverage();
    if (heroAddress.trim()) {
      runCoverageCheck(heroAddress);
    }
  };

  // Coverage search algorithm for Sibagat
  const runCoverageCheck = (query: string) => {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return;

    // Check if query matches any known Sibagat barangay
    const matched = SIBAGAT_ZONES.find((z) => cleanQuery.includes(z.name.toLowerCase()));

    if (matched) {
      setActiveZone(matched);
      setCoverageResult({
        tested: true,
        available: matched.status === 'Active',
        barangayName: matched.name,
        message:
          matched.status === 'Active'
            ? `Pure Fiber is ACTIVE in Barangay ${matched.name}, Sibagat! Speeds ${matched.speed} are ready for same-day dispatch.`
            : `Barangay ${matched.name}, Sibagat is in our current expansion phase. You can pre-book now to be connected first!`,
      });
      setPrefilledBarangay(matched.name);
      setPrefilledAddress(query);
    } else {
      // General Sibagat check
      const isSibagatOrAgusan =
        cleanQuery.includes('sibagat') ||
        cleanQuery.includes('agusan') ||
        cleanQuery.includes('purok') ||
        cleanQuery.includes('highway') ||
        cleanQuery.includes('street') ||
        cleanQuery.includes('st');

      if (isSibagatOrAgusan) {
        setCoverageResult({
          tested: true,
          available: true,
          barangayName: 'Sibagat Area',
          message: `Great news! Sky-Tech Fiber covers addresses in Sibagat, Agusan del Norte. Let us verify your exact pole connection.`,
        });
        setPrefilledAddress(query);
      } else {
        setCoverageResult({
          tested: true,
          available: true,
          barangayName: query,
          message: `Address received in Sibagat service area. Proceed to apply and our local dispatch team will verify the nearest fiber tap.`,
        });
        setPrefilledAddress(query);
      }
    }
  };

  
  // Scroll reveal observer
  useEffect(() => {
    const elements = document.querySelectorAll(
      '.reveal-on-scroll, .reveal-scale, .reveal-fade-left, .reveal-fade-right'
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleCoverageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCoverageCheck(coverageAddress);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* -------------------- NAVIGATION BAR -------------------- */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-white/75 backdrop-blur-md shadow-xs py-2 border-b border-slate-100/70'
            : 'bg-transparent py-3 sm:py-4 border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-6 sm:px-12 lg:px-16">
          {/* Logo */}
          <Link
            href="/landing-page"
            onClick={(e) => {
              setMobileMenuOpen(false);
              if (typeof window !== 'undefined') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (window.location.hash) {
                  window.history.pushState(null, '', '/landing-page');
                }
              }
            }}
            className="flex items-center gap-3 group cursor-pointer"
            aria-label="Sky-Tech Fiber Home"
          >
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-sky-400/90 bg-[#071329] shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
              <Image
                src="/images/Skytech.jpg"
                alt="Sky-Tech Fiber Logo"
                width={44}
                height={44}
                className="h-full w-full object-cover rounded-full scale-110"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">Sky-Tech</span>
              <span className="text-[10px] font-extrabold tracking-[0.22em] text-[#0284c7] uppercase">
                HOME FIBER · SIBAGAT
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a href="#why-sky-tech" className="text-sm font-semibold text-slate-600 transition hover:text-[#0284c7]">
              Why Sky-Tech
            </a>
            <a href="#fiber-plans" className="text-sm font-semibold text-slate-600 transition hover:text-[#0284c7]">
              Fiber Plans
            </a>
            <a href="#check-coverage" className="text-sm font-semibold text-slate-600 transition hover:text-[#0284c7]">
              Coverage & Map
            </a>
            <a href="#local-support" className="text-sm font-semibold text-slate-600 transition hover:text-[#0284c7]">
              Local Support
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden items-center gap-5 sm:flex">
            <button
              onClick={onLogin}
              className="text-sm font-semibold text-slate-700 transition hover:text-[#0284c7]"
            >
              Subscriber Sign In
            </button>
            <button
              onClick={scrollToCoverage}
              className="rounded-xl bg-[#0284c7] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition hover:bg-[#0369a1] active:scale-95"
            >
              Check Availability
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="mx-4 mt-2 rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md px-5 py-4 shadow-xl md:hidden">
            <nav className="flex flex-col gap-3">
              <a
                href="#why-sky-tech"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm font-semibold text-slate-700"
              >
                Why Sky-Tech
              </a>
              <a
                href="#fiber-plans"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm font-semibold text-slate-700"
              >
                Fiber Plans
              </a>
              <a
                href="#check-coverage"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm font-semibold text-slate-700"
              >
                Coverage & Map
              </a>
              <a
                href="#local-support"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm font-semibold text-slate-700"
              >
                Local Support
              </a>
              <hr className="my-2 border-slate-100" />
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogin();
                }}
                className="w-full text-left py-2 text-sm font-semibold text-slate-700"
              >
                Subscriber Sign In
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToCoverage();
                }}
                className="mt-2 w-full rounded-xl bg-[#0284c7] py-3 text-center text-sm font-bold text-white"
              >
                Check Availability
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* -------------------- HERO SECTION (IMAGE 1) -------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f8fafc] via-white to-white pt-8 pb-16 lg:pt-14 lg:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Hero Copy & Address Check */}
            <div className="lg:col-span-6 xl:col-span-7">
              {/* Feature Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                100% Fiber Optic Network · Sibagat, Agusan del Norte
              </div>

              {/* Headline */}
              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] lg:leading-[1.12]">
                Fast, honest home <br />
                fiber internet for <br />
                <span className="text-[#0284c7]">your family.</span>
              </h1>

              {/* Subtitle */}
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Say goodbye to lag, hidden price spikes, and overseas customer bots. Sky-Tech delivers ultra-reliable fiber backed by our friendly local team right here in Sibagat.
              </p>

              {/* Instant Fiber Availability Box */}
              <div className="mt-8 max-w-lg rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  CHECK INSTANT FIBER AVAILABILITY
                </label>
                <form onSubmit={handleHeroCheckAddress} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 transition focus-within:border-[#0284c7] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
                    <MapPin size={18} className="shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={heroAddress}
                      onChange={(e) => setHeroAddress(e.target.value)}
                      placeholder="Enter your Barangay or Street in Sibagat..."
                      style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                      className="ml-2 w-full border-0 border-none bg-transparent p-0 text-sm text-slate-800 placeholder-slate-400 outline-none ring-0 shadow-none focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:shadow-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0284c7] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-sky-500/20 transition hover:bg-[#0369a1] active:scale-95"
                  >
                    Check Address <ArrowRight size={15} />
                  </button>
                </form>
              </div>

              {/* Value Propositions List */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Check size={16} className="text-[#0284c7] stroke-[3]" />
                  <span>Plans starting at ₱599/mo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={16} className="text-[#0284c7] stroke-[3]" />
                  <span>No lock-in contract options</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check size={16} className="text-[#0284c7] stroke-[3]" />
                  <span>Free Wi-Fi 6 Router Installation</span>
                </div>
              </div>
            </div>

            {/* Right Column: Sky-Tech Hero Showcase Card */}
            <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
              <div className="w-full max-w-xs sm:max-w-sm">
                <div className="relative overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-b from-[#0a192f] via-[#0b1d3a] to-[#071329] p-6 sm:p-7 shadow-xl text-center text-white">
                  <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />

                  <div className="relative mx-auto flex justify-center">
                    <div className="relative">
                      <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-600 opacity-60 blur-md animate-pulse" />
                      <div className="relative h-28 w-48 sm:h-32 sm:w-56 overflow-hidden rounded-2xl border-2 border-sky-400/90 bg-[#071329] shadow-xl flex items-center justify-center p-2 transition-transform duration-300 hover:scale-[1.02]">
                        <Image
                          src="/images/Skytech.jpg"
                          alt="Sky-Tech Fiber Internet"
                          width={240}
                          height={140}
                          className="h-full w-full object-contain rounded-xl"
                          priority
                        />
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-4 space-y-1">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-sky-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Pure Fiber Network
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white pt-1">
                      Sky-Tech Fiber
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">
                      Fast · Stable · Connected in Sibagat
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- STATS STRIP SECTION -------------------- */}
      <section className="border-y border-slate-100 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4 md:divide-x md:divide-slate-100">
            <div>
              <p className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">0</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Local Homes Connected</p>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-[#0284c7] sm:text-4xl">99.9%</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Guaranteed Uptime</p>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">&lt; 15 mins</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Support Call Response</p>
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">24 / 7</p>
              <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Sibagat Tech Dispatch</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- WHY SKY-TECH SECTION (IMAGE 2) -------------------- */}
      <section id="why-sky-tech" className="bg-[#f8fafc] py-20 lg:py-28 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center reveal-on-scroll">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#0284c7]">
              WHY SKY-TECH FIBER
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Built for real homes. Backed by real neighbors.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
              We built the internet provider we always wished we had in Sibagat—no fine-print tricks, constant dropouts, or impersonal phone menus.
            </p>
          </div>

          {/* 6 Feature Cards Grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-[#0284c7]">
                <Zap size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900">Dedicated Pure Fiber</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                Direct fiber-optic connection straight into your home. Equal upload and download speeds so gaming, video calling, and working from home never lag.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-[#0284c7]">
                <Users size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900">24/7 Local Support</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                When you call us, you speak directly to our local technicians in Sibagat. No automated loops or overseas call centers.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-[#0284c7]">
                <Coins size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900">Transparent Pricing</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                What you see is what you pay. No unexpected bill increases after 6 months, no modem rental hidden surcharges, and zero setup fee surprises.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-[#0284c7]">
                <ShieldCheck size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900">No Lock-In Flexibility</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                We believe in earning your trust every month. Choose our standard month-to-month plan or save more with annual commitments—your choice.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-[#0284c7]">
                <Smartphone size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900">Easy Account App</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                Pay bills in one tap, test your live home speeds, request support, or manage Wi-Fi settings from a simple mobile subscriber portal.
              </p>
            </div>

            {/* Card 6 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-[#0284c7]">
                <Wifi size={24} />
              </div>
              <h3 className="mt-6 text-lg font-bold text-slate-900">Wi-Fi 6 Router Included</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                Get latest-generation dual-band Wi-Fi 6 hardware installed free of charge to eliminate dead spots in every room.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FIBER PLANS SECTION (IMAGE 3) -------------------- */}
      <section id="fiber-plans" className="bg-white py-20 lg:py-28 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center reveal-on-scroll">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#0284c7]">
              STRAIGHTFORWARD PRICING
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              A fiber plan for every household size.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 sm:text-base">
              All plans include unlimited data, free installation, and high-speed Wi-Fi 6 router.
            </p>

            {/* Monthly / Annual Toggle Switch */}
            <div className="mt-8 flex justify-center">
              <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs font-semibold sm:text-sm">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full px-5 py-2 transition ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Month-to-Month
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-full px-5 py-2 transition ${
                    billingCycle === 'annual'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual (Save 10%)
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-3">
            {/* Plan 1: Fiber Starter */}
            <div style={{ transitionDelay: '0ms' }} className="reveal-scale flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md sm:p-8">
              <div>
                <span className="inline-block rounded-full bg-slate-100 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  FIBER STARTER
                </span>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-900">25 Mbps</span>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Ideal for small apartments & basic browsing
                  </p>
                </div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">
                    ₱{billingCycle === 'annual' ? '539' : '599'}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Billed monthly • No contract</p>

                <hr className="my-6 border-slate-100" />

                <ul className="space-y-3.5 text-xs sm:text-sm font-medium text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>25 Mbps equal Upload & Download</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Unlimited High-Speed Data</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Free Installation & Standard Router</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>24/7 Local Customer Support</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => openPlanModal('Fiber_25Mbps')}
                className="mt-8 block w-full rounded-xl bg-slate-100 py-3.5 text-center text-sm font-bold text-slate-800 transition hover:bg-slate-200 active:scale-95"
              >
                Choose 25 Mbps
              </button>
            </div>

            {/* Plan 2: Home Plus (Featured Center Card) */}
            <div style={{ transitionDelay: '100ms' }} className="reveal-scale relative flex flex-col justify-between rounded-3xl border-2 border-[#0284c7] bg-white p-7 shadow-xl shadow-sky-500/10 sm:p-8">
              {/* Highlight Tag */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0284c7] px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                MOST POPULAR FOR FAMILIES
              </div>

              <div>
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#0284c7]">
                  HOME PLUS
                </span>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-900">50 Mbps</span>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Perfect for 4K streaming & multiple devices
                  </p>
                </div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#0284c7]">
                    ₱{billingCycle === 'annual' ? '719' : '799'}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Billed monthly • No lock-in</p>

                <hr className="my-6 border-slate-100" />

                <ul className="space-y-3.5 text-xs sm:text-sm font-medium text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>50 Mbps equal Upload & Download</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Unlimited High-Speed Data</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Free Wi-Fi 6 Router Upgrade</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Priority Same-Day Tech Dispatch</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => openPlanModal('Fiber_50Mbps')}
                className="mt-8 block w-full rounded-xl bg-[#0284c7] py-3.5 text-center text-sm font-bold text-white shadow-md shadow-sky-500/25 transition hover:bg-[#0369a1] active:scale-95"
              >
                Get 50 Mbps Now
              </button>
            </div>

            {/* Plan 3: Max Ultra */}
            <div style={{ transitionDelay: '200ms' }} className="reveal-scale flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md sm:p-8">
              <div>
                <span className="inline-block rounded-full bg-slate-100 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  MAX ULTRA
                </span>
                <div className="mt-4">
                  <span className="text-3xl font-black text-slate-900">100 Mbps</span>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Heavy gaming, remote work & smart homes
                  </p>
                </div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">
                    ₱{billingCycle === 'annual' ? '899' : '999'}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">/ month</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Billed monthly • No contract</p>

                <hr className="my-6 border-slate-100" />

                <ul className="space-y-3.5 text-xs sm:text-sm font-medium text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>100 Mbps Ultra-Low Latency</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Unlimited High-Speed Data</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Wi-Fi 6 Mesh Ready Hardware</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={17} className="text-emerald-500 stroke-[2.5]" />
                    <span>Dedicated Account Specialist</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => openPlanModal('Fiber_100Mbps')}
                className="mt-8 block w-full rounded-xl bg-slate-100 py-3.5 text-center text-sm font-bold text-slate-800 transition hover:bg-slate-200 active:scale-95"
              >
                Choose 100 Mbps
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- COVERAGE & INTERACTIVE MAP SECTION (IMAGE 4 ENHANCED) -------------------- */}
      <section id="check-coverage" className="bg-[#0284c7] py-20 text-white scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center reveal-on-scroll">
            <span className="inline-block rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
              FIBER NETWORK MAP · SIBAGAT, AGUSAN DEL NORTE
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Check if Sky-Tech Fiber has <br className="hidden sm:inline" />
              reached your street.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
              Sky-Tech is locally headquartered in Sibagat. Type your barangay or street below, or explore the live coverage map to see real-time fiber availability.
            </p>

            {/* Address Search Form */}
            <form onSubmit={handleCoverageSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-2xl sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center px-3">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={coverageAddress}
                  onChange={(e) => setCoverageAddress(e.target.value)}
                  placeholder="e.g. Poblacion, Mahayahay, San Vicente, El Rio..."
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  className="w-full border-0 border-none bg-transparent px-3 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none ring-0 shadow-none focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:shadow-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[#0f172a] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#1e293b] active:scale-95"
              >
                Check Coverage
              </button>
            </form>

            {/* Instant Search Result Feedback */}
            {coverageResult && (
              <div className="mx-auto mt-6 max-w-xl animate-fadeIn">
                <div
                  className={`rounded-2xl p-5 text-left border ${
                    coverageResult.available
                      ? 'bg-emerald-500/15 border-emerald-300/40 text-white'
                      : 'bg-amber-500/15 border-amber-300/40 text-white'
                  } backdrop-blur-md shadow-xl`}
                >
                  <div className="flex items-start gap-3.5">
                    {coverageResult.available ? (
                      <CheckCircle className="h-6 w-6 text-emerald-300 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-300 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-extrabold text-base">
                        {coverageResult.available ? '✓ Fiber Available!' : 'Upcoming Expansion Area'}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm text-blue-50 leading-relaxed">
                        {coverageResult.message}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        <button
                          onClick={() => {
                            setPrefilledBarangay(coverageResult.barangayName);
                            setPrefilledAddress(coverageAddress || coverageResult.barangayName);
                            setIsModalOpen(true);
                          }}
                          className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#0284c7] shadow-sm hover:bg-blue-50 transition"
                        >
                          Apply for this Address →
                        </button>
                        <button
                          onClick={() => setCoverageResult(null)}
                          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 transition"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ----------------- INTERACTIVE SIBAGAT MAP & ZONE EXPLORER ----------------- */}
          <div className="reveal-scale mt-14 rounded-3xl border border-white/20 bg-slate-900/60 p-4 sm:p-7 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left / Top: Interactive Map View of Sibagat */}
              <div className="lg:w-7/12 flex flex-col">
                <div className="flex items-center justify-between pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold uppercase tracking-wider text-emerald-300">
                      Live Fiber Grid: Sibagat, Agusan del Norte
                    </span>
                  </div>
                  <span className="text-blue-200">Coords: 8.8211° N, 125.6980° E</span>
                </div>

                {/* Map Container */}
                <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-inner">
                  {/* Real OpenStreetMap centered on Sibagat, Agusan del Norte */}
                  <iframe
                    title="Sky-Tech Sibagat Fiber Coverage Map"
                    width="100%"
                    height="100%"
                    className="border-0 w-full h-full"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=125.6400%2C8.7800%2C125.7600%2C8.8650&amp;layer=mapnik&amp;marker=8.8211%2C125.6980"
                  />

                  {/* Sky-Tech Central Station Overlay Badge */}
                  <div className="absolute top-3 left-3 rounded-xl bg-slate-900/90 border border-sky-400/30 p-2.5 shadow-lg backdrop-blur-md text-left">
                    <div className="flex items-center gap-2">
                      <div className="grid h-6 w-6 place-items-center rounded-lg bg-[#0284c7] text-white">
                        <Wifi size={13} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-white leading-tight">Sky-Tech Central Hub</p>
                        <p className="text-[9px] text-sky-300">Poblacion, Sibagat, Agusan</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Selected Zone Floating Card */}
                  <div className="absolute bottom-3 right-3 left-3 sm:left-auto rounded-xl bg-slate-900/95 border border-white/20 p-3 shadow-xl backdrop-blur-md text-left max-w-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{activeZone.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeZone.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {activeZone.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {activeZone.coverage} · {activeZone.speed}
                    </p>
                    <button
                      onClick={() => {
                        setPrefilledBarangay(activeZone.name);
                        setIsModalOpen(true);
                      }}
                      className="mt-2.5 w-full rounded-lg bg-[#0284c7] hover:bg-[#0369a1] py-1.5 text-center text-xs font-bold text-white transition shadow"
                    >
                      Apply for {activeZone.name} →
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-right text-[11px] text-blue-200/70">
                  <a
                    href="https://www.openstreetmap.org/?mlat=8.8211&mlon=125.6980#map=13/8.8211/125.6980"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-white transition"
                  >
                    View larger map on OpenStreetMap <ExternalLink size={12} />
                  </a>
                </p>
              </div>

              {/* Right / Bottom: Barangay Zones Selector */}
              <div className="lg:w-5/12 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Covered Barangays in Sibagat</h3>
                  <p className="mt-1 text-xs text-blue-100">
                    Click any barangay to inspect network status or apply for instant installation:
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {SIBAGAT_ZONES.map((zone) => {
                      const isSelected = activeZone.name === zone.name;
                      return (
                        <button
                          key={zone.name}
                          type="button"
                          onClick={() => {
                            setActiveZone(zone);
                            setPrefilledBarangay(zone.name);
                          }}
                          className={`rounded-xl p-2.5 text-left transition border ${
                            isSelected
                              ? 'bg-[#0284c7] border-white text-white shadow-lg'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{zone.name}</span>
                            <span
                              className={`h-2 w-2 rounded-full ${
                                zone.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                            />
                          </div>
                          <p className={`mt-1 text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                            {zone.coverage}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Apply Action Box */}
                <div className="mt-5 rounded-2xl bg-white/10 border border-white/15 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Selected: {activeZone.name}</p>
                      <p className="text-[11px] text-blue-200">{activeZone.note}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPrefilledBarangay(activeZone.name);
                        setIsModalOpen(true);
                      }}
                      className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#0284c7] shadow hover:bg-blue-50 transition active:scale-95"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FOOTER (IMAGE 4) -------------------- */}
      <footer id="local-support" className="bg-[#0b1120] text-slate-400 pt-16 pb-12 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="reveal-on-scroll grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Column 1: Brand */}
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0284c7] text-white">
                  <Wifi size={20} strokeWidth={2.4} />
                </div>
                <span className="text-lg font-black text-white">Sky-Tech ISP</span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-400 sm:text-sm">
                Providing fast, transparent, and ultra-reliable fiber internet for local homes and businesses in Sibagat and surrounding Agusan communities.
              </p>
            </div>

            {/* Column 2: Fiber Internet */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">FIBER INTERNET</p>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm">
                <li>
                  <a href="#fiber-plans" className="transition hover:text-white">
                    Home Fiber Plans
                  </a>
                </li>
                <li>
                  <a href="#check-coverage" className="transition hover:text-white">
                    Sibagat Coverage Map
                  </a>
                </li>
                <li>
                  <a href="#why-sky-tech" className="transition hover:text-white">
                    Why Choose Fiber
                  </a>
                </li>
                <li>
                  <a href="#fiber-plans" className="transition hover:text-white">
                    Speed Test Portal
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Customer Support */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">CUSTOMER SUPPORT</p>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm">
                <li>
                  <button onClick={onLogin} className="transition hover:text-white text-left">
                    Subscriber Login
                  </button>
                </li>
                <li>
                  <button onClick={onLogin} className="transition hover:text-white text-left">
                    Pay Bill Online
                  </button>
                </li>
                <li>
                  <a href="#why-sky-tech" className="transition hover:text-white">
                    Help Center & FAQs
                  </a>
                </li>
                <li>
                  <a href="#check-coverage" className="transition hover:text-white">
                    Network Status Page
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Local Office (Sibagat) */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">LOCAL OFFICE</p>
              <ul className="mt-4 space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2.5 text-slate-300">
                  <MapPin size={16} className="text-[#0284c7] shrink-0" />
                  <span>Poblacion, Sibagat, Agusan del Norte</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <Mail size={16} className="text-[#0284c7] shrink-0" />
                  <span>support@skytech-fiber.com</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-300">
                  <Phone size={16} className="text-[#0284c7] shrink-0" />
                  <span>Hotline: (085) 800-SKYTECH / 0917-123-4567</span>
                </li>
                <li className="pt-2 text-xs text-slate-400 leading-relaxed">
                  Open Mon-Sat: 8:00 AM - 6:00 PM <br />
                  24/7 Technical Dispatch in Sibagat Area
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Legal Links */}
          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-8 text-xs text-slate-500 sm:flex-row">
            <p>© 2026 Sky-Tech ISP Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-slate-400">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400">Terms of Service</a>
              <a href="#" className="hover:text-slate-400">Fair Use Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* -------------------- COMPACT APPLY MODAL (IMAGE 5) -------------------- */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPlan={selectedPlan}
        initialAddress={prefilledAddress}
        initialBarangay={prefilledBarangay}
      />
    </div>
  );
}
