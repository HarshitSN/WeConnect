import test from "node:test";
import assert from "node:assert/strict";

import { POST } from "@/app/api/register-voice-agent/route";
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

function makeRequest(payload: { pointer: ConversationPointer; answer: string; state: RegistrationState }) {
  return new Request("http://localhost/api/register-voice-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

test("route prefers Groq result when valid", async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  const previousModel = process.env.GROQ_MODEL;
  const previousMode = process.env.VOICE_AGENT_BRAIN_MODE;

  process.env.GROQ_API_KEY = "test_key";
  process.env.GROQ_MODEL = "test_model";
  process.env.VOICE_AGENT_BRAIN_MODE = "hybrid_guarded";

  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ok: true,
                confidence: 0.88,
                confirmation: "Captured your business name.",
                updates: { business_name: "Acme Labs LLC" },
                next: { stepId: "women_owned" },
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const response = await POST(
      makeRequest({
        pointer: { stepId: "business_name" },
        answer: "Acme Labs LLC",
        state: baseState(),
      }),
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.result.confirmation, "Captured your business name.");
    assert.equal(data.result.next.stepId, "women_owned");
    assert.equal(data.result.updates.business_name, "Acme Labs LLC");
  } finally {
    global.fetch = previousFetch;
    process.env.GROQ_API_KEY = previousKey;
    process.env.GROQ_MODEL = previousModel;
    process.env.VOICE_AGENT_BRAIN_MODE = previousMode;
  }
});

test("route falls back to deterministic parser when Groq fails", async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  const previousMode = process.env.VOICE_AGENT_BRAIN_MODE;

  process.env.GROQ_API_KEY = "test_key";
  process.env.VOICE_AGENT_BRAIN_MODE = "hybrid_guarded";

  global.fetch = (async () => {
    throw new Error("simulated timeout");
  }) as typeof fetch;

  try {
    const response = await POST(
      makeRequest({
        pointer: { stepId: "business_name" },
        answer: "Acme Labs LLC",
        state: baseState(),
      }),
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.result.next.stepId, "women_owned");
    assert.match(data.result.confirmation, /got it/i);
  } finally {
    global.fetch = previousFetch;
    process.env.GROQ_API_KEY = previousKey;
    process.env.VOICE_AGENT_BRAIN_MODE = previousMode;
  }
});

test("route falls back when Groq returns invalid next step", async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  const previousMode = process.env.VOICE_AGENT_BRAIN_MODE;

  process.env.GROQ_API_KEY = "test_key";
  process.env.VOICE_AGENT_BRAIN_MODE = "hybrid_guarded";

  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ok: true,
                confidence: 0.88,
                confirmation: "Captured.",
                updates: { business_name: "Acme Labs LLC" },
                next: { stepId: "not_a_real_step" },
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const response = await POST(
      makeRequest({
        pointer: { stepId: "business_name" },
        answer: "Acme Labs LLC",
        state: baseState(),
      }),
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.result.next.stepId, "women_owned");
    assert.match(data.result.confirmation, /got it/i);
  } finally {
    global.fetch = previousFetch;
    process.env.GROQ_API_KEY = previousKey;
    process.env.VOICE_AGENT_BRAIN_MODE = previousMode;
  }
});

test("route falls back when Groq returns a valid but unsafe backward transition", async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  const previousMode = process.env.VOICE_AGENT_BRAIN_MODE;

  process.env.GROQ_API_KEY = "test_key";
  process.env.VOICE_AGENT_BRAIN_MODE = "hybrid_guarded";

  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ok: true,
                confidence: 0.9,
                confirmation: "Women-owned confirmation received.",
                updates: { women_owned: true },
                next: { stepId: "business_name" },
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const response = await POST(
      makeRequest({
        pointer: { stepId: "women_owned" },
        answer: "Yes, it is.",
        state: baseState({ business_name: "Domino's" }),
      }),
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.result.next.stepId, "country");
  } finally {
    global.fetch = previousFetch;
    process.env.GROQ_API_KEY = previousKey;
    process.env.VOICE_AGENT_BRAIN_MODE = previousMode;
  }
});

test("route falls back when Groq returns ok without required step updates", async () => {
  const previousFetch = global.fetch;
  const previousKey = process.env.GROQ_API_KEY;
  const previousMode = process.env.VOICE_AGENT_BRAIN_MODE;

  process.env.GROQ_API_KEY = "test_key";
  process.env.VOICE_AGENT_BRAIN_MODE = "hybrid_guarded";

  global.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ok: true,
                confidence: 0.91,
                confirmation: "Great, noted as women-owned!",
                next: { stepId: "country" },
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    const response = await POST(
      makeRequest({
        pointer: { stepId: "women_owned" },
        answer: "Yes, it is.",
        state: baseState({ business_name: "Domino's" }),
      }),
    );
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.result.next.stepId, "country");
    assert.equal(data.result.updates.women_owned, true);
  } finally {
    global.fetch = previousFetch;
    process.env.GROQ_API_KEY = previousKey;
    process.env.VOICE_AGENT_BRAIN_MODE = previousMode;
  }
});
