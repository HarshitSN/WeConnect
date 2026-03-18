"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, ArrowRight, RefreshCw, Building, MapPin, Fingerprint, Copy } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import RiskBadge from "@/components/ui/RiskBadge";
import { cn } from "@/lib/utils";

type CheckStatus = "pending" | "running" | "passed" | "failed" | "flagged";

interface Check {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  status: CheckStatus;
  detail?: string;
}

const INITIAL_CHECKS: Check[] = [
  { id: "sanctions", label: "Sanctions Screening", description: "OFAC, UN, EU watchlists", icon: Shield, status: "pending" },
  { id: "entity",    label: "Business Entity Verification", description: "State business registry lookup", icon: Building, status: "pending" },
  { id: "address",   label: "Address Verification", description: "USPS & Google Maps validation", icon: MapPin, status: "pending" },
  { id: "duplicate", label: "Duplicate Detection", description: "Checking for existing registrations", icon: Copy, status: "pending" },
  { id: "ein",       label: "EIN Verification", description: "IRS database check (where available)", icon: Fingerprint, status: "pending" },
];

type VerificationScenario = "auto_approve" | "manual_review" | "rejected";

function getCheckIcon(status: CheckStatus) {
  switch (status) {
    case "passed":  return <CheckCircle size={16} className="text-green-500" />;
    case "failed":  return <XCircle size={16} className="text-red-500" />;
    case "flagged": return <AlertTriangle size={16} className="text-amber-500" />;
    case "running": return <div className="w-4 h-4 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />;
    default:        return <div className="w-4 h-4 rounded-full bg-gray-200" />;
  }
}

