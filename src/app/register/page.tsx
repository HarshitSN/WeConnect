"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, CreditCard, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConversationRegistrationShell from "@/components/register/ConversationRegistrationShell";
import EndScreenSummary from "@/components/register/EndScreenSummary";
import { initialPointer } from "@/lib/voice-agent/engine";
import { CERT_PRICING, MOCK_ASSESSORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CertType, ConversationPointer, RegistrationState } from "@/types";
import { pageEnter, panelLift } from "@/lib/motion";

const EMPTY: RegistrationState = {
  business_name: "", women_owned: null, country: "",
  us_citizen: null, webank_certified: null, visa_type: "",
  naics_codes: [], unspsc_codes: [], designations: [],
  additional_certs: "", business_description: "",
  ein: "", address: "", num_employees: "", revenue_range: "",
  ownership_structure: [{ name: "", gender: "female", percent: 0 }],
  cert_type: undefined, payment_complete: false,
};

function PaymentForm({ certType, assessorId, onComplete }: { certType: CertType | undefined; assessorId?: string; onComplete: () => void }) {
  const [cardNum, setCardNum] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const baseCost = certType ? (CERT_PRICING[certType].price ?? 0) : 0;
  const assessor = MOCK_ASSESSORS.find((a) => a.id === assessorId);
  const assessFee = assessor ? (certType === "self" ? assessor.fee_self : assessor.fee_digital) : 0;
  const total = baseCost + assessFee;

  function handlePay() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onComplete();
    }, 1800);
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-2">Order Summary</p>
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

      <input className="input-field" placeholder="Cardholder Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className="input-field"
        placeholder="4242 4242 4242 4242"
        value={cardNum}
        onChange={(e) => setCardNum(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19))}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          className="input-field"
          placeholder="MM/YY"
          value={expiry}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            setExpiry(v.length >= 2 ? `${v.slice(0, 2)}/${v.slice(2, 4)}` : v);
          }}
        />
        <input className="input-field" placeholder="CVV" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} />
      </div>

      <button onClick={handlePay} disabled={!cardNum || !expiry || !cvv || !name || loading} className="btn-purple w-full gap-2 py-3">
        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CreditCard size={16} />}
        {loading ? "Processing..." : `Pay $${total}`}
      </button>
      <p className="text-xs text-center text-gray-400">Secured by Stripe · TLS 1.3 encryption</p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<RegistrationState>(EMPTY);
  const [assessorId, setAssessorId] = useState<string>("");
  const [paid, setPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPointer, setCurrentPointer] = useState<ConversationPointer>(initialPointer());
  const [voiceFlowDone, setVoiceFlowDone] = useState(false);

  useEffect(() => {
    setPaid(false);
  }, [answers.cert_type, assessorId]);

  // Track when voice flow reaches "done"
  useEffect(() => {
    if (currentPointer.stepId === "done") setVoiceFlowDone(true);
  }, [currentPointer.stepId]);

  const isUS = answers.country.toLowerCase().includes("united states") || answers.country.toLowerCase() === "us" || answers.country.toLowerCase() === "usa";

  const isValid =
    answers.business_name.trim().length > 0 &&
    answers.women_owned !== null &&
    answers.country.trim().length > 0 &&
    (!isUS || (answers.us_citizen !== null && (answers.us_citizen || answers.visa_type) && answers.webank_certified !== null)) &&
    answers.naics_codes.length > 0 &&
    answers.unspsc_codes.length > 0 &&
    answers.ownership_structure.every((e) => e.name && e.percent > 0) &&
    answers.ownership_structure.reduce((s, e) => s + Number(e.percent), 0) === 100 &&
    answers.business_description.trim().length >= 30 &&
    answers.cert_type !== undefined &&
    paid;

  function handleSubmit() {
    if (!isValid) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/verify");
    }, 1500);
  }

  return (
    <motion.div className="min-h-screen bg-hero-gradient" variants={pageEnter()} initial="hidden" animate="visible">
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-16">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-6">
          ← Back to Dashboard
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
            <ClipboardList size={24} className="text-brand-blue" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-gray-900">Register Your Business</h1>
            <p className="text-gray-400 text-sm">Voice-first conversational form filling with live editable summary</p>
          </div>
        </div>

        {/* End screen celebration when voice flow is done */}
        <AnimatePresence>
          {voiceFlowDone && (
            <motion.div className="mb-6" variants={panelLift} initial="hidden" animate="visible" exit="hidden">
              <EndScreenSummary answers={answers} onSubmit={handleSubmit} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto">
          <motion.div className="glass-card p-5 space-y-4 interactive-surface" variants={panelLift} initial="hidden" animate="visible">
            <ConversationRegistrationShell
              answers={answers}
              setAnswers={setAnswers}
              assessorId={assessorId}
              setAssessorId={setAssessorId}
              onPointerChange={setCurrentPointer}
            />
          </motion.div>
        </div>

        <motion.section className="glass-card p-6 mt-6 space-y-4 interactive-surface" variants={panelLift} initial="hidden" animate="visible">
          <h2 className="font-semibold text-gray-900 text-lg">Payment</h2>
          {!answers.cert_type && (
            <p className="text-sm text-gray-500">Choose a certification path first (voice or manual panel) to continue payment.</p>
          )}

          {answers.cert_type && (
            <>
              {paid ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <CheckCircle size={20} className="text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">Payment Successful</p>
                    <p className="text-xs text-green-600">Your certification application is ready to submit.</p>
                  </div>
                </div>
              ) : (
                <PaymentForm certType={answers.cert_type} assessorId={assessorId} onComplete={() => setPaid(true)} />
              )}
            </>
          )}
        </motion.section>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={cn(
              "flex items-center gap-2 text-sm font-semibold px-8 py-3 rounded-xl transition-all",
              isValid && !isSubmitting ? "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]" : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Complete Registration
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
