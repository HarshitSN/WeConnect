import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const upstreamFormData = new FormData()
    upstreamFormData.append('file', audio, 'recording.webm')
    upstreamFormData.append('model', 'saaras:v3')
    upstreamFormData.append('mode', 'transcribe')
    upstreamFormData.append('language_code', languageCode)

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'API-Subscription-Key': sarvamApiKey,
      },
      body: upstreamFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'SARVAM_STT_FAILED',
            message: 'Speech to text failed',
            details: errorText,
          },
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({
      ok: true,
      transcript: data.transcript || '',
      languageCode: data.language_code || languageCode,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in sarvam-stt API route:', error)
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 },
    )
  }
}
