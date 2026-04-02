"use client";

import Link from "next/link";
import {
  Sparkles,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle,
  Cpu,
  Network,
  FileText,
  Settings,
  Users,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { pageEnter, panelLift, staggerContainer } from "@/lib/motion";

const FEATURES = [
  {
    icon: Sparkles,
    bg: "bg-brand-blue/15",
    color: "text-brand-blue",
    title: "AI-Guided Process",
    desc: "An assistant that actually helps, not just prompts. We guide every certification step with context.",
  },
  {
    icon: Shield,
    bg: "bg-emerald-100",
    color: "text-emerald-700",
    title: "Verified + Trusted",
    desc: "Compliance checks, audit-friendly records, and a profile buyers can trust without extra back-and-forth.",
  },
  {
    icon: Globe,
    bg: "bg-orange-100",
    color: "text-brand-purple",
    title: "Procurement Reach",
    desc: "Connect to global buyers looking for certified women-owned suppliers with confidence signals built in.",
  },
];

const JOURNEY = [
  { id: 1, label: "Register", active: true },
  { id: 2, label: "Verify", active: true },
  { id: 3, label: "Certify", active: true },
  { id: 4, label: "Digital Cert", active: true },
  { id: 5, label: "Auditor Cert", active: true },
  { id: 6, label: "Industry/Geo", active: false, future: true },
  { id: 7, label: "Code/RFP", active: false, future: true },
];

const STATS = [
  { value: "100K+", label: "WOBs target (Year 3)" },
  { value: "576", label: "Gender-focused bonds globally" },
  { value: "20%", label: "Top companies with female CPO" },
  { value: "3yr", label: "Certification validity" },
];

const DOC_LINKS = [
  { icon: FileText, label: "Product Requirements (PRD)" },
  { icon: Settings, label: "Configuration" },
  { icon: FileText, label: "Configuration BRD" },
  { icon: FileText, label: "Configuration PRD" },
  { icon: Cpu, label: "Architecture" },
  { icon: Network, label: "Buyer Portal" },
  { icon: Users, label: "Ecosystem" },
];

export default function LandingPage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.main className="min-h-screen bg-hero-gradient" variants={pageEnter()} initial="hidden" animate="visible">
      <header className="mx-auto max-w-6xl px-6 pt-5">
        <div className="flex items-center justify-between rounded-2xl border border-slate-300/40 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-indigo">
              <span className="text-xs font-bold text-white">WE</span>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-slate-900">WEConnect</div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Smart Supply For Impact</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/buyer-portal" className="btn-outline px-3 py-2 text-sm sm:px-4">
              Buyer Portal
            </Link>
            <Link href="/dashboard" className="btn-primary px-4 py-2 text-sm sm:px-5">
              Get Certified
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-12 lg:pt-16">
        <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-white/70 px-4 py-1.5 text-sm font-medium text-slate-700">
              <Sparkles size={13} className="text-brand-blue" />
              AI-Powered Certification Platform
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.06] text-brand-indigo md:text-6xl">
              Make Certification
              <span className="ml-2 text-brand-purple">Feel Premium</span>
              <br />
              And Procurement-Ready
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
              Built for women-owned businesses and SMEs who need a serious, trustworthy certification journey with buyer visibility from day one.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard" className="btn-primary rounded-2xl px-8 py-4 text-base">
                Start Your Journey <ArrowRight size={18} />
              </Link>
              <Link href="/buyer-portal" className="btn-outline rounded-2xl px-6 py-4 text-base">
                Explore Buyer View
              </Link>
            </div>
          </div>

          <div className="card rounded-3xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-slate-900">Impact Snapshot</h2>
              <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">Live Model</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200/65 bg-white/75 p-4">
                  <div className="font-display text-3xl font-bold text-brand-indigo">{s.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          className="grid gap-5 md:grid-cols-3"
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={panelLift}
              whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="card-hover interactive-surface"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                <f.icon size={22} className={f.color} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="card rounded-3xl p-8 sm:p-10">
          <h2 className="mb-10 text-center font-display text-3xl font-bold text-slate-900">Your 7-Step Certification Journey</h2>
          <div className="flex flex-wrap items-end justify-center gap-4">
            {JOURNEY.map((step) => (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                    step.active
                      ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/30"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {step.id}
                </div>
                <span className={`text-center text-xs font-medium ${step.active ? "text-slate-800" : "text-slate-400"}`}>{step.label}</span>
                {step.future && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">Future</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="card rounded-3xl border-brand-indigo/15 bg-white/82 p-10">
          <h2 className="mb-2 font-display text-3xl font-bold text-slate-900">Why WOB Certification Matters</h2>
          <p className="mb-8 max-w-2xl text-slate-600">
            Gender-responsive procurement is now a serious lever for resilient supply chains, compliance posture, and ESG-aligned capital.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Supply Chain Resilience",
                desc: "Sourcing from WOBs diversifies vendor risk and improves sourcing continuity.",
              },
              {
                title: "Regulatory Alignment",
                desc: "Disclosure-driven frameworks are pushing supplier quality and certification readiness.",
              },
              {
                title: "Capital Markets",
                desc: "Gender-linked finance is increasingly tied to verifiable supplier inclusion.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200/60 bg-white/75 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-300/35 bg-white/65 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto">
          <span className="shrink-0 text-xs font-medium text-slate-500">Platform Documentation:</span>
          {DOC_LINKS.map((d) => (
            <Link
              key={d.label}
              href="/documentation"
              className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600 transition-colors hover:text-brand-indigo"
            >
              <d.icon size={12} className="text-slate-400" />
              {d.label}
            </Link>
          ))}
        </div>
      </footer>
    </motion.main>
  );
}
