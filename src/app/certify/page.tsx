"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Shield, FileText, QrCode, Download, Link2, Lock, ArrowRight, Sparkles, Award } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import FileUpload from "@/components/ui/FileUpload";
import { cn } from "@/lib/utils";
import { REQUIRED_DOCS } from "@/lib/constants";
import type { CertType } from "@/types";

type Phase = "choose" | "attest" | "documents" | "review" | "issued";

const SELF_ATTESTATION = [
  "I confirm that this business is at least 51% owned by women.",
  "I confirm that women owners exercise day-to-day management and control of the business.",
  "I certify that all information provided is accurate and complete to the best of my knowledge.",
  "I understand that false statements may result in revocation of certification and legal action.",
  "I agree to notify WEConnect of any changes to the ownership structure within 30 days.",
];

function CertTypePicker({ value, onChange }: { value: CertType | null; onChange: (v: CertType) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {(["self","digital"] as CertType[]).map(type => {
        const sel = value === type;
        const price = type === "self" ? "$199" : "$799";
        const features = type === "self"
          ? ["Attestation form + document upload", "Access buyer category programs", "Enhanced profile visibility", "Annual renewal", "Upgrade to Digital anytime"]
          : ["Enhanced verification + blockchain cert", "QID blockchain & digital wallet", "Qualified supplier status", "Public verification portal", "Free updates"];
        return (
          <button key={type} onClick={() => onChange(type)}
            className={cn("text-left rounded-2xl border-2 p-6 transition-all",
              sel ? "border-brand-purple bg-purple-50/30" : "border-gray-200 hover:border-gray-300")}>
            {type === "digital" && (
              <div className="flex justify-end mb-2">
                <span className="badge bg-amber-100 text-amber-700">⭐ Recommended</span>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  sel ? "border-brand-purple bg-brand-purple" : "border-gray-300")}>
                  {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="font-bold text-gray-900">{type === "self" ? "Self-Certification" : "Digital Certification"}</span>
              </div>
              <span className="font-bold text-brand-purple text-xl">{price}<span className="text-xs text-gray-400 font-normal">/yr</span></span>
            </div>
            <ul className="space-y-1.5">
              {features.map(f => <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle size={13} className="text-green-500 shrink-0" />{f}</li>)}
            </ul>
          </button>
        );
      })}
    </div>
  );
}

function AttestationForm({ agreed: agreedInit, onComplete }: { agreed: boolean[]; onComplete: (v: boolean[]) => void }) {
  const [agreed, setAgreed] = useState<boolean[]>(agreedInit.length ? agreedInit : SELF_ATTESTATION.map(() => false));
  const allAgreed = agreed.every(Boolean);

  function toggle(i: number) {
    const next = agreed.map((v, idx) => idx === i ? !v : v);
    setAgreed(next);
    onComplete(next);
  }

  return (
    <div className="space-y-4">
      <div className="ai-tip mb-5">
        <Sparkles size={15} className="text-brand-blue mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700/80">Please read each statement carefully and confirm it applies to your business before checking.</p>
      </div>
      {SELF_ATTESTATION.map((stmt, i) => (
        <button key={i} onClick={() => toggle(i)}
          className={cn("w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all",
            agreed[i] ? "border-green-400 bg-green-50/40" : "border-gray-200 hover:border-gray-300")}>
          <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
            agreed[i] ? "bg-green-500 border-green-500" : "border-gray-300 bg-white")}>
            {agreed[i] && <svg viewBox="0 0 10 8" className="w-3 h-3"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{stmt}</p>
        </button>
      ))}
      {allAgreed && (
        <div className="flex items-center gap-2 text-sm text-green-700 font-semibold bg-green-50 border border-green-200 rounded-xl p-3">
          <CheckCircle size={15} />{`All ${SELF_ATTESTATION.length} attestations confirmed`}
        </div>
      )}
    </div>
  );
}

