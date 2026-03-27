"use client";

import Link from "next/link";
import { Sparkles, Shield, Globe, ArrowRight, CheckCircle, Cpu, Network, FileText, Settings, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { pageEnter, panelLift, staggerContainer } from "@/lib/motion";

const FEATURES = [
  { icon: Sparkles, bg: "bg-blue-100", color: "text-brand-blue", title: "AI-Guided Process", desc: "Our intelligent assistant guides you through every step, making certification simple and stress-free." },
  { icon: Shield, bg: "bg-green-100", color: "text-green-600", title: "Verified & Trusted", desc: "Blockchain-backed certification ensures your credentials are secure and verifiable by corporate buyers." },
  { icon: Globe, bg: "bg-purple-100", color: "text-brand-purple", title: "Global Marketplace", desc: "Connect with procurement teams worldwide and compete for RFPs with confidence." },
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
    <motion.main
      className="min-h-screen bg-hero-gradient"
      variants={pageEnter()}
      initial="hidden"
      animate="visible"
    >
      {/* Nav */}
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-indigo rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">WE</span>
          </div>
          <span className="font-bold text-gray-900">WEConnect</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/buyer-portal" className="btn-outline text-sm py-2 px-4">Buyer Portal</Link>
          <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">Get Certified →</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-14 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-gray-200 px-4 py-1.5 rounded-full text-sm font-medium text-gray-700 mb-8 shadow-sm">
          <Sparkles size={13} className="text-brand-blue" />
          AI-Powered Certification Platform
        </div>
        <h1 className="font-display font-bold text-5xl md:text-6xl text-brand-indigo leading-tight mb-4">
          WEConnect Smart Supply<br />
          <span className="text-brand-purple">For Impact</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Empowering Small & Medium Enterprises and Women-Owned Businesses with accessible, AI-driven certification. Get discovered by corporate buyers and unlock new opportunities.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary text-base px-8 py-4 rounded-2xl">
            Start Your Journey <ArrowRight size={18} />
          </Link>
          <Link href="/buyer-portal" className="btn-outline text-base px-6 py-4 rounded-2xl">
            I'm a Buyer
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 pb-14">
        <motion.div className="grid grid-cols-4 gap-4" variants={staggerContainer(0.06)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }}>
          {STATS.map(s => (
            <motion.div key={s.label} variants={panelLift} className="bg-white/70 backdrop-blur rounded-2xl border border-gray-100 p-5 text-center interactive-surface">
              <div className="font-display font-bold text-3xl text-brand-indigo">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <motion.div className="grid md:grid-cols-3 gap-5" variants={staggerContainer(0.08)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
          {FEATURES.map(f => (
            <motion.div
              key={f.title}
              variants={panelLift}
              whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="card-hover animate-fade-in interactive-surface"
            >
              <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                <f.icon size={22} className={f.color} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 7-Step Journey */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="font-display font-bold text-2xl text-center text-gray-900 mb-10">Your 7-Step Certification Journey</h2>
        <div className="flex items-end justify-center gap-4 flex-wrap">
          {JOURNEY.map(step => (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                ${step.active ? "bg-brand-blue text-white shadow-lg shadow-blue-200" : "bg-gray-200 text-gray-400"}`}>
                {step.id}
              </div>
              <span className={`text-xs font-medium text-center ${step.active ? "text-gray-800" : "text-gray-400"}`}>{step.label}</span>
              {step.future && <span className="text-[10px] text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">Future</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Market context */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-3xl border border-gray-100 p-10">
          <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">Why WOB Certification Matters</h2>
          <p className="text-gray-500 mb-8 max-w-2xl">Gender-responsive procurement has evolved from a CSR initiative into a core component of sustainable finance and global supply chain resilience.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Supply Chain Resilience", desc: "Enterprises that actively source from WOBs diversify their vendor base and reduce structural risk." },
              { title: "Regulatory Alignment", desc: "CSRD and GDPR mandates drive mandatory disclosures — certified WOBs are procurement-ready by default." },
              { title: "Capital Markets", desc: "576 gender-focused bond issuances globally link WOB engagement directly to ESG capital access." },
            ].map(item => (
              <div key={item.title} className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doc footer */}
      <footer className="border-t border-gray-200 bg-white/70 backdrop-blur py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center gap-5 overflow-x-auto">
          <span className="text-xs text-gray-400 shrink-0 font-medium">Platform Documentation:</span>
          {DOC_LINKS.map(d => (
            <Link key={d.label} href="/documentation"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-brand-indigo transition-colors whitespace-nowrap">
              <d.icon size={12} className="text-gray-300" />{d.label}
            </Link>
          ))}
        </div>
      </footer>
    </motion.main>
  );
}
