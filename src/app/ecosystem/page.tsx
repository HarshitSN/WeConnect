import Link from "next/link";
import { ArrowRight, Network, Cpu, Globe, Users, TrendingUp, Shield, CheckCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

const NODES = [
  { icon: Users,     color: "bg-blue-100 text-brand-blue",   title: "Suppliers",    count: "2,400+", desc: "Women-owned businesses & SMEs seeking certification and buyer connections." },
  { icon: Network,   color: "bg-purple-100 text-brand-purple",title: "Buyers",       count: "180+",   desc: "Corporate procurement teams searching for verified diverse suppliers." },
  { icon: Cpu,       color: "bg-green-100 text-green-600",   title: "Certifiers",   count: "34",     desc: "Accredited bodies and assessors validating supplier credentials." },
  { icon: Globe,     color: "bg-amber-100 text-amber-600",   title: "Markets",      count: "12",     desc: "Industry and geographic marketplaces powered by verified supplier data." },
];

const NEWCO = [
  "WOB Certification (Current)",
  "MBE (Minority-Owned Business)",
  "LGBTQ+-Owned Business",
  "Veteran-Owned Business",
  "Small Business Certification",
  "Global Certifier Equivalents",
];

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">Ecosystem</h1>
          <p className="text-gray-500 max-w-xl">WEConnect brings together suppliers, buyers, certifiers, and markets into one interconnected platform for inclusive procurement.</p>
        </div>

        {/* Nodes */}
        <div className="grid md:grid-cols-2 gap-5 mb-10">
          {NODES.map(n => (
            <div key={n.title} className="card-hover flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}><n.icon size={22}/></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-gray-900">{n.title}</h3>
                  <span className="font-bold text-gray-300 text-lg">{n.count}</span>
                </div>
                <p className="text-sm text-gray-500">{n.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Data moat */}
        <div className="card mb-8">
          <h2 className="section-title mb-5">Platform Data Moat</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Users,   title: "Proprietary WOB Database", type: "Network Effects + Switching Costs", defensibility: "HIGH", desc: "100K+ verified WOB profiles (Year 3 target). Blockchain-anchored provenance cannot be forged." },
              { icon: Cpu,     title: "AI Training Data",          type: "Data Flywheel + Proprietary Tech", defensibility: "VERY HIGH", desc: "Millions of labeled documents for fraud detection. Models improve with scale — compounding advantage." },
              { icon: Shield,  title: "Blockchain Audit Trail",    type: "Regulatory + Technical",           defensibility: "VERY HIGH", desc: "Immutable provenance from day 1. Cannot replicate without full history. Becomes industry standard." },
            ].map(m => (
              <div key={m.title} className="bg-gray-50 rounded-2xl p-5">
                <m.icon size={20} className="text-brand-indigo mb-3" />
                <h4 className="font-bold text-gray-900 text-sm mb-1">{m.title}</h4>
                <p className="text-xs text-brand-purple font-semibold mb-2">{m.type}</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{m.desc}</p>
                <span className={`badge ${m.defensibility === "VERY HIGH" ? "bg-green-100 text-green-700" : "bg-blue-100 text-brand-blue"}`}>
                  Defensibility: {m.defensibility}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* NewCo Expansion */}
        <div className="card mb-8">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="section-title">NewCo Ecosystem Expansion</h2>
              <p className="text-sm text-gray-500 mt-1">WEC as blueprint for multi-certification global community</p>
            </div>
            <span className="badge status-pending">Phase 2</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {NEWCO.map((item, i) => (
              <div key={item} className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${i===0?"border-brand-indigo bg-brand-indigo/5 font-semibold text-brand-indigo":"border-gray-200 text-gray-600"}`}>
                <CheckCircle size={13} className={i===0?"text-brand-indigo":"text-gray-300"}/>{item}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-banner-gradient rounded-2xl p-10 text-center">
          <h2 className="font-display font-bold text-2xl text-white mb-3">Join the WEConnect Ecosystem</h2>
          <p className="text-white/75 mb-6 max-w-md mx-auto">Get certified and start connecting with procurement teams from global corporations.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white text-brand-indigo font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
            Start Your Journey <ArrowRight size={16}/>
          </Link>
        </div>
      </main>
    </div>
  );
}
