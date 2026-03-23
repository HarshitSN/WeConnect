"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BUSINESS_DESIGNATIONS,
  EMPLOYEE_RANGES,
  MOCK_ASSESSORS,
  NAICS_CODES,
  REVENUE_RANGES,
  UNSPSC_CODES,
  VISA_TYPES,
} from "@/lib/constants";
import type { ConversationPointer, OwnershipEntry, RegistrationState } from "@/types";

function sectionClass(active: boolean) {
  return cn("rounded-xl border p-4 space-y-3", active ? "border-brand-blue bg-blue-50/30" : "border-gray-100 bg-white");
}

export default function LiveFormMirror({
  answers,
  setAnswers,
  assessorId,
  setAssessorId,
  currentPointer,
}: {
  answers: RegistrationState;
  setAnswers: Dispatch<SetStateAction<RegistrationState>>;
  assessorId: string;
  setAssessorId: (id: string) => void;
  currentPointer: ConversationPointer;
}) {
  const set = (field: keyof RegistrationState, value: unknown) => setAnswers((prev) => ({ ...prev, [field]: value }));
  const toggle = (field: "naics_codes" | "unspsc_codes" | "designations", code: string) => {
    const current = answers[field];
    set(field, current.includes(code) ? current.filter((v) => v !== code) : [...current, code]);
  };

  const isUS = answers.country.toLowerCase().includes("united states") || answers.country.toLowerCase() === "us" || answers.country.toLowerCase() === "usa";

  const updateOwner = (idx: number, patch: Partial<OwnershipEntry>) => {
    const next = answers.ownership_structure.map((entry, i) => (i === idx ? { ...entry, ...patch } : entry));
    set("ownership_structure", next);
  };

  const addOwner = () => set("ownership_structure", [...answers.ownership_structure, { name: "", gender: "female", percent: 0 }]);
  const removeOwner = (idx: number) => set("ownership_structure", answers.ownership_structure.filter((_, i) => i !== idx));
  const ownerTotal = answers.ownership_structure.reduce((sum, e) => sum + Number(e.percent || 0), 0);

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">Live Form Summary</h2>
          <p className="text-xs text-gray-500">Edit any answer here while the voice bot continues.</p>
        </div>
        <span className="badge bg-indigo-100 text-indigo-700">Active question: {currentPointer.stepId.replaceAll("_", " ")}</span>
      </div>

      <div className={sectionClass(["business_name", "women_owned"].includes(currentPointer.stepId))}>
        <h3 className="text-sm font-semibold text-gray-800">Business Information</h3>
        <input className="input-field" placeholder="Business Name" value={answers.business_name} onChange={(e) => set("business_name", e.target.value)} />
        <div className="flex gap-2">
          <button onClick={() => set("women_owned", true)} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", answers.women_owned === true ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-gray-200")}>Yes, 51%+ women owned</button>
          <button onClick={() => set("women_owned", false)} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", answers.women_owned === false ? "border-red-300 bg-red-50 text-red-600" : "border-gray-200")}>No</button>
        </div>
      </div>

      <div className={sectionClass(["country", "us_citizen", "visa_type", "webank_certified"].includes(currentPointer.stepId))}>
        <h3 className="text-sm font-semibold text-gray-800">Location & Eligibility</h3>
        <input className="input-field" placeholder="Country" value={answers.country} onChange={(e) => set("country", e.target.value)} />
        {isUS && (
          <>
            <div className="flex gap-2">
              <button onClick={() => set("us_citizen", true)} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", answers.us_citizen === true ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-gray-200")}>US citizen / Green card</button>
              <button onClick={() => set("us_citizen", false)} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", answers.us_citizen === false ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-gray-200")}>Not US citizen</button>
            </div>
            {answers.us_citizen === false && (
              <select className="select-field" value={answers.visa_type} onChange={(e) => set("visa_type", e.target.value)}>
                <option value="">Select visa type</option>
                {VISA_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={() => set("webank_certified", true)} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", answers.webank_certified === true ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-gray-200")}>WEBank certified</button>
              <button onClick={() => set("webank_certified", false)} className={cn("flex-1 rounded-lg border px-3 py-2 text-sm font-medium", answers.webank_certified === false ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-gray-200")}>Not WEBank certified</button>
            </div>
          </>
        )}
      </div>

      <div className={sectionClass(["naics_codes", "unspsc_codes", "designations"].includes(currentPointer.stepId))}>
        <h3 className="text-sm font-semibold text-gray-800">Industry & Categories</h3>
        <select className="select-field" multiple style={{ height: 110 }} value={answers.naics_codes} onChange={(e) => set("naics_codes", Array.from(e.target.selectedOptions, (opt) => opt.value))}>
          {NAICS_CODES.map((n) => <option key={n.code} value={n.code}>{n.code} - {n.label}</option>)}
        </select>
        <select className="select-field" multiple style={{ height: 110 }} value={answers.unspsc_codes} onChange={(e) => set("unspsc_codes", Array.from(e.target.selectedOptions, (opt) => opt.value))}>
          {UNSPSC_CODES.map((u) => <option key={u.code} value={u.code}>{u.code} - {u.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          {BUSINESS_DESIGNATIONS.map((d) => (
            <button key={d} onClick={() => toggle("designations", d)} className={cn("text-left rounded-lg border px-3 py-2 text-xs", answers.designations.includes(d) ? "border-brand-blue bg-blue-50 text-brand-blue" : "border-gray-200 text-gray-700")}>{d}</button>
          ))}
        </div>
      </div>

      <div className={sectionClass(["owner_name", "owner_gender", "owner_percent", "owner_add_more", "num_employees", "revenue_range", "additional_certs", "business_description"].includes(currentPointer.stepId))}>
        <h3 className="text-sm font-semibold text-gray-800">Ownership & Profile</h3>
        {answers.ownership_structure.map((entry, idx) => (
          <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">Owner {idx + 1}</p>
              {answers.ownership_structure.length > 1 && (
                <button onClick={() => removeOwner(idx)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              )}
            </div>
            <input className="input-field" placeholder="Owner name" value={entry.name} onChange={(e) => updateOwner(idx, { name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select className="select-field" value={entry.gender} onChange={(e) => updateOwner(idx, { gender: e.target.value as OwnershipEntry["gender"] })}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
              <input type="number" className="input-field" min={0} max={100} placeholder="Ownership %" value={entry.percent || ""} onChange={(e) => updateOwner(idx, { percent: Number(e.target.value) })} />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <button onClick={addOwner} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue"><Plus size={14} /> Add owner</button>
          <span className={cn("text-xs font-semibold", ownerTotal === 100 ? "text-green-600" : "text-amber-600")}>Total: {ownerTotal}%</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select className="select-field" value={answers.num_employees} onChange={(e) => set("num_employees", e.target.value)}>
            <option value="">Employees</option>
            {EMPLOYEE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="select-field" value={answers.revenue_range} onChange={(e) => set("revenue_range", e.target.value)}>
            <option value="">Revenue</option>
            {REVENUE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <input className="input-field" placeholder="Additional certifications" value={answers.additional_certs} onChange={(e) => set("additional_certs", e.target.value)} />
        <textarea className="textarea-field" rows={4} placeholder="Business description (min 30 chars)" value={answers.business_description} onChange={(e) => set("business_description", e.target.value)} />
      </div>

      <div className={sectionClass(["cert_type", "assessor"].includes(currentPointer.stepId))}>
        <h3 className="text-sm font-semibold text-gray-800">Certification Path</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => set("cert_type", "self")} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", answers.cert_type === "self" ? "border-brand-purple bg-purple-50 text-brand-purple" : "border-gray-200")}>Self Certification</button>
          <button onClick={() => set("cert_type", "digital")} className={cn("rounded-lg border px-3 py-2 text-sm font-medium", answers.cert_type === "digital" ? "border-brand-purple bg-purple-50 text-brand-purple" : "border-gray-200")}>Digital Certification</button>
        </div>

        <select className="select-field" value={assessorId} onChange={(e) => setAssessorId(e.target.value)}>
          <option value="">No assessor selected</option>
          {MOCK_ASSESSORS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
    </section>
  );
}