export default function VerifyPage() {
  const router = useRouter();
  const [checks, setChecks]         = useState<Check[]>(INITIAL_CHECKS);
  const [phase, setPhase]           = useState<"idle" | "running" | "done">("idle");
  const [riskScore, setRiskScore]   = useState<number | null>(null);
  const [scenario, setScenario]     = useState<VerificationScenario>("auto_approve");
  const [elapsedSeconds, setElapsed] = useState(0);

  function startVerification() {
    setPhase("running");
    setElapsed(0);
    setChecks(INITIAL_CHECKS.map(c => ({ ...c, status: "pending" })));

    const delays = [600, 1200, 2000, 2700, 3400];
    const results: CheckStatus[] =
      scenario === "auto_approve" ? ["passed", "passed", "passed", "passed", "passed"] :
      scenario === "manual_review" ? ["flagged", "passed", "passed", "passed", "passed"] :
      ["passed", "failed", "passed", "passed", "passed"];

    const details: Record<string, string> = {
      auto_approve: { sanctions: "No matches found", entity: "Verified: Active business", address: "Address confirmed", duplicate: "No duplicates detected", ein: "EIN confirmed" } as any,
      manual_review: { sanctions: "Potential partial match — requires manual review", entity: "Business confirmed", address: "Address confirmed", duplicate: "No duplicates detected", ein: "EIN confirmed" } as any,
      rejected: { sanctions: "No matches found", entity: "Entity not found in state registry", address: "Address unverified", duplicate: "No duplicates detected", ein: "EIN mismatch" } as any,
    }[scenario];

    // run first check immediately
    setChecks(prev => prev.map((c, i) => i === 0 ? { ...c, status: "running" } : c));

    delays.forEach((delay, i) => {
      setTimeout(() => {
        setChecks(prev => prev.map((c, idx) => {
          if (idx === i) return { ...c, status: results[i], detail: details[c.id] };
          if (idx === i + 1) return { ...c, status: "running" };
          return c;
        }));
        if (i === delays.length - 1) {
          setTimeout(() => {
            const score = scenario === "auto_approve" ? 88 : scenario === "manual_review" ? 55 : 22;
            setRiskScore(score);
            setPhase("done");
          }, 500);
        }
      }, delay);
    });
  }

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const allDone = phase === "done";
  const outcome =
    riskScore == null ? null :
    riskScore >= 70 ? "auto_approve" :
    riskScore >= 40 ? "manual_review" : "rejected";

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
            <Shield size={24} className="text-green-600" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900">Step 2: Verify</h1>
            <p className="text-gray-400 text-sm">Automated sanctions & entity verification</p>
          </div>
        </div>

        {/* Scenario picker (demo only) */}
        <div className="card mb-6">
          <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Demo: Select Outcome</p>
          <div className="flex gap-2">
            {(["auto_approve","manual_review","rejected"] as VerificationScenario[]).map(s => (
              <button key={s} onClick={() => setScenario(s)}
                className={cn("flex-1 text-xs font-semibold py-2 rounded-lg border transition-all",
                  scenario === s ? "bg-brand-indigo text-white border-brand-indigo" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}>
                {s === "auto_approve" ? "✅ Auto Approve" : s === "manual_review" ? "🔍 Manual Review" : "❌ Reject"}
              </button>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="card mb-6">
          {phase === "idle" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield size={28} className="text-brand-blue" />
              </div>
              <h2 className="font-bold text-gray-900 text-lg mb-2">Ready to verify your business</h2>
              <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                We'll run automated checks across OFAC/UN sanctions lists, state business registries, address databases, and duplicate detection.
              </p>
              <button onClick={startVerification} className="btn-blue w-auto px-8 py-3 inline-flex">
                <Shield size={16} />Start Verification
              </button>
            </div>
          )}

          {(phase === "running" || phase === "done") && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900">Running Checks</h2>
                {phase === "running" && (
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <RefreshCw size={11} className="animate-spin" />{elapsedSeconds}s elapsed
                  </span>
                )}
                {allDone && riskScore !== null && <RiskBadge score={riskScore} />}
              </div>

              <div className="space-y-3">
                {checks.map(check => (
                  <div key={check.id}
                    className={cn("flex items-center gap-4 p-4 rounded-xl border transition-all",
                      check.status === "passed"  ? "bg-green-50/50 border-green-100" :
                      check.status === "failed"  ? "bg-red-50/50 border-red-100" :
                      check.status === "flagged" ? "bg-amber-50/50 border-amber-100" :
                      check.status === "running" ? "bg-blue-50/50 border-blue-100" :
                      "bg-gray-50 border-gray-100")}>
                    <div className="w-9 h-9 bg-white rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                      <check.icon size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{check.label}</p>
                        {getCheckIcon(check.status)}
                      </div>
                      <p className="text-xs text-gray-400">{check.detail ?? check.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Outcome */}
              {allDone && outcome && (
                <div className={cn("mt-6 rounded-xl p-5 border",
                  outcome === "auto_approve"   ? "bg-green-50 border-green-200" :
                  outcome === "manual_review"  ? "bg-amber-50 border-amber-200" :
                  "bg-red-50 border-red-200")}>
                  <div className="flex items-start gap-3">
                    {outcome === "auto_approve"  && <CheckCircle size={20} className="text-green-500 shrink-0 mt-0.5" />}
                    {outcome === "manual_review" && <Clock size={20} className="text-amber-500 shrink-0 mt-0.5" />}
                    {outcome === "rejected"      && <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />}
                    <div>
                      <p className="font-bold text-sm mb-1">
                        {outcome === "auto_approve"  ? "Verification Passed — Auto Approved" :
                         outcome === "manual_review" ? "Flagged for Manual Review" :
                         "Verification Failed"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {outcome === "auto_approve"  ? "Your business has passed all automated checks. You can now choose your certification path." :
                         outcome === "manual_review" ? "A partial match was found. Our compliance team will review your application within 24 hours. You'll be notified via email." :
                         "We were unable to verify your business entity. Please review your registration details and resubmit, or contact support."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {allDone && (
                <div className="mt-5 flex gap-3">
                  {outcome === "auto_approve" && (
                    <button onClick={() => router.push("/certify")} className="btn-blue flex-1 py-3">
                      Choose Certification <ArrowRight size={15} />
                    </button>
                  )}
                  {outcome === "manual_review" && (
                    <button onClick={() => router.push("/dashboard")} className="btn-outline flex-1">
                      Back to Dashboard
                    </button>
                  )}
                  {outcome === "rejected" && (
                    <>
                      <button onClick={() => { setPhase("idle"); setChecks(INITIAL_CHECKS.map(c=>({...c,status:"pending"}))); setRiskScore(null); }}
                        className="btn-outline flex-1">
                        <RefreshCw size={14} />Retry
                      </button>
                      <button onClick={() => router.push("/dashboard")} className="btn-outline flex-1">
                        Edit Registration
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        {phase === "idle" && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Shield, label: "OFAC / UN Screening", desc: "Global sanctions lists checked in real-time" },
              { icon: Building, label: "Registry Lookup", desc: "State & national business entity verification" },
              { icon: CheckCircle, label: "90% Auto-Approved", desc: "Most applicants verified within 24 hours" },
            ].map(item => (
              <div key={item.label} className="card text-center p-4">
                <item.icon size={20} className="mx-auto text-brand-blue mb-2" />
                <p className="text-xs font-semibold text-gray-900 mb-1">{item.label}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
