"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Clock, CheckCircle, Lock, TrendingUp, Globe, Cpu, Network, FileText,
  ArrowRight, Search, Star, Users, Shield, AlertCircle, ExternalLink,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import WelcomeBanner from "@/components/ui/WelcomeBanner";
import DashboardStepper from "@/components/ui/DashboardStepper";
import { pageEnter, panelLift, staggerContainer } from "@/lib/motion";

const STEPS_BY_STAGE: Record<number, { id: number; label: string; sublabel: string; status: "completed" | "active" | "locked" }[]> = {
  1: [
    { id: 1, label: "Register",  sublabel: "Create account",    status: "active" },
    { id: 2, label: "Verify",    sublabel: "Background check",  status: "locked" },
    { id: 3, label: "Certify",   sublabel: "Choose path",       status: "locked" },
    { id: 4, label: "Assessor",  sublabel: "Optional boost",    status: "locked" },
  ],
  2: [
    { id: 1, label: "Register",  sublabel: "Create account",    status: "completed" },
    { id: 2, label: "Verify",    sublabel: "Background check",  status: "active" },
    { id: 3, label: "Certify",   sublabel: "Choose path",       status: "locked" },
    { id: 4, label: "Assessor",  sublabel: "Optional boost",    status: "locked" },
  ],
  3: [
    { id: 1, label: "Register",  sublabel: "Create account",    status: "completed" },
    { id: 2, label: "Verify",    sublabel: "Background check",  status: "completed" },
    { id: 3, label: "Certify",   sublabel: "Choose path",       status: "active" },
    { id: 4, label: "Assessor",  sublabel: "Optional boost",    status: "locked" },
  ],
  4: [
    { id: 1, label: "Register",  sublabel: "Create account",    status: "completed" },
    { id: 2, label: "Verify",    sublabel: "Background check",  status: "completed" },
    { id: 3, label: "Certify",   sublabel: "Choose path",       status: "completed" },
    { id: 4, label: "Assessor",  sublabel: "Optional boost",    status: "active" },
  ],
};

const BANNERS: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Welcome! Let's get you started 🎉", subtitle: "Create your profile and join thousands of women-owned businesses connecting with global buyers." },
  2: { title: "Great start! Now let's verify your business ✓", subtitle: "We're checking your business credentials to ensure buyers can trust your profile." },
  3: { title: "Verified! Choose your certification path 🏆", subtitle: "Select the certification level that best fits your business goals." },
  4: { title: "Almost there! Boost your profile 🚀", subtitle: "Optional: Add a third-party auditor assessment to maximise buyer confidence." },
};

const EXPLORE_LINKS = [
  { icon: Network, label: "Workflow",      href: "/documentation" },
  { icon: Cpu,     label: "Architecture",  href: "/documentation" },
  { icon: FileText,label: "Configuration", href: "/documentation" },
  { icon: Users,   label: "Buyer Portal",  href: "/buyer-portal" },
];

