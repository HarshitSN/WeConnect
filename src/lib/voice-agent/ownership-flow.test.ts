import test from "node:test";
import assert from "node:assert/strict";

import { parseStepAnswer } from "@/lib/voice-agent/engine";
import { normalizeOwnerName, parseOwnerDetails } from "@/lib/voice-agent/normalizers";
import type { RegistrationState } from "@/types";

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

test("normalizeOwnerName strips noisy trailing connector fragments", () => {
  assert.equal(normalizeOwnerName("The full name is Priya Malhotra and her"), "Priya Malhotra");
  assert.equal(normalizeOwnerName("name is Priya Malhotra is the"), "Priya Malhotra");
});

test("parseOwnerDetails isolates owner name from sentence-style response", () => {
  const details = parseOwnerDetails(
    "The full name is Priya Malhotra and her gender is female and the ownership is 100 percent.",
  );
  assert.deepEqual(details, { name: "Priya Malhotra", gender: "female", percent: 100 });
});

test("owner_add_more moves forward when total is 100 and user says yes", () => {
  const result = parseStepAnswer(
    { stepId: "owner_add_more", ownerIndex: 0 },
    "yes",
    baseState({ ownership_structure: [{ name: "Priya Malhotra", gender: "female", percent: 100 }] }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.next.stepId, "num_employees");
});

test("owner_add_more moves forward when total is 100 and user says continue", () => {
  const result = parseStepAnswer(
    { stepId: "owner_add_more", ownerIndex: 0 },
    "continue",
    baseState({ ownership_structure: [{ name: "Priya Malhotra", gender: "female", percent: 100 }] }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.next.stepId, "num_employees");
});

test("owner_add_more keeps user in ownership when total is 100 and user says edit", () => {
  const result = parseStepAnswer(
    { stepId: "owner_add_more", ownerIndex: 0 },
    "edit",
    baseState({ ownership_structure: [{ name: "Priya Malhotra", gender: "female", percent: 100 }] }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.next.stepId, "owner_add_more");
  assert.match(result.clarification ?? "", /continue\/yes to move on, or say edit/i);
});

test("owner_add_more adds a new owner when total is below 100 and user says yes", () => {
  const result = parseStepAnswer(
    { stepId: "owner_add_more", ownerIndex: 0 },
    "yes",
    baseState({ ownership_structure: [{ name: "Priya Malhotra", gender: "female", percent: 60 }] }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.next.stepId, "owner_details");
  assert.equal(result.next.ownerIndex, 1);
  assert.equal(result.ownershipUpdate?.length, 2);
});

test("owner_add_more blocks completion when total is below 100 and user says no", () => {
  const result = parseStepAnswer(
    { stepId: "owner_add_more", ownerIndex: 0 },
    "no",
    baseState({ ownership_structure: [{ name: "Priya Malhotra", gender: "female", percent: 60 }] }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.next.stepId, "owner_add_more");
  assert.match(result.clarification ?? "", /must total 100 percent/i);
});

test("existing yes/no steps still parse explicit yes/no responses", () => {
  const womenOwned = parseStepAnswer({ stepId: "women_owned" }, "no", baseState());
  assert.equal(womenOwned.ok, true);
  assert.equal(womenOwned.updates?.women_owned, false);
  assert.equal(womenOwned.next.stepId, "country");

  const usCitizen = parseStepAnswer({ stepId: "us_citizen" }, "yes", baseState({ country: "United States" }));
  assert.equal(usCitizen.ok, true);
  assert.equal(usCitizen.updates?.us_citizen, true);
  assert.equal(usCitizen.next.stepId, "webank_certified");

  const webank = parseStepAnswer({ stepId: "webank_certified" }, "no", baseState());
  assert.equal(webank.ok, true);
  assert.equal(webank.updates?.webank_certified, false);
  assert.equal(webank.next.stepId, "naics_codes");
});
