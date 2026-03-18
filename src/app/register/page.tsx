"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList, Plus, Trash2, CreditCard, CheckCircle, Star } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import StepDots from "@/components/ui/StepDots";
import AITip from "@/components/ui/AITip";
import MultiCheckList from "@/components/ui/MultiCheckList";
import { cn } from "@/lib/utils";
import {
  NAICS_CODES, UNSPSC_CODES, BUSINESS_DESIGNATIONS,
  EMPLOYEE_RANGES, REVENUE_RANGES, VISA_TYPES, CERT_PRICING,
  AI_TIPS, MOCK_ASSESSORS,
} from "@/lib/constants";
import type { RegistrationState, OwnershipEntry, CertType } from "@/types";

const TOTAL = 8;

const EMPTY: RegistrationState = {
  business_name: "", women_owned: null, country: "",
  us_citizen: null, webank_certified: null, visa_type: "",
  naics_codes: [], unspsc_codes: [], designations: [],
  additional_certs: "", business_description: "",
  ein: "", address: "", num_employees: "", revenue_range: "",
  ownership_structure: [{ name: "", gender: "female", percent: 0 }],
  cert_type: undefined, payment_complete: false,
};

// ── Reusable sub-inputs ────────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <input className="input-field" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus />;
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-3">
      {["Yes", "No"].map(opt => (
        <button key={opt} onClick={() => onChange(opt === "Yes")}
          className={cn(value === (opt === "Yes") ? "choice-opt-sel" : "choice-opt")}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function ChoiceSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2.5">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={cn(value === opt ? "choice-opt-sel" : "choice-opt")}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function OwnershipEditor({ entries, onChange }: { entries: OwnershipEntry[]; onChange: (e: OwnershipEntry[]) => void }) {
  const update = (i: number, field: keyof OwnershipEntry, val: string | number) => {
    const updated = entries.map((e, idx) => idx === i ? { ...e, [field]: val } : e);
    onChange(updated);
  };
  const add = () => onChange([...entries, { name: "", gender: "female", percent: 0 }]);
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i));
  const total = entries.reduce((s, e) => s + Number(e.percent), 0);

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Owner {i + 1}</span>
            {entries.length > 1 && (
              <button onClick={() => remove(i)}><Trash2 size={14} className="text-gray-400 hover:text-red-500" /></button>
            )}
          </div>
          <input className="input-field" placeholder="Full name" value={entry.name}
            onChange={e => update(i, "name", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className="select-field" value={entry.gender} onChange={e => update(i, "gender", e.target.value)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
            <div className="relative">
              <input type="number" min={0} max={100} className="input-field pr-8"
                placeholder="%" value={entry.percent || ""}
                onChange={e => update(i, "percent", Number(e.target.value))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button onClick={add} className="flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-blue-700 transition-colors">
          <Plus size={14} /> Add Owner
        </button>
        <span className={cn("text-sm font-semibold", total === 100 ? "text-green-600" : total > 100 ? "text-red-500" : "text-gray-500")}>
          Total: {total}%
        </span>
      </div>
      {total !== 100 && total > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Ownership percentages must add up to 100%</p>
      )}
    </div>
  );
}

function CertPicker({ value, onChange }: { value: CertType | undefined; onChange: (v: CertType) => void }) {
  return (
    <div className="space-y-4">
      {(["self", "digital"] as CertType[]).map(type => {
        const info = CERT_PRICING[type];
        const sel = value === type;
        return (
          <button key={type} onClick={() => onChange(type)}
            className={cn("w-full text-left rounded-2xl border-2 p-5 transition-all", sel ? "border-brand-purple bg-purple-50/40" : "border-gray-200 hover:border-gray-300")}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", sel ? "border-brand-purple bg-brand-purple" : "border-gray-300")}>
                  {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="font-bold text-gray-900">{info.label}</span>
                {type === "digital" && <span className="badge bg-amber-100 text-amber-700">Recommended</span>}
              </div>
              <span className="font-bold text-brand-purple text-lg">${info.price}<span className="text-xs text-gray-400 font-normal">/yr</span></span>
            </div>
            <p className="text-sm text-gray-500 ml-7">
              {type === "self" ? "Attestation form + document upload" : "Enhanced verification + QID blockchain certificate"}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function AssessorPicker({ selectedId, onChange }: { selectedId: string | undefined; onChange: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Optional: An independent assessor evaluates your application and increases buyer confidence.</p>
      {MOCK_ASSESSORS.map(a => (
        <button key={a.id} onClick={() => onChange(selectedId === a.id ? "" : a.id)}
          className={cn("w-full text-left rounded-2xl border-2 p-4 transition-all", selectedId === a.id ? "border-brand-blue bg-blue-50/30" : "border-gray-200 hover:border-gray-300")}>
          <div className="flex items-start gap-3">
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0", selectedId === a.id ? "border-brand-blue bg-brand-blue" : "border-gray-300")}>
              {selectedId === a.id && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-gray-900 text-sm">{a.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-gray-700">{a.rating}</span>
                  <span className="text-xs text-gray-400">({a.review_count})</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {a.credentials.map(c => <span key={c} className="badge bg-gray-100 text-gray-600">{c}</span>)}
              </div>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{a.bio}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>Self-cert: <strong className="text-gray-700">${a.fee_self}</strong></span>
                <span>Digital: <strong className="text-gray-700">${a.fee_digital}</strong></span>
                <span>Industry: <strong className="text-gray-700">${a.fee_industry}</strong></span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function PaymentForm({ certType, assessorId, onComplete }: { certType: CertType | undefined; assessorId?: string; onComplete: () => void }) {
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry]   = useState("");
  const [cvv, setCvv]         = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);

  const baseCost   = certType ? (CERT_PRICING[certType].price ?? 0) : 0;
  const assessor   = MOCK_ASSESSORS.find(a => a.id === assessorId);
  const assessFee  = assessor ? (certType === "self" ? assessor.fee_self : assessor.fee_digital) : 0;
  const total      = baseCost + assessFee;

  function handlePay() {
    setLoading(true);
    setTimeout(() => { setLoading(false); onComplete(); }, 1800);
  }

  return (
    <div className="space-y-5">
      {/* Order summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-3">Order Summary</p>
        {certType && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>{CERT_PRICING[certType].label}</span>
            <span className="font-semibold">${baseCost}</span>
          </div>
        )}
        {assessor && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Assessor: {assessor.name}</span>
            <span className="font-semibold">${assessFee}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
          <span>Total</span>
          <span>${total}/yr</span>
        </div>
      </div>

      <div>
        <label className="label">Cardholder Name</label>
        <input className="input-field" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Card Number</label>
        <input className="input-field" placeholder="4242 4242 4242 4242" value={cardNum}
          onChange={e => setCardNum(e.target.value.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Expiry</label>
          <input className="input-field" placeholder="MM/YY" value={expiry}
            onChange={e => { const v=e.target.value.replace(/\D/g,""); setExpiry(v.length>=2?v.slice(0,2)+"/"+v.slice(2,4):v); }} />
        </div>
        <div>
          <label className="label">CVV</label>
          <input className="input-field" placeholder="123" maxLength={4} value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,""))} />
        </div>
      </div>
      <button onClick={handlePay} disabled={!cardNum || !expiry || !cvv || !name || loading}
        className="btn-purple w-full gap-2 py-3">
        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CreditCard size={16} />}
        {loading ? "Processing..." : `Pay $${total}`}
      </button>
      <p className="text-xs text-center text-gray-400">Secured by Stripe · TLS 1.3 encryption</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [q, setQ]             = useState(1);
  const [answers, setAnswers] = useState<RegistrationState>(EMPTY);
  const [assessorId, setAssessorId] = useState<string>("");
  const [paid, setPaid]       = useState(false);

  const set = (field: keyof RegistrationState, val: unknown) =>
    setAnswers(a => ({ ...a, [field]: val }));
  const toggle = (field: "naics_codes" | "unspsc_codes" | "designations", code: string) =>
    set(field, answers[field].includes(code) ? answers[field].filter(c => c !== code) : [...answers[field], code]);

  function canProceed() {
    switch (q) {
      case 1: return answers.business_name.trim().length > 0;
      case 2: return answers.women_owned !== null;
      case 3:
        if (!answers.country) return false;
        if (answers.country.toLowerCase().includes("united states") || answers.country.toLowerCase() === "us" || answers.country.toLowerCase() === "usa") {
          if (answers.us_citizen === null) return false;
          if (answers.us_citizen === false && !answers.visa_type) return false;
          if (answers.webank_certified === null) return false;
        }
        return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return answers.ownership_structure.every(e => e.name && e.percent > 0) &&
               answers.ownership_structure.reduce((s,e)=>s+Number(e.percent),0) === 100;
      case 8: return answers.business_description.trim().length >= 30;
      default: return true;
    }
  }

  function handleNext() {
    if (q === TOTAL) {
      if (!paid) return;
      router.push("/verify");
    } else {
      setQ(prev => prev + 1);
    }
  }

  const isUS = answers.country.toLowerCase().includes("united states") ||
               answers.country.toLowerCase() === "us" ||
               answers.country.toLowerCase() === "usa";

  function renderBody() {
    switch (q) {
      case 1:
        return (
          <div className="space-y-4">
            <TextInput value={answers.business_name} onChange={v => set("business_name", v)} placeholder="Enter your registered business name" />
          </div>
        );

      case 2:
        return <YesNo value={answers.women_owned} onChange={v => set("women_owned", v)} />;

      case 3:
        return (
          <div className="space-y-4">
            <TextInput value={answers.country} onChange={v => set("country", v)} placeholder="e.g., United States, Canada, United Kingdom" />

            {isUS && (
              <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="label">Are you a US citizen or green card holder?</p>
                  <YesNo value={answers.us_citizen ?? null} onChange={v => set("us_citizen", v)} />
                </div>

                {answers.us_citizen === false && (
                  <div>
                    <p className="label">Visa Type</p>
                    <ChoiceSelect options={VISA_TYPES} value={answers.visa_type ?? ""} onChange={v => set("visa_type", v)} />
                  </div>
                )}

                <div>
                  <p className="label">Are you certified by WEBank?</p>
                  <p className="text-xs text-gray-400 mb-2">WEBank-certified businesses can auto-certify with WEConnect by uploading your WEBank certificate.</p>
                  <YesNo value={answers.webank_certified ?? null} onChange={v => set("webank_certified", v)} />
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return <MultiCheckList items={NAICS_CODES} selected={answers.naics_codes} onToggle={c => toggle("naics_codes", c)} />;

      case 5:
        return <MultiCheckList items={UNSPSC_CODES} selected={answers.unspsc_codes} onToggle={c => toggle("unspsc_codes", c)} />;

      case 6:
        return (
          <div className="space-y-2.5">
            {BUSINESS_DESIGNATIONS.map(d => {
              const sel = answers.designations.includes(d);
              return (
                <button key={d} onClick={() => toggle("designations", d)}
                  className={cn(sel ? "check-opt-sel" : "check-opt", "w-full text-left")}>
                  <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                    sel ? "bg-brand-blue border-brand-blue" : "border-gray-300 bg-white")}>
                    {sel && <svg viewBox="0 0 10 8" className="w-3 h-3"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{d}</span>
                </button>
              );
            })}
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <OwnershipEditor entries={answers.ownership_structure} onChange={v => set("ownership_structure", v)} />
            <div>
              <p className="label">Additional Certifications</p>
              <input className="input-field" placeholder="e.g., ISO 9001, MBE, LGBTQ-Owned, Veteran-Owned, B-Corp"
                value={answers.additional_certs} onChange={e => set("additional_certs", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label">Number of Employees</p>
                <select className="select-field" value={answers.num_employees} onChange={e => set("num_employees", e.target.value)}>
                  <option value="">Select range</option>
                  {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <p className="label">Annual Revenue</p>
                <select className="select-field" value={answers.revenue_range} onChange={e => set("revenue_range", e.target.value)}>
                  <option value="">Select range</option>
                  {REVENUE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <textarea className="textarea-field" rows={5}
                placeholder="Tell us about your products or services (50-200 words)"
                value={answers.business_description}
                onChange={e => set("business_description", e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">{answers.business_description.length} characters</p>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="font-semibold text-gray-900 mb-1">Choose Certification Path</p>
              <p className="text-sm text-gray-500 mb-4">Select how you'd like to certify your business.</p>
              <CertPicker value={answers.cert_type} onChange={v => set("cert_type", v)} />
            </div>

            {answers.cert_type && (
              <div className="border-t border-gray-100 pt-5">
                <p className="font-semibold text-gray-900 mb-1">Select an Assessor (Optional)</p>
                <AssessorPicker selectedId={assessorId} onChange={setAssessorId} />
              </div>
            )}

            {answers.cert_type && (
              <div className="border-t border-gray-100 pt-5">
                <p className="font-semibold text-gray-900 mb-4">Payment</p>
                {paid ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                    <CheckCircle size={20} className="text-green-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800 text-sm">Payment Successful</p>
                      <p className="text-xs text-green-600">Your certification application has been submitted.</p>
                    </div>
                  </div>
                ) : (
                  <PaymentForm certType={answers.cert_type} assessorId={assessorId} onComplete={() => setPaid(true)} />
                )}
              </div>
            )}
          </div>
        );
    }
  }

  const questions: Record<number, string> = {
    1: "What is your business name?",
    2: "Is your business at least 51% owned by women?",
    3: "In which country is your business registered?",
    4: "Select your Industry (NAICS Codes)",
    5: "Select your Category (UNSPSC Codes)",
    6: "Business Designations (Select all that apply)",
    7: "Ownership Structure & Business Details",
    8: "Briefly describe what your business does",
  };

  const nextLabel = q === TOTAL ? (paid ? "Complete Registration →" : "Complete Payment to Continue") : "Next Question →";

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-6 pt-6 pb-16">
        <button onClick={() => q === 1 ? router.push("/dashboard") : setQ(q - 1)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-6">
          <ArrowLeft size={15} />Back to {q === 1 ? "Dashboard" : "Previous"}
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
            <ClipboardList size={24} className="text-brand-blue" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900">Step 1: Register</h1>
            <p className="text-gray-400 text-sm">AI-driven KYC and relevance check</p>
          </div>
        </div>

        <ProgressBar current={q} total={TOTAL} />

        {/* Card */}
        <div key={q} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-5 animate-slide-up">
          <h2 className="font-display font-bold text-xl text-gray-900 mb-6">{questions[q]}</h2>
          <div className="mb-6">{renderBody()}</div>
          <AITip tip={AI_TIPS[q]} />
          <hr className="my-5 border-gray-100" />
          <div className="flex items-center justify-between">
            <button onClick={() => q === 1 ? router.push("/dashboard") : setQ(q - 1)}
              className={cn("flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-all",
                q === 1 ? "text-gray-300 border-gray-100 cursor-not-allowed" : "btn-outline")}>
              <ArrowLeft size={14} />Previous
            </button>
            <button onClick={handleNext}
              disabled={!canProceed() || (q === TOTAL && !paid)}
              className={cn("flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all",
                canProceed() && (q < TOTAL || paid)
                  ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
              {nextLabel}
              {q < TOTAL && <ArrowRight size={14} />}
            </button>
          </div>
        </div>

        <StepDots total={TOTAL} current={q} />
      </div>
    </div>
  );
}
