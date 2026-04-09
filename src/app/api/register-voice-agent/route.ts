import { NextResponse } from "next/server";
import { getNextQuestion, parseStepAnswer } from "@/lib/voice-agent/engine";
import { processWithBrain } from "@/lib/voice-agent/llm-brain";
import { isLikelyOwnerName } from "@/lib/voice-agent/normalizers";
import type { ConversationPointer, RegistrationState } from "@/types";

interface Payload {
  pointer: ConversationPointer;
  answer: string;
  state: RegistrationState;
  history?: { role: string; text: string }[];
}

interface DisambiguationOption {
  code: string;
  label: string;
}

function normalizeLower(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function parseOptionIndex(answer: string): number | null {
  const t = normalizeLower(answer);
  const numeric = t.match(/\b([123])\b/);
  if (numeric) return Number(numeric[1]) - 1;
  if (/\b(first|option one|one)\b/.test(t)) return 0;
  if (/\b(second|option two|two)\b/.test(t)) return 1;
  if (/\b(third|option three|three)\b/.test(t)) return 2;
  return null;
}

function parseYesNo(answer: string): boolean | null {
  const t = normalizeLower(answer);
  if (/\b(yes|yeah|yep|correct|right|sounds good|works|confirm)\b/.test(t)) return true;
  if (/\b(no|nope|nah|wrong|not this)\b/.test(t)) return false;
  return null;
}

function parseSuggestionsFromHistory(
  history: { role: string; text: string }[] | undefined,
  stepId: ConversationPointer["stepId"],
): DisambiguationOption[] {
  if (!history?.length) return [];
  const prefix = stepId === "naics_codes" ? "NAICS" : stepId === "unspsc_codes" ? "UNSPSC" : "";
  if (!prefix) return [];

  const assistantTexts = history
    .filter((h) => h.role === "assistant")
    .map((h) => h.text)
    .reverse();

  for (const text of assistantTexts) {
    const options: DisambiguationOption[] = [];
    const optionPattern = /[123]\)\s*([^()]+?)\s*\((NAICS|UNSPSC)\s+([0-9-]+)\)/gi;
    for (const m of Array.from(text.matchAll(optionPattern))) {
      if (m[2].toUpperCase() !== prefix) continue;
      options.push({ label: m[1].trim(), code: m[3].trim() });
    }
    if (options.length > 0) return options.slice(0, 3);

    const singlePattern = /\((NAICS|UNSPSC)\s+([0-9-]+)\)/i;
    const single = text.match(singlePattern);
    if (single && single[1].toUpperCase() === prefix) {
      return [{ label: "Suggested match", code: single[2].trim() }];
    }
  }

  return [];
}

function isLowQualityDeterministicResult(
  pointer: ConversationPointer,
  result: ReturnType<typeof parseStepAnswer>,
): boolean {
  if (!result.ok) return false;

  if (pointer.stepId === "owner_details" && result.ownershipUpdate) {
    const ownerIndex = pointer.ownerIndex ?? 0;
    const name = result.ownershipUpdate[ownerIndex]?.name ?? "";
    return !isLikelyOwnerName(name);
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<Payload>;

    if (!body.pointer?.stepId || typeof body.answer !== "string" || !body.state) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_PAYLOAD",
            message: "pointer.stepId, answer and state are required",
          },
        },
        { status: 400 },
      );
    }

    let answerToProcess = body.answer;

    if (body.pointer.stepId === "naics_codes" || body.pointer.stepId === "unspsc_codes") {
      const disambiguationOptions = parseSuggestionsFromHistory(body.history, body.pointer.stepId);
      if (disambiguationOptions.length > 0) {
        const yn = parseYesNo(body.answer);
        const optionIndex = parseOptionIndex(body.answer);
        if (optionIndex !== null && disambiguationOptions[optionIndex]) {
          answerToProcess = disambiguationOptions[optionIndex].code;
        } else if (yn === true) {
          answerToProcess = disambiguationOptions[0].code;
        } else if (yn === false) {
          const alternatives = disambiguationOptions.slice(1);
          if (alternatives.length > 0) {
            const domain = body.pointer.stepId === "naics_codes" ? "NAICS" : "UNSPSC";
            const optionsText = alternatives
              .map((o, idx) => `${idx + 1}) ${o.label} (${domain} ${o.code})`)
              .join("; ");
            return NextResponse.json({
              ok: true,
              result: {
                ok: false,
                confidence: 0.88,
                confirmation: "No problem, let us pick a better fit.",
                clarification: `Got it. Which of these is closer? ${optionsText}. You can say the option number or category name.`,
                next: body.pointer,
              },
              prompt: `Got it. Which of these is closer? ${optionsText}.`,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    let result = parseStepAnswer(body.pointer, answerToProcess, body.state);

    // If deterministic parsing fails OR seems low quality, let the LLM help normalize.
    const shouldUseBrain = process.env.VOICE_AGENT_BRAIN_MODE === "hybrid_guarded"
      && (
        !result.ok
        || (
          (body.pointer.stepId === "owner_details" || body.pointer.stepId === "num_employees" || body.pointer.stepId === "revenue_range")
          && isLowQualityDeterministicResult(body.pointer, result)
        )
      );

    if (shouldUseBrain) {
      const llmResult = await processWithBrain(body.pointer, body.state, body.answer, body.history);
      
      if (llmResult?.action === "answered") {
        return NextResponse.json({
          ok: true,
          result: {
            ok: false,
            confidence: 0.99,
            confirmation: "",
            clarification: llmResult.responseText,
            next: body.pointer,
          },
          prompt: llmResult.responseText,
          timestamp: new Date().toISOString(),
        });
      }

      if (llmResult?.action === "extracted") {
        const normalizedResult = parseStepAnswer(body.pointer, llmResult.extractedValue, body.state);
        if (normalizedResult.ok || !result.ok) {
          result = normalizedResult;
        }
      }
    }

    const mergedState: RegistrationState = {
      ...body.state,
      ...(result.updates ?? {}),
      ownership_structure: result.ownershipUpdate ?? body.state.ownership_structure,
    };

    return NextResponse.json({
      ok: true,
      result,
      prompt: getNextQuestion(result.next, mergedState),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("register-voice-agent error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process voice agent response",
        },
      },
      { status: 500 },
    );
  }
}
