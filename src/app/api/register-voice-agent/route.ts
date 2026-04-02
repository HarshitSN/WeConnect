import { NextResponse } from "next/server";
import { getNextQuestion, parseStepAnswer } from "@/lib/voice-agent/engine";
import { processWithBrain } from "@/lib/voice-agent/llm-brain";
import type { ConversationPointer, RegistrationState } from "@/types";

interface Payload {
  pointer: ConversationPointer;
  answer: string;
  state: RegistrationState;
  history?: { role: string; text: string }[];
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
    let result = parseStepAnswer(body.pointer, answerToProcess, body.state);

    // If deterministic parsing fails and brain is enabled, let the LLM handle context & guardrails
    if (!result.ok && process.env.VOICE_AGENT_BRAIN_MODE === "hybrid_guarded") {
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
        result = parseStepAnswer(body.pointer, llmResult.extractedValue, body.state);
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
