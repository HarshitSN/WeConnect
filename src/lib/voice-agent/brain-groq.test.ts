import test from "node:test";
import assert from "node:assert/strict";

import { applyHybridGuardrails, normalizeGroqAgentResult } from "@/lib/voice-agent/brain-groq";
import type { ConversationPointer, RegistrationState } from "@/types";

function baseState(overrides: Partial<RegistrationState> = {}): RegistrationState {
  return {
    business_name: "",
    women_owned: null,
    country: "",
    us_citizen: null,
    webank_certified: null,
    visa_type: "",
    naics_codes: [],
    unspsc_codes: [],
    designations: [],
    additional_certs: "",
    business_description: "",
    ein: "",
    address: "",
    num_employees: "",
    revenue_range: "",
    ownership_structure: [{ name: "", gender: "female", percent: 0 }],
    cert_type: undefined,
    payment_complete: false,
    ...overrides,
  };
}

test("normalizeGroqAgentResult maps valid raw output", () => {
  const pointer: ConversationPointer = { stepId: "business_name" };
  const result = normalizeGroqAgentResult(
    {
      ok: true,
      confidence: 0.9,
      confirmation: "Great, noted.",
      updates: { business_name: "Acme Labs LLC" },
      next: { stepId: "women_owned" },
    },
    pointer,
  );

  assert.ok(result);
  assert.equal(result.ok, true);
  assert.equal(result.next.stepId, "women_owned");
  assert.equal(result.updates?.business_name, "Acme Labs LLC");
});

test("normalizeGroqAgentResult uses safe defaults when optional fields are missing", () => {
  const pointer: ConversationPointer = { stepId: "country", ownerIndex: 2 };
  const result = normalizeGroqAgentResult({}, pointer);

  assert.ok(result);
  assert.equal(result.ok, false);
  assert.equal(result.next.stepId, "country");
  assert.equal(result.next.ownerIndex, 2);
  assert.equal(result.confirmation.length > 0, true);
  assert.equal(result.confidence >= 0 && result.confidence <= 1, true);
});

test("normalizeGroqAgentResult rejects invalid next step ids", () => {
  const pointer: ConversationPointer = { stepId: "business_name" };
  const result = normalizeGroqAgentResult(
    {
      ok: true,
      confirmation: "done",
      next: { stepId: "invalid_step_id" },
    },
    pointer,
  );
  assert.equal(result, null);
});

test("applyHybridGuardrails blocks ownership totals greater than 100", () => {
  const state = baseState({
    ownership_structure: [{ name: "A", gender: "female", percent: 60 }],
  });
  const guarded = applyHybridGuardrails(
    {
      ok: true,
      confidence: 1.2,
      confirmation: "Saved.",
      next: { stepId: "owner_add_more" },
      ownershipUpdate: [
        { name: "A", gender: "female", percent: 60 },
        { name: "B", gender: "male", percent: 50 },
      ],
    },
    { stepId: "owner_details", ownerIndex: 1 },
    state,
  );

  assert.equal(guarded.ok, false);
  assert.equal(guarded.next.stepId, "owner_details");
  assert.match(guarded.clarification ?? "", /total equals 100 percent/i);
  assert.equal(guarded.confidence, 1);
});

test("applyHybridGuardrails requires full owner details in owner_details step", () => {
  const state = baseState();
  const guarded = applyHybridGuardrails(
    {
      ok: true,
      confidence: 0.8,
      confirmation: "Captured.",
      next: { stepId: "owner_add_more" },
      ownershipUpdate: [{ name: "", gender: "female", percent: 0 }],
    },
    { stepId: "owner_details", ownerIndex: 0 },
    state,
  );

  assert.equal(guarded.ok, false);
  assert.equal(guarded.next.stepId, "owner_details");
  assert.match(guarded.clarification ?? "", /full name, gender, and ownership percentage/i);
});
