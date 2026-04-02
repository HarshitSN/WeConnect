import { NextResponse } from "next/server";
import { getNextQuestion, parseStepAnswer } from "@/lib/voice-agent/engine";
import { applyHybridGuardrails, runGroqBrain } from "@/lib/voice-agent/brain-groq";
import type { AgentParseResult, ConversationPointer, RegistrationState } from "@/types";

interface Payload {
  pointer: ConversationPointer;
  answer: string;
  state: RegistrationState;
  turnMeta?: {
    stepRetryCounts?: Partial<Record<ConversationPointer["stepId"], number>>;
  };
}

function hasUnsafeGroqTransition(params: {
  groqStep: ConversationPointer["stepId"];
  fallbackStep: ConversationPointer["stepId"];
  pointerStep: ConversationPointer["stepId"];
  groqOk: boolean;
}): boolean {
  const { groqStep, fallbackStep, pointerStep, groqOk } = params;

  // In hybrid-guarded mode, a successful turn should follow deterministic progression.
  // This prevents valid-but-wrong LLM transitions (for example jumping back to business_name).
  if (groqOk && groqStep !== fallbackStep) return true;

  // Successful turns should not stay on the same step.
  if (groqOk && groqStep === pointerStep) return true;

  return false;
}

function hasMissingRequiredStepUpdates(result: AgentParseResult, pointer: ConversationPointer): boolean {
  if (!result.ok) return false;

  const updates = result.updates ?? {};
  switch (pointer.stepId) {
    case "business_name":
      return typeof updates.business_name !== "string" || updates.business_name.trim().length < 2;
    case "women_owned":
      return typeof updates.women_owned !== "boolean";
    case "country":
      return typeof updates.country !== "string" || updates.country.trim().length < 2;
    case "naics_codes":
      return !Array.isArray(updates.naics_codes) || updates.naics_codes.length === 0;
    case "unspsc_codes":
      return !Array.isArray(updates.unspsc_codes) || updates.unspsc_codes.length === 0;
    default:
      return false;
  }
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

    const fallbackResult = parseStepAnswer(body.pointer, body.answer, body.state, {
      stepRetryCounts: body.turnMeta?.stepRetryCounts,
    });
    const mode = (process.env.VOICE_AGENT_BRAIN_MODE ?? "hybrid_guarded").toLowerCase();
    let result = fallbackResult;
    let brainUsed: "groq" | "fallback" = "fallback";

    if (mode === "hybrid_guarded") {
      try {
        const groqResult = await runGroqBrain({
          pointer: body.pointer,
          state: body.state,
          answer: body.answer,
        });

        if (groqResult) {
          const guarded = applyHybridGuardrails(groqResult, body.pointer, body.state);
          if (
            hasUnsafeGroqTransition({
              groqStep: guarded.next.stepId,
              fallbackStep: fallbackResult.next.stepId,
              pointerStep: body.pointer.stepId,
              groqOk: guarded.ok,
            })
          ) {
            console.warn(
              "[register-voice-agent] groq_parse_validation_failed: unsafe transition",
              `pointer=${body.pointer.stepId}`,
              `groq_next=${guarded.next.stepId}`,
              `fallback_next=${fallbackResult.next.stepId}`,
            );
          } else if (hasMissingRequiredStepUpdates(guarded, body.pointer)) {
            console.warn(
              "[register-voice-agent] groq_parse_validation_failed: missing required step updates",
              `pointer=${body.pointer.stepId}`,
            );
          } else {
            result = guarded;
            brainUsed = "groq";
          }
        } else {
          console.warn("[register-voice-agent] groq_parse_validation_failed: empty/invalid normalized result");
        }
      } catch (error) {
        console.warn(
          "[register-voice-agent] groq_parse_validation_failed:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }

    const mergedState: RegistrationState = {
      ...body.state,
      ...(result.updates ?? {}),
      ownership_structure: result.ownershipUpdate ?? body.state.ownership_structure,
    };

    console.info(
      "[register-voice-agent] brain_used:",
      brainUsed,
      "step:",
      body.pointer.stepId,
      "next:",
      result.next.stepId,
      "confidence:",
      Number(result.confidence ?? 0).toFixed(2),
    );

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
