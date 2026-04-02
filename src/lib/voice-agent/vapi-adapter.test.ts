import test from "node:test";
import assert from "node:assert/strict";

import {
  buildVapiContextMessage,
  extractFinalAssistantTranscript,
  extractFinalUserTranscript,
  extractProcessRegistrationTurnAnswer,
  isFillerUtterance,
  isYesNoLikeUtterance,
  normalizeUtterance,
} from "@/lib/voice-agent/vapi-adapter";
import type { ConversationMessage, RegistrationState } from "@/types";

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

function mkMessage(type: ConversationMessage["type"], text: string): ConversationMessage {
  return {
    id: `${Date.now()}-${Math.random()}`,
    type,
    text,
    timestamp: new Date().toISOString(),
  };
}

test("buildVapiContextMessage includes pointer, full state, and recent turns", () => {
  const payload = buildVapiContextMessage({
    pointer: { stepId: "country" },
    state: baseState({ business_name: "Domino's", women_owned: true }),
    assessorId: "a1",
    messages: [mkMessage("bot_question", "Question"), mkMessage("user_answer", "Answer")],
  });
  const parsed = JSON.parse(payload) as Record<string, unknown>;

  assert.equal(parsed.type, "weconnect-registration-context");
  assert.equal((parsed.pointer as { stepId: string }).stepId, "country");
  assert.equal((parsed.registrationState as { business_name: string }).business_name, "Domino's");
  assert.equal((parsed.recentTurns as unknown[]).length, 2);
});

test("extractFinalUserTranscript returns only final user transcript", () => {
  assert.equal(
    extractFinalUserTranscript({ type: "transcript", role: "user", transcriptType: "final", transcript: "In Pakistan" }),
    "In Pakistan",
  );
  assert.equal(
    extractFinalUserTranscript({ type: "transcript", role: "assistant", transcriptType: "final", transcript: "Hello" }),
    null,
  );
  assert.equal(
    extractFinalUserTranscript({ type: "transcript", role: "user", transcriptType: "partial", transcript: "In Pa..." }),
    null,
  );
  assert.equal(
    extractFinalUserTranscript({ type: "transcript", role: "user", transcript: "In Pakistan" }),
    "In Pakistan",
  );
  assert.equal(
    extractFinalUserTranscript({
      type: "conversation-update",
      messages: [{ role: "assistant", content: "Hello" }, { role: "user", content: "Yes, it is." }],
    }),
    "Yes, it is.",
  );
});

test("extractFinalAssistantTranscript returns only final assistant transcript", () => {
  assert.equal(
    extractFinalAssistantTranscript({ type: "transcript", role: "assistant", transcriptType: "final", transcript: "Try NAICS 72." }),
    "Try NAICS 72.",
  );
  assert.equal(
    extractFinalAssistantTranscript({ type: "transcript", role: "assistant", transcriptType: "partial", transcript: "Try..." }),
    null,
  );
  assert.equal(
    extractFinalAssistantTranscript({ type: "transcript", role: "user", transcriptType: "final", transcript: "hello" }),
    null,
  );
});

test("extractProcessRegistrationTurnAnswer reads answer from tool-calls payload", () => {
  const message = {
    type: "tool-calls",
    toolCallList: [
      {
        function: {
          name: "process_registration_turn",
          arguments: "{\"answer\":\"Domino's\"}",
        },
      },
    ],
  };

  assert.equal(extractProcessRegistrationTurnAnswer(message), "Domino's");
});

test("utterance helpers classify short yes/no and filler phrases", () => {
  assert.equal(normalizeUtterance("  Yes. It is! "), "yes it is");
  assert.equal(isYesNoLikeUtterance("Yes"), true);
  assert.equal(isYesNoLikeUtterance("It is"), true);
  assert.equal(isYesNoLikeUtterance("In India"), false);

  assert.equal(isFillerUtterance("okay"), true);
  assert.equal(isFillerUtterance("continue"), true);
  assert.equal(isFillerUtterance("72 accommodation and food services"), false);
});

// --- Comment 1 regression tests: tool-call answer extraction prefers newest ---

test("extractProcessRegistrationTurnAnswer returns newest answer when multiple tool calls exist", () => {
  const message = {
    type: "tool-calls",
    toolCallList: [
      {
        function: {
          name: "process_registration_turn",
          arguments: '{"answer":"Old Answer"}',
        },
      },
      {
        function: {
          name: "process_registration_turn",
          arguments: '{"answer":"New Answer"}',
        },
      },
    ],
  };

  assert.equal(extractProcessRegistrationTurnAnswer(message), "New Answer");
});

test("extractProcessRegistrationTurnAnswer falls back to second-to-last when newest has empty answer", () => {
  const message = {
    type: "tool-calls",
    toolCallList: [
      {
        function: {
          name: "process_registration_turn",
          arguments: '{"answer":"Valid Answer"}',
        },
      },
      {
        function: {
          name: "process_registration_turn",
          arguments: '{"answer":""}',
        },
      },
    ],
  };

  assert.equal(extractProcessRegistrationTurnAnswer(message), "Valid Answer");
});

test("extractProcessRegistrationTurnAnswer returns null when all calls have invalid answers", () => {
  const message = {
    type: "tool-calls",
    toolCallList: [
      {
        function: {
          name: "process_registration_turn",
          arguments: '{"answer":""}',
        },
      },
      {
        function: {
          name: "process_registration_turn",
          arguments: '{"answer":"   "}',
        },
      },
      {
        function: {
          name: "other_function",
          arguments: '{"answer":"Valid but wrong function"}',
        },
      },
    ],
  };

  assert.equal(extractProcessRegistrationTurnAnswer(message), null);
});

// --- Comment 2 regression tests: conversation-update stale transcript filtering ---

test("extractFinalUserTranscript conversation-update returns only last non-duplicate user entry", () => {
  const message = {
    type: "conversation-update",
    messages: [
      { role: "assistant", content: "What is your business name?" },
      { role: "user", content: "Domino's" },
      { role: "assistant", content: "Is it women-owned?" },
      { role: "user", content: "Yes" },
    ],
  };

  assert.equal(extractFinalUserTranscript(message), "Yes");
});

test("extractFinalUserTranscript conversation-update returns null when last two user entries are identical (stale duplicate)", () => {
  const message = {
    type: "conversation-update",
    messages: [
      { role: "assistant", content: "What is your business name?" },
      { role: "user", content: "Yes" },
      { role: "assistant", content: "Is it women-owned?" },
      { role: "user", content: "Yes" },
    ],
  };

  assert.equal(extractFinalUserTranscript(message), null);
});

test("extractFinalUserTranscript conversation-update ignores entries with final: false", () => {
  const message = {
    type: "conversation-update",
    messages: [
      { role: "assistant", content: "What country?" },
      { role: "user", content: "In Pak...", final: false },
      { role: "user", content: "In Pakistan" },
    ],
  };

  assert.equal(extractFinalUserTranscript(message), "In Pakistan");
});
