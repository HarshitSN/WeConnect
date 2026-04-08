import { NextResponse } from "next/server";

interface SarvamTtsResponse {
  audios?: string[];
  audio?: string;
  audio_base64?: string;
}

interface TtsCacheEntry {
  audioBase64: string;
  speaker: string;
  expiresAt: number;
}

const TTS_TIMEOUT_MS = 8000;
const TTS_MAX_ATTEMPTS = 2;
const TTS_CACHE_TTL_MS = 5 * 60 * 1000;
const ttsCache = new Map<string, TtsCacheEntry>();

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function buildCacheKey(text: string, languageCode: string, speaker: string): string {
  return `${languageCode}::${speaker}::${text}`;
}

async function callSarvamTtsWithRetry(
  sarvamApiKey: string,
  text: string,
  languageCode: string,
  candidateSpeaker: string,
): Promise<{ response: Response | null; attempts: number; timedOut: boolean; lastErrorText: string }> {
  let attempts = 0;
  let timedOut = false;
  let lastErrorText = "Unknown TTS error";

  for (let attempt = 1; attempt <= TTS_MAX_ATTEMPTS; attempt += 1) {
    attempts = attempt;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TTS_TIMEOUT_MS);

    try {
      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "API-Subscription-Key": sarvamApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          target_language_code: languageCode,
          speaker: candidateSpeaker,
          model: "bulbul:v3",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return { response, attempts, timedOut, lastErrorText: "" };
      }

      lastErrorText = await response.text();
      if (!isTransientStatus(response.status) || attempt === TTS_MAX_ATTEMPTS) {
        return { response, attempts, timedOut, lastErrorText };
      }
    } catch (error) {
      clearTimeout(timeout);
      const isAbort = error instanceof Error && error.name === "AbortError";
      lastErrorText = isAbort ? `Timeout after ${TTS_TIMEOUT_MS}ms` : error instanceof Error ? error.message : "Unknown fetch failure";
      if (!isAbort || attempt === TTS_MAX_ATTEMPTS) {
        return { response: null, attempts, timedOut, lastErrorText };
      }
    }
  }

  return { response: null, attempts, timedOut, lastErrorText };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
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

    const cacheKey = buildCacheKey(text, languageCode, speaker);
    const cached = ttsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        ok: true,
        audioBase64: cached.audioBase64,
        mimeType: "audio/wav",
        speaker: cached.speaker,
        timestamp: new Date().toISOString(),
        cached: true,
        attempts: 0,
        timedOut: false,
        latencyMs: Date.now() - startedAt,
      });
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

    let selectedSpeaker = speaker;
    let attempts = 0;
    let timedOut = false;
    let result = await callSarvamTtsWithRetry(sarvamApiKey, text, languageCode, selectedSpeaker);
    attempts += result.attempts;
    timedOut = timedOut || result.timedOut;

    // Some env speaker values are rejected by upstream. Retry with stable default.
    if ((!result.response || !result.response.ok) && selectedSpeaker !== "shubh") {
      const firstStatus = result.response?.status ?? 0;
      console.warn("sarvam-tts upstream error with speaker:", selectedSpeaker, firstStatus, result.lastErrorText);
      selectedSpeaker = "shubh";
      result = await callSarvamTtsWithRetry(sarvamApiKey, text, languageCode, selectedSpeaker);
      attempts += result.attempts;
      timedOut = timedOut || result.timedOut;
    }

    if (!result.response || !result.response.ok) {
      const errorStatus = result.response?.status ?? 502;
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "SARVAM_TTS_FAILED",
            message: "Sarvam TTS request failed",
            details: result.lastErrorText || "No upstream response body",
          },
          attempts,
          timedOut,
          latencyMs: Date.now() - startedAt,
        },
        { status: errorStatus },
      );
    }

    const data = (await result.response.json()) as SarvamTtsResponse;
    const audioBase64 = data.audio_base64 ?? data.audio ?? data.audios?.[0];

    if (!audioBase64) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_TTS_RESPONSE",
            message: "Sarvam TTS did not return audio",
          },
          attempts,
          timedOut,
          latencyMs: Date.now() - startedAt,
        },
        { status: 502 },
      );
    }

    ttsCache.set(cacheKey, {
      audioBase64,
      speaker: selectedSpeaker,
      expiresAt: Date.now() + TTS_CACHE_TTL_MS,
    });

    return NextResponse.json({
      ok: true,
      audioBase64,
      mimeType: "audio/wav",
      speaker: selectedSpeaker,
      timestamp: new Date().toISOString(),
      cached: false,
      attempts,
      timedOut,
      latencyMs: Date.now() - startedAt,
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
        attempts: 0,
        timedOut: false,
        latencyMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
