import { NextResponse } from "next/server";

interface SarvamTtsResponse {
  audios?: string[];
  audio?: string;
  audio_base64?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; languageCode?: string; speaker?: string };
    const text = body.text?.trim();
    const languageCode = body.languageCode ?? process.env.SARVAM_DEFAULT_LANGUAGE_CODE ?? "en-IN";
    const speaker = body.speaker ?? process.env.SARVAM_DEFAULT_SPEAKER ?? "shubh";

    if (!text) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "MISSING_TEXT", message: "text is required" },
        },
        { status: 400 },
      );
    }

    const sarvamApiKey = process.env.SARVAM_AI_API_KEY;
    if (!sarvamApiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "MISSING_API_KEY", message: "Sarvam API key is not configured" },
        },
        { status: 500 },
      );
    }

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "API-Subscription-Key": sarvamApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        target_language_code: languageCode,
        speaker,
        model: "bulbul:v3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "SARVAM_TTS_FAILED",
            message: "Sarvam TTS request failed",
            details: errorText,
          },
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as SarvamTtsResponse;
    const audioBase64 = data.audio_base64 ?? data.audio ?? data.audios?.[0];

    if (!audioBase64) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_TTS_RESPONSE",
            message: "Sarvam TTS did not return audio",
          },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      audioBase64,
      mimeType: "audio/wav",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("sarvam-tts error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate speech",
        },
      },
      { status: 500 },
    );
  }
}