export default function DashboardPage() {
  const [stage, setStage] = useState(1);
  const prefersReducedMotion = useReducedMotion();

  const steps      = STEPS_BY_STAGE[stage];
  const banner     = BANNERS[stage];
  const regDone    = stage >= 2;
  const verifyDone = stage >= 3;
  const certDone   = stage >= 4;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <motion.main
        className="max-w-3xl mx-auto px-6 py-8"
        variants={pageEnter()}
        initial="hidden"
        animate="visible"
      >

        <WelcomeBanner title={banner.title} subtitle={banner.subtitle} />

        {/* Required Steps */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Required Steps</h2>
          </div>

          <div className="mb-4">
            <DashboardStepper steps={steps} currentStep={stage} />
          </div>

          <motion.div className="grid md:grid-cols-2 gap-4" variants={staggerContainer(0.06)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }}>
            {/* Register card */}
            <motion.div
              variants={panelLift}
              whileHover={prefersReducedMotion ? undefined : { y: -3 }}
              className={`rounded-2xl border-2 p-5 transition-all interactive-surface ${!regDone ? "border-brand-blue/30 bg-blue-50/20" : "border-green-200 bg-green-50/20"}`}
            >
              <div className="flex items-start gap-3 mb-3">
                {regDone
                  ? <CheckCircle size={17} className="text-green-500 mt-0.5 shrink-0" />
                  : <Users size={17} className="text-brand-blue mt-0.5 shrink-0" />}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">Register Your Business</h3>
                    <span className={`badge ${regDone ? "status-complete" : "status-pending"}`}>
                      {regDone ? "Completed" : "In Progress"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">Basic business info and account setup</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <Search size={12} className="text-brand-purple" />
                <span className="text-xs font-semibold text-brand-purple">Get discovered by buyers</span>
              </div>
              {!regDone && (
                <Link href="/register" className="btn-blue text-sm py-2.5">
                  Continue <ArrowRight size={14} />
                </Link>
              )}
            </motion.div>

            {/* Verify card */}
            <motion.div
              variants={panelLift}
              whileHover={prefersReducedMotion ? undefined : { y: -3 }}
              className={`rounded-2xl border-2 p-5 transition-all interactive-surface ${
              stage === 2 ? "border-brand-blue/30 bg-blue-50/20" :
              verifyDone  ? "border-green-200 bg-green-50/20" : "border-gray-100 bg-white opacity-60"}`}>
              
              <div className="flex items-start gap-3 mb-3">
                {verifyDone
                  ? <CheckCircle size={17} className="text-green-500 mt-0.5 shrink-0" />
                  : stage === 2
                  ? <Shield size={17} className="text-brand-blue mt-0.5 shrink-0" />
                  : <Lock size={17} className="text-gray-400 mt-0.5 shrink-0" />}
                <div>
                  <h3 className="font-bold text-gray-900">Verify Your Business</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Automated sanctions & entity verification</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <Lock size={12} className="text-brand-purple" />
                <span className="text-xs font-semibold text-brand-purple">Build buyer trust</span>
              </div>
              {stage === 2 && (
                <Link href="/verify" className="btn-blue text-sm py-2.5">
                  Start Verification <ArrowRight size={14} />
                </Link>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* Choose Certification */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star size={15} className="text-gray-400" />
              <h2 className="font-semibold text-gray-900">Choose Your Certification</h2>
            </div>
            <span className="text-xs font-semibold text-brand-purple bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              Not Linear — Pick What Fits Your Business
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Self-cert */}
            <div className="cert-card border-purple-200 rounded-2xl border-2 p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-gray-400" />
                  <h3 className="font-bold text-gray-900">Self-Certification</h3>
                </div>
                <div className="text-right"><span className="text-xl font-bold text-brand-purple">$199</span><div className="text-xs text-gray-400">Annual</div></div>
              </div>
              <p className="text-sm text-gray-500 mb-3">Attestation form + document upload</p>
              <div className="flex items-center gap-1.5 mb-3"><Users size={12} className="text-brand-purple" /><span className="text-xs font-semibold text-brand-purple">Access buyer category programs</span></div>
              <ul className="space-y-1.5 mb-4 text-sm text-gray-600">
                {["Access to buyer supplier programs","Enhanced profile visibility","Annual renewal","Upgrade to Digital anytime"].map(f=>(
                  <li key={f} className="flex items-center gap-2"><CheckCircle size={13} className="text-green-500 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/certify?type=self">
                <button disabled={!verifyDone} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${verifyDone ? "bg-brand-purple text-white border-brand-purple hover:bg-purple-700" : "bg-white text-gray-300 border-gray-200 cursor-not-allowed"}`}>
                  <Lock size={13} />{verifyDone ? "Choose Self-Certification" : "Complete Verification First"}
                </button>
              </Link>
            </div>

            {/* Digital cert */}
            <div className="relative rounded-2xl border-2 border-purple-300 bg-purple-50/30 p-6">
              <div className="absolute -top-3 right-4">
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">⭐ Recommended</span>
              </div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-gray-400" />
                  <h3 className="font-bold text-gray-900">Digital Certification</h3>
                </div>
                <div className="text-right"><span className="text-xl font-bold text-brand-purple">$799</span><div className="text-xs text-gray-400">Annual</div></div>
              </div>
              <p className="text-sm text-gray-500 mb-3">Enhanced verification + blockchain certificate</p>
              <div className="flex items-center gap-1.5 mb-3"><Star size={12} className="text-brand-purple" /><span className="text-xs font-semibold text-brand-purple">Become a preferred supplier</span></div>
              <ul className="space-y-1.5 mb-4 text-sm text-gray-600">
                {["QID blockchain and digital wallet","Qualified supplier status","Public verification portal","Free updates to digital certification"].map(f=>(
                  <li key={f} className="flex items-center gap-2"><CheckCircle size={13} className="text-green-500 shrink-0" />{f}</li>
                ))}
              </ul>
              <Link href="/certify?type=digital">
                <button disabled={!verifyDone} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${verifyDone ? "bg-brand-purple text-white border-brand-purple hover:bg-purple-700" : "bg-white text-gray-300 border-gray-200 cursor-not-allowed"}`}>
                  <Lock size={13} />{verifyDone ? "Choose Digital Certification" : "Complete Verification First"}
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Boost — Auditor */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Boost Your Profile (Optional Add-Ons)</h2>
          </div>
          <div className="card border-amber-100">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0"><Lock size={14} className="text-gray-400" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Third-Party Auditor Certification</h3>
                  <p className="text-sm text-gray-500">Professional assessor evaluates your business</p>
                </div>
              </div>
              <Link href="/assessor" className="text-sm font-semibold text-orange-500 hover:text-orange-600 whitespace-nowrap flex items-center gap-1">
                Browse Assessors <ExternalLink size={12} />
              </Link>
            </div>
            <div className="flex items-center gap-1.5 mb-4 ml-12">
              <TrendingUp size={12} className="text-orange-500" />
              <span className="text-xs font-semibold text-orange-500">Improve compliance & risk score</span>
            </div>
            <ul className="grid grid-cols-2 gap-y-1.5 mb-4 ml-12">
              {["Independent verification","Better risk & compliance score","Appeals process available","Highest buyer confidence"].map(f=>(
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle size={12} className="text-green-500 shrink-0" />{f}</li>
              ))}
            </ul>
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-sm text-amber-700">
              <AlertCircle size={13} />Requires Self or Digital Certification
            </div>
          </div>
        </section>

        {/* Coming Soon */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-300">✦</span>
            <h2 className="font-semibold text-gray-400">Coming Soon</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Globe, title: "Industry/Geographic Verification", desc: "Market-specific readiness checks" },
              { icon: FileText, title: "Code of Conduct / RFP Ready", desc: "AI-powered RFP discovery" },
            ].map(item=>(
              <div key={item.title} className="rounded-2xl border border-dashed border-gray-200 p-5 opacity-50">
                <div className="flex items-center gap-2 mb-1.5"><item.icon size={15} className="text-gray-400" /><h3 className="font-semibold text-gray-600 text-sm">{item.title}</h3></div>
                <p className="text-xs text-gray-400 mb-3">{item.desc}</p>
                <span className="badge bg-gray-100 text-gray-400">Future Release</span>
              </div>
            ))}
          </div>
        </section>

        {/* Explore More */}
        <section>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Explore More</h3>
            <div className="grid grid-cols-4 gap-2">
              {EXPLORE_LINKS.map(l=>(
                <Link key={l.label} href={l.href} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-indigo p-2 rounded-xl hover:bg-gray-50 transition-all">
                  <l.icon size={14} className="text-gray-400" />{l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Dev stage toggle */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {[1,2,3,4].map(s=>(
            <button key={s} onClick={()=>setStage(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${stage===s?"bg-brand-indigo text-white border-brand-indigo":"bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
              Stage {s}
            </button>
          ))}
        </div>
      </motion.main>
    </div>
  );
}
