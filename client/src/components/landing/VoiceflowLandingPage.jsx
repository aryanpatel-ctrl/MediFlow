import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  ImageIcon,
  LayoutPanelTop,
  LineChart,
  Menu,
  MessageSquarePlus,
  Newspaper,
  PartyPopper,
  PhoneCall,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";

const everydayFeatures = [
  "People directory",
  "Calls and transcripts",
  "Onboarding automations",
  "Phone number routing",
  "Campaign orchestration",
  "Compliance logs",
];

const growthFeatures = [
  "Agent scorecards",
  "Campaign goals",
  "Forms and QA checks",
  "Skills tracking",
  "Performance reviews",
  "Analytics",
];

function SectionIntro({ eyebrow, title, copy }) {
  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3f4f76]">
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl font-semibold leading-[0.95] text-[#131722] sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      <p className="max-w-2xl text-lg leading-relaxed text-slate-600">{copy}</p>
    </div>
  );
}

function DashboardShowcase() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_32px_90px_rgba(23,28,45,0.18)]">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="ml-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          app.voiceflowpro.com/dashboard
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[220px_1fr] md:p-6">
        <aside className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Menu
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="rounded-xl bg-[#182b4f] px-3 py-2 font-medium text-white">
              Dashboard
            </div>
            <div className="rounded-xl px-3 py-2 text-slate-600">Calls</div>
            <div className="rounded-xl px-3 py-2 text-slate-600">
              Agent Canvas
            </div>
            <div className="rounded-xl px-3 py-2 text-slate-600">Campaigns</div>
            <div className="rounded-xl px-3 py-2 text-slate-600">Analytics</div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold text-[#121927]">
                Good evening, check check
              </p>
              <p className="text-sm text-slate-500">
                Here is what is happening with your voice agents today.
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              2 Live Calls
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Total Calls
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#111827]">
                1,248
              </p>
              <p className="text-sm text-emerald-600">+18% vs last week</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Avg. Duration
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#111827]">3:06</p>
              <p className="text-sm text-rose-600">-6% vs last week</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Success Rate
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#111827]">94%</p>
              <p className="text-sm text-emerald-600">+4% vs last week</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Active Agents
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#111827]">7</p>
              <p className="text-sm text-emerald-600">+2 vs last week</p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-[#111827]">
                Recent Calls
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-700">
                    +1 (415) 555-0101 · Completed
                  </p>
                  <p className="text-xs text-slate-500">6 min ago</p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-700">
                    +1 (415) 555-0102 · Missed
                  </p>
                  <p className="text-xs text-slate-500">18 min ago</p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
                  <p className="text-sm font-medium text-slate-700">
                    +1 (415) 555-0105 · In Progress
                  </p>
                  <p className="text-xs text-slate-500">2 min ago</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-semibold text-[#111827]">
                Quick Actions
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  Create New Agent
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  View Analytics
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  Manage Team
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasShowcase() {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_28px_70px_rgba(24,31,49,0.15)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm">
        <p className="font-semibold text-[#1a2436]">Real Estate Inquiry</p>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Saved 21:18
        </div>
      </div>
      <div className="grid gap-3 p-3 md:grid-cols-[170px_1fr_220px] md:p-4">
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="rounded-lg bg-white px-2 py-2 text-sm font-medium text-slate-700">
            Start
          </div>
          <div className="rounded-lg bg-white px-2 py-2 text-sm font-medium text-slate-700">
            Conversation
          </div>
          <div className="rounded-lg bg-white px-2 py-2 text-sm font-medium text-slate-700">
            Transfer
          </div>
          <div className="rounded-lg bg-white px-2 py-2 text-sm font-medium text-slate-700">
            End
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-200 bg-[#fcfcff] p-4">
          <div className="absolute inset-0 bg-[radial-gradient(#d9dce7_1px,transparent_1px)] opacity-40 [background-size:14px_14px]" />
          <div className="relative grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-800">Start</p>
              <p className="mt-1 text-xs text-emerald-700">
                Greeting and intent warm-up
              </p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <p className="text-sm font-semibold text-violet-800">
                Qualify Intent
              </p>
              <p className="mt-1 text-xs text-violet-700">
                Buyer, seller, renter routing
              </p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <p className="text-sm font-semibold text-sky-800">
                Search Listings
              </p>
              <p className="mt-1 text-xs text-sky-700">HTTP + Speak + Wait</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-800">
                Transfer to Agent
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Warm transfer fallback
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-[#1a2436]">Properties</p>
          <div className="mt-2 space-y-2">
            <div className="rounded-lg bg-white p-2 text-xs text-slate-600">
              Label: Qualify Intent
            </div>
            <div className="rounded-lg bg-white p-2 text-xs text-slate-600">
              Mode: Prompt
            </div>
            <div className="rounded-lg bg-white p-2 text-xs text-slate-600">
              Model: GPT-4o mini
            </div>
            <div className="rounded-lg bg-white p-2 text-xs text-slate-600">
              Temperature: 0.7
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GrowthShowcase() {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-[0_26px_70px_rgba(20,26,40,0.14)]">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-[#1a2436]">1:1 Weekly</p>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Highlights
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Customer intake performance improved after call-transfer routing
              update.
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Focus Next Week
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Improve callback coverage during lunch-hour spike.
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Owner
            </p>
            <p className="mt-2 text-sm text-slate-700">check_00</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-[#dff9f7] via-white to-[#f4fffe] p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
            Score Snapshot
          </p>
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
              Agent quality: 92%
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
              Campaign hit rate: 88%
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
              Live call pickups: 97%
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-[#d7f4ff] p-3 text-sm text-slate-700">
            Auto-generated notes are ready for review.
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamCultureShowcase() {
  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-2">
      <div className="grid gap-5">
        <article className="overflow-hidden rounded-[28px] border border-[#a2d6f4] bg-[#bde7ff] transition-transform duration-300 hover:-translate-y-1">
          <div className="p-6 sm:p-7">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#7ebde2] bg-[#c8ebff] text-[#12395a]">
              <Newspaper className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-5xl font-semibold leading-none text-[#121e33]">
              Posts
            </h3>
            <p className="mt-4 max-w-md text-xl leading-relaxed text-[#143858]/90">
              Keep everyone in the loop with thoughtful, timely updates, big or
              small.
            </p>
          </div>

          <div className="rounded-t-[24px] bg-white p-6 shadow-[0_-12px_40px_rgba(14,36,59,0.12)]">
            <p className="text-xl text-slate-400">1h ago</p>
            <p className="mt-1 font-display text-5xl font-semibold leading-none text-[#141c2d]">
              It&apos;s launch day
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#f4a28c] via-[#8a5a42] to-[#1e324a]" />
              <div>
                <p className="text-2xl font-semibold leading-none text-[#111827]">
                  Ava Williams
                </p>
                <p className="mt-1 text-xl text-slate-500">Office Manager</p>
              </div>
            </div>

            <p className="mt-5 text-2xl leading-relaxed text-slate-700">
              Today&apos;s the day. We&apos;re launching the new routing setup.
              Here&apos;s a quick guide to help everything run smoothly.
            </p>
            <p className="mt-4 text-xl font-semibold text-[#253042]">
              Arrival and Access
            </p>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[28px] border border-[#ccb8ef] bg-[#dac8ff] p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7">
          <div className="relative z-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#9a82c8] bg-[#e3d7ff] text-[#3a2b58]">
              <LayoutPanelTop className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-5xl font-semibold leading-none text-[#1d1733]">
              Operator portal
            </h3>
            <p className="mt-4 max-w-md text-xl leading-relaxed text-[#3f3365]/90">
              A personal space for every teammate to access scripts, runbooks,
              and updates anytime.
            </p>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%]">
            <div className="absolute bottom-0 left-[-12%] h-64 w-64 rounded-full bg-[#cfb3f6]" />
            <div className="absolute bottom-0 left-[18%] h-72 w-72 rounded-full bg-[#c4a5f2]" />
            <div className="absolute bottom-0 right-[-8%] h-60 w-60 rounded-full bg-[#d3bcf8]" />
            <div className="absolute bottom-2 left-[28%] flex h-40 w-40 items-center justify-center rounded-full bg-[#af84ee] text-[#20153d]">
              <Smile className="h-16 w-16" />
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-5">
        <article className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-[#273652] transition-transform duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-b from-[#4f87b8] via-[#253f61] to-[#101723]" />
          <div className="absolute left-[-10%] top-[-20%] h-44 w-56 rotate-[-18deg] border-b-4 border-[#0e1218]/60" />
          <div className="absolute right-[-12%] top-[8%] h-36 w-56 rotate-[22deg] border-b-4 border-[#121923]/70" />
          <div className="absolute bottom-0 left-[-8%] h-48 w-48 rounded-full bg-[#1a1e25]" />
          <div className="absolute bottom-0 left-[17%] h-56 w-40 rounded-[42%] bg-[#11161e]" />
          <div className="absolute bottom-0 left-[44%] h-64 w-44 rounded-[44%] bg-[#0f151d]" />
          <div className="absolute bottom-0 right-[-6%] h-52 w-36 rounded-[46%] bg-[#18202a]" />
          <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-[#080c12] via-[#0b0f16]/80 to-transparent" />

          <div className="relative flex h-full flex-col justify-end p-6 sm:p-7">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white">
              <PartyPopper className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-5xl font-semibold leading-none text-white">
              Events
            </h3>
            <p className="mt-4 max-w-md text-2xl leading-relaxed text-white/90">
              Plan internal moments that feel like something to look forward to.
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-[28px] border border-[#dfcf6b] bg-[#ffe87a] p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#b8942b] bg-[#ffe89b] text-[#463106]">
            <ImageIcon className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-5xl font-semibold leading-none text-[#1b1b15]">
            Media library
          </h3>
          <p className="mt-4 max-w-md text-xl leading-relaxed text-[#382f16]/90">
            Bring your culture to life through the faces, moments, and memories
            your team shares.
          </p>

          <div className="mx-auto mt-8 max-w-[320px] rounded-[2.4rem] border-[8px] border-[#121826] bg-[#121826] p-1 shadow-[0_20px_40px_rgba(39,31,8,0.3)]">
            <div className="overflow-hidden rounded-[1.8rem] bg-white">
              <div className="flex items-center justify-between px-4 pb-2 pt-3 text-xs font-semibold text-slate-500">
                <span>9:41</span>
                <span className="h-3.5 w-16 rounded-full bg-slate-900" />
                <span>LTE</span>
              </div>
              <div className="px-4 pb-4">
                <p className="text-center text-sm font-semibold text-slate-700">
                  Photos
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Recent
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="h-14 rounded-lg bg-[#d0b093]" />
                  <div className="h-14 rounded-lg bg-[#c1d7e9]" />
                  <div className="h-14 rounded-lg bg-[#8db4d4]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-500">
                  Albums
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="h-12 rounded-lg bg-[#ead4b6]" />
                  <div className="h-12 rounded-lg bg-[#bedfc4]" />
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

export default function VoiceflowLandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="bg-[#f5f4f1] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#f5f4f1]/90 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="/" className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1a2744] text-white shadow-lg shadow-[#1a2744]/25">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight text-[#111827]">
              VoiceFlowPro
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            <a href="#product" className="transition-colors hover:text-slate-900">
              Product
            </a>
            <a href="#culture" className="transition-colors hover:text-slate-900">
              Team Culture
            </a>
            <a href="#growth" className="transition-colors hover:text-slate-900">
              Growth
            </a>
            <a href="#pricing" className="transition-colors hover:text-slate-900">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#pricing"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 sm:inline-flex"
            >
              Sign in
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-full bg-[#d9eeff] px-4 py-2 text-sm font-semibold text-[#0a76ce] transition hover:-translate-y-0.5"
            >
              Try for free
            </a>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 lg:hidden"
              aria-label="Open navigation"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {isMobileMenuOpen ? (
          <div
            id="mobile-nav"
            className="border-t border-slate-200 bg-[#f5f4f1] px-4 py-3 lg:hidden"
          >
            <nav className="mx-auto flex max-w-6xl flex-col gap-2 text-sm font-medium text-slate-700 sm:px-2">
              <a
                href="#product"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Product
              </a>
              <a
                href="#culture"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Team Culture
              </a>
              <a
                href="#growth"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Growth
              </a>
              <a
                href="#pricing"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#pricing"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign in
              </a>
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute -left-36 top-10 h-80 w-80 rounded-full bg-[#d8ecff] blur-3xl" />
          <div className="absolute -right-28 top-24 h-72 w-72 rounded-full bg-[#f7d8ea] blur-3xl" />

          <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:pb-20 lg:pt-24">
            <div className="landing-appear mx-auto max-w-3xl text-center">
              <h1 className="font-display text-5xl font-semibold leading-[0.9] tracking-tight text-[#131722] sm:text-6xl lg:text-7xl">
                Run voice operations.
                <span className="block text-[#2b6cb0]">With confidence.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
                Bring all your people and call data into one place. Build,
                monitor, and improve AI agents with a workflow your team
                actually enjoys using.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0a84df] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0a84df]/30 transition hover:-translate-y-0.5"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#product"
                  className="inline-flex rounded-full bg-[#d7ecff] px-6 py-3 text-sm font-semibold text-[#0a76ce] transition hover:-translate-y-0.5"
                >
                  Book a demo
                </a>
              </div>
            </div>

            <div className="landing-appear mt-12 rounded-[34px] bg-[#f4cbe1] p-4 sm:p-7">
              <DashboardShowcase />
            </div>
          </div>
        </section>

        <section id="product" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-4xl font-semibold leading-tight text-[#131722] sm:text-5xl">
                Built for people, not just the process around them.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <PhoneCall className="h-8 w-8 text-[#0a84df]" />
                <p className="mt-4 text-lg font-semibold text-[#131722]">
                  Day-to-day operations
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  One place for calls, campaigns, transcripts, and fast
                  follow-ups.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <Users className="h-8 w-8 text-[#f59e0b]" />
                <p className="mt-4 text-lg font-semibold text-[#131722]">
                  Shared team alignment
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Keep everyone on the same runbook with clear ownership and
                  status.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <Workflow className="h-8 w-8 text-[#14b8a6]" />
                <p className="mt-4 text-lg font-semibold text-[#131722]">
                  Scale with clarity
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Build reusable flows and safely ship updates as volume grows.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
            <div className="self-center">
              <SectionIntro
                eyebrow="Everyday HR"
                title="All the basics, done beautifully."
                copy="From intake to handoff, VoiceFlow Pro keeps your daily operations clear and calm. Every important action is one click away."
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {everydayFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    <BadgeCheck className="h-4 w-4 text-[#2b6cb0]" />
                    {feature}
                  </div>
                ))}
              </div>
              <a
                href="#culture"
                className="mt-8 inline-flex rounded-full bg-[#dacbff] px-5 py-3 text-sm font-semibold text-[#4c3c80] transition hover:-translate-y-0.5"
              >
                Learn more
              </a>
            </div>

            <div className="rounded-[34px] bg-[#dcd2ff] p-4 sm:p-6">
              <CanvasShowcase />
            </div>
          </div>
        </section>

        <section id="culture" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#cd7b2f]">
                Team culture
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-[0.95] text-[#131722] sm:text-6xl">
                Belong together.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                Keep everyone in sync with updates, shared context, and
                celebration moments that make operations feel human.
              </p>
            </div>

            <TeamCultureShowcase />
          </div>
        </section>

        <section id="growth" className="py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
            <div className="self-center">
              <SectionIntro
                eyebrow="Growth and feedback"
                title="Grow your people."
                copy="Support agents and operators with clear goals, recurring reviews, and live coaching loops informed by real conversation data."
              />

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {growthFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    <LineChart className="h-4 w-4 text-[#0e8f84]" />
                    {feature}
                  </div>
                ))}
              </div>

              <a
                href="#pricing"
                className="mt-8 inline-flex rounded-full bg-[#d1f3f0] px-5 py-3 text-sm font-semibold text-[#0e8f84] transition hover:-translate-y-0.5"
              >
                Explore analytics
              </a>
            </div>

            <div className="rounded-[34px] bg-[#c8f0ef] p-4 sm:p-6">
              <GrowthShowcase />
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-[36px] border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(15,21,34,0.08)] sm:px-12">
              <h2 className="font-display text-4xl font-semibold text-[#131722] sm:text-5xl">
                Ready to get started?
              </h2>
              <p className="mt-3 text-xl text-slate-500">
                Launch in less than a week.
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <ShieldCheck className="h-5 w-5 text-[#2d5d9b]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    All included
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Full access with no hidden add-ons.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <Clock3 className="h-5 w-5 text-[#2d5d9b]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    No setup fees
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Transparent pricing from day one.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <Sparkles className="h-5 w-5 text-[#2d5d9b]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    Fast setup
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Live quickly with onboarding support.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <MessageSquarePlus className="h-5 w-5 text-[#2d5d9b]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    Real support
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Talk to humans when you need help.
                  </p>
                </div>
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-full bg-[#0a84df] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0a84df]/30 transition hover:-translate-y-0.5"
                >
                  Try for free
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#product"
                  className="inline-flex rounded-full bg-[#d9eeff] px-6 py-3 text-sm font-semibold text-[#0a76ce] transition hover:-translate-y-0.5"
                >
                  Book a demo
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>VoiceFlowPro Inc.</p>
          <div className="flex flex-wrap gap-6">
            <a href="#pricing" className="transition-colors hover:text-slate-800">
              Pricing
            </a>
            <a href="#product" className="transition-colors hover:text-slate-800">
              Terms
            </a>
            <a href="#growth" className="transition-colors hover:text-slate-800">
              Data protection
            </a>
          </div>
          <p>© 2026 VoiceFlowPro</p>
        </div>
      </footer>
    </div>
  );
}
