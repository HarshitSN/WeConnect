import { NextResponse } from "next/server";
import { getNextQuestion, parseStepAnswer } from "@/lib/voice-agent/engine";
import type { ConversationPointer, RegistrationState } from "@/types";

interface Payload {
  pointer: ConversationPointer;
  answer: string;
  state: RegistrationState;
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

    const result = parseStepAnswer(body.pointer, body.answer, body.state);

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
