"use client";
import { useState } from "react";
import { Search, Filter, Globe, CheckCircle, Shield, Link2, Download, X, ChevronDown } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { MOCK_SUPPLIERS, NAICS_CODES } from "@/lib/constants";
import { cn, getCertTypeLabel } from "@/lib/utils";
import type { CertType, CertStatus } from "@/types";

interface Filters {
  query: string;
  cert_type: CertType | "";
  cert_status: CertStatus | "";
  naics: string;
  country: string;
  women_owned: boolean | null;
  blockchain: boolean | null;
}

const EMPTY_FILTERS: Filters = { query: "", cert_type: "", cert_status: "", naics: "", country: "", women_owned: null, blockchain: null };

export default function BuyerPortalPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const set = (key: keyof Filters, val: any) => setFilters(f => ({ ...f, [key]: val }));

  const filtered = MOCK_SUPPLIERS.filter(s => {
    if (filters.query && !s.business_name.toLowerCase().includes(filters.query.toLowerCase())) return false;
    if (filters.cert_type && s.cert_type !== filters.cert_type) return false;
    if (filters.cert_status && s.cert_status !== filters.cert_status) return false;
    if (filters.naics && !s.industry_codes.includes(filters.naics)) return false;
    if (filters.country && !s.country.toLowerCase().includes(filters.country.toLowerCase())) return false;
    if (filters.women_owned !== null && s.women_owned !== filters.women_owned) return false;
    if (filters.blockchain === true && !s.blockchain_verified) return false;
    return true;
  });

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v !== "" && v !== null).length;
  const supplier = MOCK_SUPPLIERS.find(s => s.id === selected);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900">Buyer Portal</h1>
            <p className="text-gray-500 text-sm mt-0.5">Discover verified women-owned suppliers for your procurement needs</p>
          </div>
          <button className="btn-outline gap-2 text-sm"><Download size={14}/>Export CSV</button>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-10" placeholder="Search by business name, industry, or category..."
              value={filters.query} onChange={e => set("query", e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("btn-outline gap-2 text-sm relative", showFilters && "bg-brand-indigo/5 border-brand-indigo text-brand-indigo")}>
            <Filter size={14} />Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-indigo text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card mb-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-900">Filters</p>
              <button onClick={() => { setFilters(EMPTY_FILTERS); }} className="text-xs text-brand-blue font-medium hover:underline flex items-center gap-1">
                <X size={11}/>Clear all
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
              <div>
                <label className="label text-xs">Cert Type</label>
                <select className="select-field text-sm py-2" value={filters.cert_type} onChange={e => set("cert_type", e.target.value)}>
                  <option value="">Any</option>
                  <option value="self">Self-Certified</option>
                  <option value="digital">Digital-Certified</option>
                  <option value="auditor">Auditor-Certified</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Cert Status</label>
                <select className="select-field text-sm py-2" value={filters.cert_status} onChange={e => set("cert_status", e.target.value)}>
                  <option value="">Any</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Industry (NAICS)</label>
                <select className="select-field text-sm py-2" value={filters.naics} onChange={e => set("naics", e.target.value)}>
                  <option value="">Any</option>
                  {NAICS_CODES.slice(0, 10).map(n => <option key={n.code} value={n.code}>{n.code} – {n.label.split(",")[0]}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs">Country</label>
                <input className="input-field text-sm py-2" placeholder="e.g. United States" value={filters.country} onChange={e => set("country", e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">Women-Owned</label>
                <select className="select-field text-sm py-2" value={filters.women_owned === null ? "" : String(filters.women_owned)} onChange={e => set("women_owned", e.target.value === "" ? null : e.target.value === "true")}>
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Blockchain Verified</label>
                <select className="select-field text-sm py-2" value={filters.blockchain === null ? "" : String(filters.blockchain)} onChange={e => set("blockchain", e.target.value === "" ? null : e.target.value === "true")}>
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-400 mb-4">{filtered.length} supplier{filtered.length !== 1 ? "s" : ""} found</p>

        <div className="grid grid-cols-12 gap-5">
          {/* Cards */}
          <div className={cn("space-y-3", selected ? "col-span-7" : "col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0")}>
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelected(s.id === selected ? null : s.id)}
                className={cn("card-hover transition-all", selected===s.id && "ring-2 ring-brand-indigo")}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{s.business_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                      <Globe size={11}/>{s.country}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-2xl text-brand-blue">{s.trust_score}</p>
                    <p className="text-[10px] text-gray-400">Trust Score</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.designations.map(d => <span key={d} className="badge bg-amber-50 text-brand-purple border border-amber-100">{d}</span>)}
                  <span className={cn("badge border", s.cert_type === "digital" ? "bg-blue-50 text-brand-blue border-blue-100" : "bg-gray-50 text-gray-600 border-gray-100")}>
                    {getCertTypeLabel(s.cert_type)}
                  </span>
                  {s.blockchain_verified && (
                    <span className="badge bg-indigo-50 text-brand-indigo border border-indigo-100 flex items-center gap-1">
                      <Link2 size={9}/>Blockchain
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn("badge", s.cert_status==="active"?"status-active":"status-pending")}>
                    {s.cert_status}
                  </span>
                  <button className="text-xs font-medium text-brand-blue hover:underline">View Profile →</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className={cn("text-center py-16 text-gray-400", !selected && "col-span-3")}>
                <Search size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm font-medium">No suppliers match your filters</p>
              </div>
            )}
          </div>

          {/* Supplier detail panel */}
          {supplier && (
            <div className="col-span-5">
              <div className="card sticky top-24 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">{supplier.business_name}</h2>
                    <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-0.5"><Globe size={13}/>{supplier.country}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-brand-blue">{supplier.trust_score}</div>
                    <div className="text-xs text-gray-400">Trust Score</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Certification", value: getCertTypeLabel(supplier.cert_type) },
                    { label: "Status",         value: supplier.cert_status },
                    { label: "Women-Owned",    value: supplier.women_owned ? "Yes" : "No" },
                    { label: "Blockchain",     value: supplier.blockchain_verified ? "Verified" : "No" },
                  ].map(row => (
                    <div key={row.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">{row.label}</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{row.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Designations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {supplier.designations.map(d => <span key={d} className="badge bg-amber-50 text-brand-purple">{d}</span>)}
                  </div>
                </div>

                {supplier.blockchain_verified && (
                  <div className="bg-brand-indigo/5 border border-brand-indigo/20 rounded-xl p-3 flex items-center gap-2">
                    <Link2 size={14} className="text-brand-indigo shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brand-indigo">QID Blockchain Verified</p>
                      <p className="text-xs text-gray-500 font-mono">0x7f3a...d94e</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button className="btn-blue flex-1 text-sm py-2.5 gap-1.5"><CheckCircle size={14}/>Verify Cert</button>
                  <button className="btn-outline flex-1 text-sm py-2.5">Invite to RFP</button>
                </div>
                <button className="btn-outline w-full text-sm py-2"><Shield size={13}/>Request Audit Report</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
