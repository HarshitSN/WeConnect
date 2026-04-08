import { NextResponse } from 'next/server'

const FAST_VOICE_MODE = /^(1|true|yes)$/i.test(process.env.FAST_VOICE_MODE ?? '')

function getPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const STT_TIMEOUT_MS = getPositiveInt(process.env.SARVAM_STT_TIMEOUT_MS, FAST_VOICE_MODE ? 3000 : 8000)
const STT_MAX_ATTEMPTS = getPositiveInt(process.env.SARVAM_STT_MAX_ATTEMPTS, FAST_VOICE_MODE ? 1 : 2)

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  let timedOut = false
  let attempts = 0

  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as Blob
    const languageCode = (formData.get('languageCode') as string) || process.env.SARVAM_DEFAULT_LANGUAGE_CODE || 'unknown'

    if (!audio) {
      return NextResponse.json(
        { ok: false, error: { code: 'NO_AUDIO', message: 'No audio provided' } },
        { status: 400 },
      )
    }

    const sarvamApiKey = process.env.SARVAM_AI_API_KEY
    if (!sarvamApiKey) {
      return NextResponse.json(
        { ok: false, error: { code: 'MISSING_API_KEY', message: 'Server configuration error' } },
        { status: 500 },
      )
    }

    const cleanType = (audio.type || 'audio/webm').split(';')[0].trim() || 'audio/webm'
    const cleanBlob = new Blob([await audio.arrayBuffer()], { type: cleanType })

    let lastErrorStatus = 502
    let lastErrorText = 'Unknown STT error'

    for (let attempt = 1; attempt <= STT_MAX_ATTEMPTS; attempt += 1) {
      attempts = attempt
      const upstreamFormData = new FormData()
      upstreamFormData.append('file', cleanBlob, 'recording.webm')
      upstreamFormData.append('model', 'saaras:v3')
      upstreamFormData.append('mode', 'transcribe')
      upstreamFormData.append('language_code', languageCode)
      upstreamFormData.append('with_timestamps', 'false')

      const controller = new AbortController()
      const timeout = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, STT_TIMEOUT_MS)

      try {
        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
          method: 'POST',
          headers: {
            'API-Subscription-Key': sarvamApiKey,
          },
          body: upstreamFormData,
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (response.ok) {
          const data = await response.json()
          const transcript = (data.transcript ?? '').trim()

          return NextResponse.json({
            ok: true,
            transcript,
            languageCode: data.language_code || languageCode,
            timestamp: new Date().toISOString(),
            latencyMs: Date.now() - startedAt,
            timedOut,
            attempts,
          })
        }

        const errorText = await response.text()
        lastErrorStatus = response.status
        lastErrorText = errorText

        if (!isTransientStatus(response.status) || attempt === STT_MAX_ATTEMPTS) {
          break
        }
      } catch (error) {
        clearTimeout(timeout)

        const isAbort = error instanceof Error && error.name === 'AbortError'
        if (!isAbort) {
          lastErrorText = error instanceof Error ? error.message : 'Unknown fetch failure'
        } else {
          lastErrorText = `Timeout after ${STT_TIMEOUT_MS}ms`
        }

        lastErrorStatus = 504

        if (!isAbort || attempt === STT_MAX_ATTEMPTS) {
          break
        }
      }
    }

    console.warn('[sarvam-stt] upstream error:', lastErrorStatus, lastErrorText)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SARVAM_STT_FAILED',
          message: 'Speech to text failed',
          details: lastErrorText,
        },
        latencyMs: Date.now() - startedAt,
        timedOut,
        attempts,
      },
      { status: lastErrorStatus },
    )
  } catch (error) {
    console.error('Error in sarvam-stt API route:', error)
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        latencyMs: Date.now() - startedAt,
        timedOut,
        attempts,
      },
      { status: 500 },
    )
  }
}
