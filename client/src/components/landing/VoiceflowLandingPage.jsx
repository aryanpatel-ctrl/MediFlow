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
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
  Workflow,
  X,
  Calendar,
  Stethoscope,
  Activity,
  Heart,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import "./LandingPage.css";

const everydayFeatures = [
  "Patient directory",
  "Appointment scheduling",
  "Doctor management",
  "Queue management",
  "Prescription tracking",
  "Medical records",
];

const growthFeatures = [
  "Patient analytics",
  "Department metrics",
  "Staff performance",
  "Inventory tracking",
  "Revenue reports",
  "Wait time analysis",
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
    <div style={{ overflow: 'hidden', borderRadius: '28px', border: '1px solid rgba(226,232,240,0.9)', backgroundColor: 'white', boxShadow: '0 32px 90px rgba(23,28,45,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', padding: '12px 20px' }}>
        <div style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
        <div style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
        <div style={{ height: '10px', width: '10px', borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
        <div style={{ marginLeft: '16px', borderRadius: '9999px', backgroundColor: '#f1f5f9', padding: '4px 12px', fontSize: '12px', fontWeight: '500', color: '#64748b' }}>
          app.mediflow.com/dashboard
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '16px', padding: '24px' }}>
        <aside style={{ borderRadius: '16px', border: '1px solid #f1f5f9', backgroundColor: 'rgba(248,250,252,0.7)', padding: '12px' }}>
          <p style={{ padding: '0 8px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#64748b' }}>
            Menu
          </p>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
            <div style={{ borderRadius: '12px', backgroundColor: '#182b4f', padding: '8px 12px', fontWeight: '500', color: 'white' }}>
              Dashboard
            </div>
            <div style={{ borderRadius: '12px', padding: '8px 12px', color: '#475569' }}>Appointments</div>
            <div style={{ borderRadius: '12px', padding: '8px 12px', color: '#475569' }}>Patients</div>
            <div style={{ borderRadius: '12px', padding: '8px 12px', color: '#475569' }}>Doctors</div>
            <div style={{ borderRadius: '12px', padding: '8px 12px', color: '#475569' }}>Queue</div>
          </div>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#121927' }}>
                Good morning, Dr. Smith
              </p>
              <p style={{ fontSize: '14px', color: '#64748b' }}>
                Here is what is happening at your hospital today.
              </p>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: '9999px', backgroundColor: '#ecfdf5', padding: '6px 12px', fontSize: '14px', fontWeight: '500', color: '#047857' }}>
              12 In Queue
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
                Today&apos;s Appointments
              </p>
              <p style={{ marginTop: '8px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>48</p>
              <p style={{ fontSize: '14px', color: '#059669' }}>+12% vs yesterday</p>
            </div>
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
                Avg. Wait Time
              </p>
              <p style={{ marginTop: '8px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>14m</p>
              <p style={{ fontSize: '14px', color: '#059669' }}>-8% vs last week</p>
            </div>
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
                Patients Seen
              </p>
              <p style={{ marginTop: '8px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>156</p>
              <p style={{ fontSize: '14px', color: '#059669' }}>+22% this week</p>
            </div>
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
                Active Doctors
              </p>
              <p style={{ marginTop: '8px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>8</p>
              <p style={{ fontSize: '14px', color: '#059669' }}>All available</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '12px' }}>
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                Recent Patients
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', backgroundColor: '#ecfdf5', padding: '8px 12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Sarah Johnson · Completed</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>6 min ago</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', backgroundColor: '#fffbeb', padding: '8px 12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Mike Chen · In Progress</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Now</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', backgroundColor: '#f0f9ff', padding: '8px 12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Emily Davis · Waiting</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>Next</p>
                </div>
              </div>
            </div>
            <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Quick Actions</p>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#475569' }}>
                <div style={{ borderRadius: '8px', backgroundColor: '#f8fafc', padding: '8px 12px' }}>Book Appointment</div>
                <div style={{ borderRadius: '8px', backgroundColor: '#f8fafc', padding: '8px 12px' }}>Add New Patient</div>
                <div style={{ borderRadius: '8px', backgroundColor: '#f8fafc', padding: '8px 12px' }}>View Queue</div>
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
    <div style={{ overflow: 'hidden', borderRadius: '26px', border: '1px solid rgba(226,232,240,0.9)', backgroundColor: 'white', boxShadow: '0 28px 70px rgba(24,31,49,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '12px 16px', fontSize: '14px' }}>
        <p style={{ fontWeight: '600', color: '#1a2436' }}>Patient Journey</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '9999px', backgroundColor: '#ecfdf5', padding: '4px 12px', fontSize: '12px', fontWeight: '600', color: '#047857' }}>
          Live Tracking
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 180px', gap: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '8px' }}>
          <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Check-in
          </div>
          <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Triage
          </div>
          <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Consultation
          </div>
          <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Checkout
          </div>
        </div>

        <div style={{ position: 'relative', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fcfcff', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#d9dce7 1px, transparent 1px)', backgroundSize: '14px 14px', opacity: 0.4 }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ borderRadius: '12px', border: '1px solid #a7f3d0', backgroundColor: '#ecfdf5', padding: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#065f46' }}>Check-in</p>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#047857' }}>
                Patient arrives and registers
              </p>
            </div>
            <div style={{ borderRadius: '12px', border: '1px solid #ddd6fe', backgroundColor: '#f5f3ff', padding: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#5b21b6' }}>Queue Assignment</p>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#6d28d9' }}>
                Smart routing to doctor
              </p>
            </div>
            <div style={{ borderRadius: '12px', border: '1px solid #bae6fd', backgroundColor: '#f0f9ff', padding: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#075985' }}>Consultation</p>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#0369a1' }}>Doctor examination</p>
            </div>
            <div style={{ borderRadius: '12px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', padding: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#92400e' }}>Prescription</p>
              <p style={{ marginTop: '4px', fontSize: '12px', color: '#b45309' }}>
                Digital prescription
              </p>
            </div>
          </div>
        </div>

        <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a2436' }}>Patient Info</p>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '12px', color: '#475569' }}>
              Name: John Doe
            </div>
            <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '12px', color: '#475569' }}>
              Department: Cardiology
            </div>
            <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '12px', color: '#475569' }}>
              Doctor: Dr. Smith
            </div>
            <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px', fontSize: '12px', color: '#475569' }}>
              Status: In Progress
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GrowthShowcase() {
  return (
    <div style={{ overflow: 'hidden', borderRadius: '26px', border: '1px solid rgba(226,232,240,0.9)', backgroundColor: 'white', boxShadow: '0 26px 70px rgba(20,26,40,0.14)' }}>
      <div style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 16px' }}>
        <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a2436' }}>Weekly Report</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '12px' }}>
          <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '12px' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
              Highlights
            </p>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#334155' }}>
              Patient wait times reduced by 35% after queue optimization update.
            </p>
          </div>
          <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '12px' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
              Focus Next Week
            </p>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#334155' }}>
              Improve appointment scheduling during peak morning hours.
            </p>
          </div>
          <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '12px' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
              Department
            </p>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#334155' }}>Cardiology</p>
          </div>
        </div>

        <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(to bottom, #dff9f7, white, #f4fffe)', padding: '12px' }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#64748b' }}>
            Performance Snapshot
          </p>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px 12px', fontSize: '14px', color: '#334155' }}>
              Patient satisfaction: 96%
            </div>
            <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px 12px', fontSize: '14px', color: '#334155' }}>
              Appointment completion: 94%
            </div>
            <div style={{ borderRadius: '8px', backgroundColor: 'white', padding: '8px 12px', fontSize: '14px', color: '#334155' }}>
              Average wait time: 12 min
            </div>
          </div>
          <div style={{ marginTop: '16px', borderRadius: '8px', backgroundColor: '#d7f4ff', padding: '12px', fontSize: '14px', color: '#334155' }}>
            Monthly analytics report is ready for review.
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
              Updates
            </h3>
            <p className="mt-4 max-w-md text-xl leading-relaxed text-[#143858]/90">
              Keep your medical staff informed with real-time announcements and
              important updates.
            </p>
          </div>

          <div className="rounded-t-[24px] bg-white p-6 shadow-[0_-12px_40px_rgba(14,36,59,0.12)]">
            <p className="text-xl text-slate-400">1h ago</p>
            <p className="mt-1 font-display text-5xl font-semibold leading-none text-[#141c2d]">
              New wing opening
            </p>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#f4a28c] via-[#8a5a42] to-[#1e324a]" />
              <div>
                <p className="text-2xl font-semibold leading-none text-[#111827]">
                  Dr. Sarah Chen
                </p>
                <p className="mt-1 text-xl text-slate-500">Hospital Admin</p>
              </div>
            </div>

            <p className="mt-5 text-2xl leading-relaxed text-slate-700">
              Excited to announce our new pediatric wing opens next Monday.
              Here&apos;s what you need to know.
            </p>
            <p className="mt-4 text-xl font-semibold text-[#253042]">
              Staff Orientation Schedule
            </p>
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[28px] border border-[#ccb8ef] bg-[#dac8ff] p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7">
          <div className="relative z-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#9a82c8] bg-[#e3d7ff] text-[#3a2b58]">
              <LayoutPanelTop className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-display text-5xl font-semibold leading-none text-[#1d1733]">
              Staff Portal
            </h3>
            <p className="mt-4 max-w-md text-xl leading-relaxed text-[#3f3365]/90">
              A dedicated space for doctors and nurses to access schedules,
              protocols, and patient information.
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
              Team Events
            </h3>
            <p className="mt-4 max-w-md text-2xl leading-relaxed text-white/90">
              Celebrate milestones and build stronger connections with your
              healthcare team.
            </p>
          </div>
        </article>

        <article className="overflow-hidden rounded-[28px] border border-[#dfcf6b] bg-[#ffe87a] p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-7">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#b8942b] bg-[#ffe89b] text-[#463106]">
            <ImageIcon className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-5xl font-semibold leading-none text-[#1b1b15]">
            Medical Records
          </h3>
          <p className="mt-4 max-w-md text-xl leading-relaxed text-[#382f16]/90">
            Securely store and access patient records, prescriptions, and
            medical history in one place.
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
                  Patient Records
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
                  Categories
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
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2A9D8F] text-white shadow-lg shadow-[#2A9D8F]/25">
              <Activity className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight text-[#111827]">
              MediFlow
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 lg:flex">
            <a href="#product" className="transition-colors hover:text-slate-900">
              Features
            </a>
            <a href="#culture" className="transition-colors hover:text-slate-900">
              For Hospitals
            </a>
            <a href="#growth" className="transition-colors hover:text-slate-900">
              Analytics
            </a>
            <a href="#pricing" className="transition-colors hover:text-slate-900">
              Get Started
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 sm:inline-flex"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#2A9D8F] px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Get Started
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
                Features
              </a>
              <a
                href="#culture"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                For Hospitals
              </a>
              <a
                href="#growth"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Analytics
              </a>
              <a
                href="#pricing"
                className="rounded-xl px-3 py-2 transition hover:bg-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
              </a>
              <a
                href="/login"
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
                Streamline your hospital.
                <span className="block text-[#2A9D8F]">Elevate patient care.</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
                Manage appointments, queues, and patient records in one place.
                Reduce wait times and improve efficiency with AI-powered
                healthcare management.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2A9D8F]/30 transition hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#product"
                  className="inline-flex rounded-full bg-[#d7ecff] px-6 py-3 text-sm font-semibold text-[#0a76ce] transition hover:-translate-y-0.5"
                >
                  See How It Works
                </a>
              </div>
            </div>

            <div style={{ marginTop: '48px', borderRadius: '34px', backgroundColor: '#f4cbe1', padding: '28px' }}>
              <DashboardShowcase />
            </div>
          </div>
        </section>

        <section id="product" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-4xl font-semibold leading-tight text-[#131722] sm:text-5xl">
                Built for healthcare, designed for efficiency.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <Calendar className="h-8 w-8 text-[#2A9D8F]" />
                <p className="mt-4 text-lg font-semibold text-[#131722]">
                  Smart Scheduling
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  AI-powered appointment booking that optimizes doctor
                  availability and patient convenience.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <Users className="h-8 w-8 text-[#f59e0b]" />
                <p className="mt-4 text-lg font-semibold text-[#131722]">
                  Queue Management
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Real-time patient queue with smart routing and wait time
                  predictions.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <ClipboardList className="h-8 w-8 text-[#8b5cf6]" />
                <p className="mt-4 text-lg font-semibold text-[#131722]">
                  Digital Prescriptions
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Generate and manage prescriptions digitally with complete
                  medical history tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: '40px', maxWidth: '72rem', margin: '0 auto', padding: '0 24px' }}>
            <div style={{ alignSelf: 'center' }}>
              <SectionIntro
                eyebrow="Hospital Operations"
                title="All essentials, streamlined."
                copy="From patient check-in to checkout, MediFlow keeps your hospital running smoothly. Every action your staff needs is one click away."
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {everydayFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    <BadgeCheck className="h-4 w-4 text-[#2A9D8F]" />
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

            <div style={{ borderRadius: '34px', backgroundColor: '#dcd2ff', padding: '24px' }}>
              <CanvasShowcase />
            </div>
          </div>
        </section>

        <section id="culture" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#cd7b2f]">
                For Hospitals
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-[0.95] text-[#131722] sm:text-6xl">
                Connected care teams.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-slate-600">
                Keep your medical staff in sync with real-time updates,
                shared patient information, and collaborative tools.
              </p>
            </div>

            <TeamCultureShowcase />
          </div>
        </section>

        <section id="growth" className="py-16 sm:py-20">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: '40px', maxWidth: '72rem', margin: '0 auto', padding: '0 24px' }}>
            <div style={{ alignSelf: 'center' }}>
              <SectionIntro
                eyebrow="Analytics & Insights"
                title="Data-driven healthcare."
                copy="Track patient flow, monitor wait times, and optimize your hospital operations with comprehensive analytics and reporting."
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

            <div style={{ borderRadius: '34px', backgroundColor: '#c8f0ef', padding: '24px' }}>
              <GrowthShowcase />
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="rounded-[36px] border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_24px_70px_rgba(15,21,34,0.08)] sm:px-12">
              <h2 className="font-display text-4xl font-semibold text-[#131722] sm:text-5xl">
                Ready to transform your hospital?
              </h2>
              <p className="mt-3 text-xl text-slate-500">
                Get started in minutes, not days.
              </p>

              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <ShieldCheck className="h-5 w-5 text-[#2A9D8F]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    HIPAA Compliant
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Secure patient data with full compliance.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <Clock3 className="h-5 w-5 text-[#2A9D8F]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    24/7 Availability
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Always-on system for round-the-clock care.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <Sparkles className="h-5 w-5 text-[#2A9D8F]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    AI-Powered
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Smart scheduling and queue optimization.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <MessageSquarePlus className="h-5 w-5 text-[#2A9D8F]" />
                  <p className="mt-3 text-sm font-semibold text-[#131722]">
                    Dedicated Support
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Expert help when you need it most.
                  </p>
                </div>
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-[#2A9D8F] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#2A9D8F]/30 transition hover:-translate-y-0.5"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#product"
                  className="inline-flex rounded-full bg-[#d9eeff] px-6 py-3 text-sm font-semibold text-[#0a76ce] transition hover:-translate-y-0.5"
                >
                  Schedule Demo
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>MediFlow Healthcare Solutions</p>
          <div className="flex flex-wrap gap-6">
            <a href="#product" className="transition-colors hover:text-slate-800">
              Features
            </a>
            <a href="#culture" className="transition-colors hover:text-slate-800">
              About Us
            </a>
            <a href="#growth" className="transition-colors hover:text-slate-800">
              Privacy Policy
            </a>
          </div>
          <p>© 2026 MediFlow</p>
        </div>
      </footer>
    </div>
  );
}