function CertificatePreview({ certType }: { certType: CertType }) {
  const certNum = "WEC-2026-" + Math.random().toString(36).substr(2, 8).toUpperCase();
  const expiry  = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      {/* Certificate mockup */}
      <div className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border-2 border-brand-indigo/20 p-8 text-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-banner-gradient" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-purple/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-brand-blue/5 rounded-full" />

        <div className="relative z-10">
          <div className="w-14 h-14 bg-brand-indigo rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Award size={26} className="text-white" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Certificate of</p>
          <h2 className="font-display font-bold text-2xl text-brand-indigo mb-1">
            {certType === "self" ? "Self-Certification" : "Digital Certification"}
          </h2>
          <p className="text-sm text-gray-500 mb-5">Women-Owned Business · WEConnect Platform</p>

          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 text-left">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">Certificate Number</p><p className="font-bold text-gray-900 mt-0.5">{certNum}</p></div>
              <div><p className="text-xs text-gray-400">Issued By</p><p className="font-bold text-gray-900 mt-0.5">WEConnect</p></div>
              <div><p className="text-xs text-gray-400">Issue Date</p><p className="font-bold text-gray-900 mt-0.5">{new Date().toLocaleDateString("en-US", {year:"numeric",month:"long",day:"numeric"})}</p></div>
              <div><p className="text-xs text-gray-400">Expires</p><p className="font-bold text-gray-900 mt-0.5">{expiry}</p></div>
            </div>
          </div>

          {certType === "digital" && (
            <div className="bg-brand-indigo/5 rounded-xl p-3 mb-4 flex items-center gap-3">
              <Link2 size={16} className="text-brand-indigo shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-brand-indigo">QID Blockchain Verified</p>
                <p className="text-xs text-gray-500 font-mono truncate">0x7f3a...d94e · QID-{certNum}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center">
              <QrCode size={32} className="text-white" />
            </div>
            <div className="text-left text-xs text-gray-400">
              <p>Scan to verify</p>
              <p className="font-mono">verify.weconnect.com</p>
              <p className="font-mono">/{certNum}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-outline gap-2"><Download size={15} />Download PDF</button>
        <button className="btn-outline gap-2"><Link2 size={15} />Copy Verify URL</button>
      </div>

      {certType === "digital" && (
        <div className="card bg-blue-50 border-blue-100">
          <div className="flex items-start gap-3">
            <Shield size={18} className="text-brand-blue mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm text-brand-blue">Blockchain Anchoring in Progress</p>
              <p className="text-xs text-blue-700/70 mt-0.5 leading-relaxed">Your certificate is being anchored to the QID blockchain. This creates an immutable, tamper-proof record. You'll receive a confirmation email with the transaction hash within 1 hour.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertifyPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const preselected   = searchParams.get("type") as CertType | null;

  const [phase, setPhase]     = useState<Phase>("choose");
  const [certType, setCertType] = useState<CertType | null>(preselected);
  const [attestation, setAtt] = useState<boolean[]>([]);
  const [docsUploaded, setDocs] = useState<Record<string, boolean>>({});

  const allAttested     = attestation.length > 0 && attestation.every(Boolean);
  const requiredDocs    = certType ? REQUIRED_DOCS[certType] ?? [] : [];
  const allDocsUploaded = requiredDocs.every(d => docsUploaded[d.type]);

  const PHASES: { key: Phase; label: string; icon: React.ComponentType<any> }[] = [
    { key: "choose",    label: "Choose Path",   icon: Shield },
    { key: "attest",    label: "Attestation",   icon: FileText },
    { key: "documents", label: "Documents",     icon: FileText },
    { key: "review",    label: "Review",        icon: CheckCircle },
    { key: "issued",    label: "Certificate",   icon: Award },
  ];
  const phaseIdx = PHASES.findIndex(p => p.key === phase);

  function canAdvance() {
    switch (phase) {
      case "choose":    return certType !== null;
      case "attest":    return allAttested;
      case "documents": return allDocsUploaded;
      case "review":    return true;
      default: return false;
    }
  }

  function advance() {
    const idx = PHASES.findIndex(p => p.key === phase);
    if (idx < PHASES.length - 1) setPhase(PHASES[idx + 1].key);
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center shrink-0">
            <Award size={24} className="text-brand-purple" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900">Step 3: Certify</h1>
            <p className="text-gray-400 text-sm">Choose your certification path and complete the process</p>
          </div>
        </div>

        {/* Phase stepper */}
        <div className="flex items-center mb-8">
          {PHASES.map((p, i) => (
            <div key={p.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                  i < phaseIdx  ? "bg-green-500 text-white" :
                  i === phaseIdx ? "bg-brand-purple text-white ring-4 ring-brand-purple/20" :
                  "bg-gray-100 text-gray-400")}>
                  {i < phaseIdx ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span className={cn("text-[10px] font-medium", i === phaseIdx ? "text-gray-900" : "text-gray-400")}>{p.label}</span>
              </div>
              {i < PHASES.length - 1 && <div className={cn("flex-1 h-0.5 mx-1.5 mb-4", i < phaseIdx ? "bg-green-300" : "bg-gray-200")} />}
            </div>
          ))}
        </div>

        {/* Phase content */}
        <div key={phase} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-6 animate-slide-up">
          {phase === "choose" && (
            <>
              <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Choose Your Certification Path</h2>
              <p className="text-gray-500 text-sm mb-6">Select the certification level that best fits your business goals.</p>
              <CertTypePicker value={certType} onChange={setCertType} />
            </>
          )}

          {phase === "attest" && (
            <>
              <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Self-Attestation</h2>
              <p className="text-gray-500 text-sm mb-6">Please confirm each statement below to complete your attestation.</p>
              <AttestationForm agreed={attestation} onComplete={setAtt} />
            </>
          )}

          {phase === "documents" && certType && (
            <>
              <h2 className="font-display font-bold text-xl text-gray-900 mb-1">Upload Documents</h2>
              <p className="text-gray-500 text-sm mb-6">
                {certType === "self" ? "Upload your ownership and incorporation documents for verification." : "Digital certification requires additional governance and shareholder documentation."}
              </p>
              <div className="space-y-5">
                {requiredDocs.map(doc => (
                  <div key={doc.type}>
                    <FileUpload label={doc.label} onUpload={() => setDocs(prev => ({ ...prev, [doc.type]: true }))} />
                    {docsUploaded[doc.type] && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-green-600 font-medium">
                        <CheckCircle size={13} />Uploaded successfully
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {phase === "review" && certType && (
            <>
              <h2 className="font-display font-bold text-xl text-gray-900 mb-5">Review & Submit</h2>
              <div className="space-y-4">
                {[
                  { label: "Certification Type", value: certType === "self" ? "Self-Certification ($199/yr)" : "Digital Certification ($799/yr)" },
                  { label: "Attestation",         value: `${SELF_ATTESTATION.length} statements confirmed` },
                  { label: "Documents",           value: `${requiredDocs.length} documents uploaded` },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700 leading-relaxed">
                  <strong>What happens next:</strong> Our team will review your application. {certType === "digital" && "Your certificate will be anchored to the QID blockchain for immutable verification. "}You'll receive your certificate within 24–48 hours.
                </p>
              </div>
            </>
          )}

          {phase === "issued" && certType && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle size={22} className="text-green-500" />
                <h2 className="font-display font-bold text-xl text-gray-900">Your Certificate is Ready!</h2>
              </div>
              <CertificatePreview certType={certType} />
            </>
          )}

          {/* Nav buttons */}
          {phase !== "issued" && (
            <div className="flex justify-end mt-6">
              <button onClick={advance} disabled={!canAdvance()}
                className={cn("flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition-all",
                  canAdvance() ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
                {phase === "review" ? "Submit Application" : "Continue"}
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {phase === "issued" && (
            <div className="flex gap-3 mt-6">
              <button onClick={() => router.push("/dashboard")} className="btn-blue flex-1">
                Back to Dashboard <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
