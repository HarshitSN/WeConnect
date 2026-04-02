import type { AgentParseResult, ConversationPointer, ConversationStepId, OwnershipEntry, RegistrationState } from "@/types";

const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const WECONNECT_CONTEXT = `
You are the WeConnect Certification Voice Agent.
Goal: collect complete and accurate registration details for women-owned business certification.
Scope: registration flow only. Do not provide legal advice, immigration advice, or guaranteed outcomes.
Tone: concise, professional, warm, and action-focused.
Never fabricate policies, deadlines, assessor availability, or verification outcomes.
If uncertain, ask one precise follow-up question instead of guessing.
NAICS in this product uses major sector codes (for example 11, 21, 31-33) or sector labels.
UNSPSC in this product uses 8-digit category codes.
`.trim();

const VALID_STEP_IDS: ConversationStepId[] = [
  "business_name",
  "women_owned",
  "country",
  "us_citizen",
  "visa_type",
  "webank_certified",
  "naics_codes",
  "unspsc_codes",
  "designations",
  "owner_details",
  "owner_add_more",
  "num_employees",
  "revenue_range",
  "additional_certs",
  "business_description",
  "cert_type",
  "assessor",
  "done",
];

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeOwnerEntry(value: unknown): OwnershipEntry | null {
  const record = asRecord(value);
  if (!record) return null;

  const name = typeof record.name === "string" ? record.name.trim() : "";
  const genderRaw = asString(record.gender);
  const percent = asNumber(record.percent) ?? 0;
  const gender: OwnershipEntry["gender"] =
    genderRaw === "male" || genderRaw === "non_binary" || genderRaw === "other" ? genderRaw : "female";

  return {
    name,
    gender,
    percent: Number.isFinite(percent) ? percent : 0,
  };
}

export function clampConfidence(value: unknown): number {
  const num = typeof value === "number" && Number.isFinite(value) ? value : 0.6;
  return Math.max(0, Math.min(1, num));
}

export function isValidConversationStepId(stepId: string): stepId is ConversationStepId {
  return VALID_STEP_IDS.includes(stepId as ConversationStepId);
}

export function normalizeGroqAgentResult(
  raw: unknown,
  fallbackPointer: ConversationPointer,
): AgentParseResult | null {
  const record = asRecord(raw);
  if (!record) return null;

  const rawNext = asRecord(record.next);
  const rawStep = asString(rawNext?.stepId);
  if (rawStep && !isValidConversationStepId(rawStep)) {
    return null;
  }

  const nextStepId: ConversationStepId = rawStep && isValidConversationStepId(rawStep) ? rawStep : fallbackPointer.stepId;
  const next: ConversationPointer = {
    stepId: nextStepId,
  };

  const rawOwnerIndex = asNumber(rawNext?.ownerIndex);
  if (typeof rawOwnerIndex === "number" && rawOwnerIndex >= 0) {
    next.ownerIndex = Math.floor(rawOwnerIndex);
  } else if (typeof fallbackPointer.ownerIndex === "number") {
    next.ownerIndex = fallbackPointer.ownerIndex;
  }

  const normalized: AgentParseResult = {
    ok: asBoolean(record.ok) ?? false,
    confidence: clampConfidence(record.confidence),
    confirmation: asString(record.confirmation)?.trim() || "Let me confirm that and continue.",
    next,
  };

  const clarification = asString(record.clarification)?.trim();
  if (clarification) normalized.clarification = clarification;

  const updates = asRecord(record.updates);
  if (updates) normalized.updates = updates as Partial<RegistrationState>;

  if (Array.isArray(record.ownershipUpdate)) {
    const parsed = record.ownershipUpdate.map(safeOwnerEntry).filter((entry): entry is OwnershipEntry => !!entry);
    normalized.ownershipUpdate = parsed;
  }

  const assessorId = asString(record.assessorId);
  if (assessorId) normalized.assessorId = assessorId;

  const done = asBoolean(record.done);
  if (typeof done === "boolean") normalized.done = done;

  return normalized;
}

function ownerTotal(entries: OwnershipEntry[]): number {
  return entries.reduce((sum, entry) => sum + Number(entry.percent || 0), 0);
}

export function applyHybridGuardrails(
  result: AgentParseResult,
  pointer: ConversationPointer,
  state: RegistrationState,
): AgentParseResult {
  if (!isValidConversationStepId(result.next.stepId)) {
    throw new Error("Invalid next.stepId from Groq result");
  }

  const confidence = clampConfidence(result.confidence);
  const ownership = result.ownershipUpdate ?? state.ownership_structure;
  const total = ownerTotal(ownership);
  const ownerIndex = pointer.ownerIndex ?? 0;

  if (total > 100) {
    return {
      ok: false,
      confidence,
      confirmation: `Ownership total is ${total} percent which is over 100.`,
      clarification: "Please adjust ownership percentages so the total equals 100 percent.",
      next: { stepId: "owner_details", ownerIndex },
      ownershipUpdate: ownership,
    };
  }

  if (pointer.stepId === "owner_details") {
    const currentOwner = ownership[ownerIndex];
    const missingName = !currentOwner?.name || currentOwner.name.trim().length < 2;
    const missingGender = !currentOwner?.gender;
    const missingPercent = !currentOwner?.percent;

    if (missingName || missingGender || missingPercent) {
      return {
        ok: false,
        confidence,
        confirmation: "I missed some owner details.",
        clarification: "Please include full name, gender, and ownership percentage for this owner.",
        next: { stepId: "owner_details", ownerIndex },
        ownershipUpdate: ownership,
      };
    }
  }

  return {
    ...result,
    confidence,
  };
}

function buildSystemPrompt(): string {
  return `
You are a professional certification call assistant for WeConnect.

Core behavior:
- Follow the existing conversation steps and return only structured JSON.
- Keep responses concise and practical for spoken conversation.
- Never provide legal, immigration, or guarantee statements.
- Never invent policy rules, assessor facts, or verification outcomes.
- If user input is unclear, ask one focused clarification question.

Output contract:
Return a JSON object matching:
{
  "ok": boolean,
  "confidence": number,
  "confirmation": string,
  "clarification": string (optional),
  "updates": object (optional),
  "ownershipUpdate": array (optional),
  "assessorId": string (optional),
  "next": { "stepId": string, "ownerIndex": number (optional) },
  "done": boolean (optional)
}

Do not return markdown, prose, code fences, or extra keys outside this shape.
`.trim();
}

function buildUserContent(pointer: ConversationPointer, state: RegistrationState, answer: string): string {
  return JSON.stringify(
    {
      context: WECONNECT_CONTEXT,
      pointer,
      state,
      userAnswer: answer,
      allowedStepIds: VALID_STEP_IDS,
      policy: "VOICE_AGENT_BRAIN_MODE=hybrid_guarded",
    },
    null,
    2,
  );
}

export async function runGroqBrain({
  pointer,
  state,
  answer,
}: {
  pointer: ConversationPointer;
  state: RegistrationState;
  answer: string;
}): Promise<AgentParseResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserContent(pointer, state, answer) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GroqChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq response missing message content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Groq response was not valid JSON");
  }

  return normalizeGroqAgentResult(parsed, pointer);
}
