import type { ConversationMessage, ConversationPointer, RegistrationState } from "@/types";

interface VapiContextInput {
  pointer: ConversationPointer;
  state: RegistrationState;
  assessorId: string;
  messages: ConversationMessage[];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function parseMaybeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeFreeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function collectRecentTurns(messages: ConversationMessage[]): Array<{ role: string; text: string; ts: string }> {
  return messages
    .slice(-8)
    .filter((message) => message.type === "user_answer" || message.type === "bot_question" || message.type === "bot_confirm")
    .map((message) => ({
      role: message.type === "user_answer" ? "user" : "assistant",
      text: message.text,
      ts: message.timestamp,
    }));
}

export function buildVapiContextMessage(input: VapiContextInput): string {
  return JSON.stringify(
    {
      type: "weconnect-registration-context",
      pointer: input.pointer,
      assessorId: input.assessorId,
      registrationState: input.state,
      recentTurns: collectRecentTurns(input.messages),
      policy: {
        mode: "tool-first-hybrid",
        instruction: "Collect one answer at a time and call process_registration_turn for every user turn.",
      },
    },
    null,
    2,
  );
}

export function extractFinalUserTranscript(message: unknown): string | null {
  const record = toRecord(message);
  if (!record) return null;

  const type = asString(record.type);
  if (type === "transcript") {
    const role = asString(record.role);
    if (role && role !== "user") return null;

    const text = asString(record.transcript) ?? asString(record.text) ?? asString(record.message);
    if (!text) return null;

    const transcriptType = asString(record.transcriptType);
    if (transcriptType) {
      const normalized = transcriptType.toLowerCase();
      if (normalized === "partial") return null;
      return normalized === "final" ? text : null;
    }

    if (record.final === false) return null;
    return text;
  }

  if (type === "conversation-update") {
    const entries = Array.isArray(record.messages) ? record.messages : [];

    // Collect user entries in order so we can detect stale duplicates
    let lastUserText: string | null = null;
    let candidateText: string | null = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = toRecord(entries[i]);
      if (!entry) continue;
      const role = asString(entry.role);
      if (role !== "user") continue;

      // Respect explicit final markers — reject entries marked non-final
      if (entry.final === false) continue;

      const text =
        asString(entry.transcript) ??
        asString(entry.content) ??
        asString(entry.message) ??
        asString(entry.text);
      if (!text) continue;

      // Track previous user text to detect stale duplicates
      if (lastUserText !== null && normalizeFreeText(text) === normalizeFreeText(lastUserText)) {
        // Duplicate of the prior user entry — treat as stale replay
        candidateText = null;
      } else {
        candidateText = text;
      }
      lastUserText = text;
    }

    return candidateText;
  }

  return null;
}

export function extractFinalAssistantTranscript(message: unknown): string | null {
  const record = toRecord(message);
  if (!record) return null;

  const type = asString(record.type);
  if (type !== "transcript") return null;

  const role = asString(record.role);
  if (role !== "assistant") return null;

  const transcriptType = asString(record.transcriptType);
  const isFinal = transcriptType ? transcriptType.toLowerCase() === "final" : record.final === true;
  if (!isFinal) return null;

  return asString(record.transcript) ?? asString(record.text) ?? asString(record.message);
}

export function extractProcessRegistrationTurnAnswer(message: unknown): string | null {
  const record = toRecord(message);
  if (!record) return null;

  const type = asString(record.type);
  if (type !== "tool-calls" && type !== "function-call") return null;

  const toolCallList = Array.isArray(record.toolCallList) ? record.toolCallList : [];

  // Iterate from the end to prefer the most recent valid tool call
  for (let i = toolCallList.length - 1; i >= 0; i--) {
    const call = toolCallList[i];
    const callRecord = toRecord(call);
    const fn = toRecord(callRecord?.function);
    const name = asString(fn?.name) ?? asString(callRecord?.name);
    if (name !== "process_registration_turn") continue;

    const argsRaw = fn?.arguments ?? callRecord?.arguments;
    if (typeof argsRaw === "string") {
      const parsed = parseMaybeJson(argsRaw);
      const parsedRecord = toRecord(parsed);
      const answer = asString(parsedRecord?.answer);
      if (answer) return answer;
    }

    const argsRecord = toRecord(argsRaw);
    const directAnswer = asString(argsRecord?.answer);
    if (directAnswer) return directAnswer;
  }

  return null;
}

export function normalizeUtterance(text: string): string {
  return normalizeFreeText(text);
}

export function isYesNoLikeUtterance(text: string): boolean {
  const normalized = normalizeFreeText(text);
  if (!normalized) return false;
  return [
    "yes",
    "yeah",
    "yep",
    "correct",
    "thats correct",
    "that is correct",
    "it is",
    "no",
    "nope",
    "nah",
  ].includes(normalized);
}

export function isFillerUtterance(text: string): boolean {
  const normalized = normalizeFreeText(text);
  if (!normalized) return false;
  return [
    "yes",
    "yeah",
    "yep",
    "no",
    "nope",
    "okay",
    "ok",
    "continue",
    "go on",
    "next",
    "skip",
    "sure",
    "fine",
  ].includes(normalized);
}
