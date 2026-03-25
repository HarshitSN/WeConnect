"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

/* ─── constants ─── */
const SILENCE_THRESHOLD = 0.012;   // RMS below this = silence
const SILENCE_DURATION_MS = 1800;  // 1.8s of silence after speech → commit
const ANALYSIS_INTERVAL_MS = 100;  // VAD poll interval
const DEDUP_WINDOW_MS = 2500;

export default function VoiceInput({
  sessionActive,
  suspended = false,
  resetSignal = 0,
  languageCode = "en-IN",
  placeholder = "Listening continuously",
  onFinalTranscript,
  onSessionError,
  onListeningStateChange,
}: {
  sessionActive: boolean;
  suspended?: boolean;
  resetSignal?: number;
  languageCode?: string;
  placeholder?: string;
  onFinalTranscript: (text: string) => void;
  onSessionError?: (error: string) => void;
  onListeningStateChange?: (listening: boolean) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // core refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sampleBufRef = useRef<Float32Array | null>(null);
  const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // state tracking refs
  const hasSpeechRef = useRef(false);       // did we detect any speech in this recording?
  const silentSinceRef = useRef<number | null>(null);
  const recordStartRef = useRef(0);
  const lastSubmittedRef = useRef({ text: "", ts: 0 });
  const mountedRef = useRef(true);

  /* ── notify parent ── */
  const setRecState = useCallback(
    (v: boolean) => {
      setIsRecording(v);
      onListeningStateChange?.(v);
    },
    [onListeningStateChange],
  );

  /* ── get or create mic stream ── */
  const ensureStream = useCallback(async () => {
    if (streamRef.current?.active) return streamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      return stream;
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access."
          : "Failed to access microphone. You can continue by typing.";
      setError(msg);
      onSessionError?.(msg);
      return null;
    }
  }, [onSessionError]);

  /* ── ensure AudioContext + AnalyserNode ── */
  const ensureAnalyser = useCallback((stream: MediaStream) => {
    if (analyserRef.current && audioCtxRef.current?.state !== "closed") return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sampleBufRef.current = new Float32Array(analyser.fftSize);
  }, []);

  /* ── send blob to Sarvam STT ── */
  const transcribeBlob = useCallback(
    async (blob: Blob): Promise<string | null> => {
      if (blob.size < 1000) return null; // too small
      setIsSending(true);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "recording.webm");
        fd.append("languageCode", languageCode);
        const res = await fetch("/api/sarvam-stt", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          console.warn("[VoiceInput] STT error:", data?.error?.message);
          return null;
        }
        return (data.transcript || "").trim() || null;
      } catch (err) {
        console.warn("[VoiceInput] STT fetch error:", err);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [languageCode],
  );

  /* ── stop VAD polling ── */
  const stopVAD = useCallback(() => {
    if (vadTimerRef.current !== null) {
      clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  }, []);

  /* ── stop & discard current recording without transcribing ── */
  const discardRecording = useCallback(() => {
    stopVAD();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.ondataavailable = null;
      rec.onstop = null;
      try { rec.stop(); } catch { /* noop */ }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    hasSpeechRef.current = false;
    silentSinceRef.current = null;
    setRecState(false);
  }, [setRecState, stopVAD]);

  /* ── the main record → detect silence → transcribe → restart loop ── */
  const runRecordLoop = useCallback(
    async (stream: MediaStream) => {
      if (!mountedRef.current) return;

      ensureAnalyser(stream);

      // pick mime type
      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      hasSpeechRef.current = false;
      silentSinceRef.current = null;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // start recording
      recorder.start(300); // collect data every 300ms
      recordStartRef.current = Date.now();
      setRecState(true);
      setError(null);

      console.log("[VoiceInput] Recording started, waiting for speech...");

      // start VAD polling
      stopVAD();
      vadTimerRef.current = setInterval(() => {
        const analyser = analyserRef.current;
        const buf = sampleBufRef.current;
        if (!analyser || !buf) return;

        analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        const rms = Math.sqrt(sum / buf.length);

        if (rms >= SILENCE_THRESHOLD) {
          // speech detected
          if (!hasSpeechRef.current) {
            console.log("[VoiceInput] Speech detected (RMS:", rms.toFixed(4), ")");
          }
          hasSpeechRef.current = true;
          silentSinceRef.current = null;
        } else if (hasSpeechRef.current) {
          // silence after speech
          if (silentSinceRef.current === null) {
            silentSinceRef.current = Date.now();
          } else if (Date.now() - silentSinceRef.current >= SILENCE_DURATION_MS) {
            console.log("[VoiceInput] Silence detected after speech, committing...");
            // stop the recorder — onstop will handle transcription
            stopVAD();
            if (recorder.state === "recording") {
              try { recorder.stop(); } catch { /* noop */ }
            }
          }
        }
        // if no speech yet and silence — do nothing, keep waiting
      }, ANALYSIS_INTERVAL_MS);

      // when recorder stops (from VAD commit or external stop)
      return new Promise<void>((resolve) => {
        recorder.onstop = async () => {
          setRecState(false);
          stopVAD();

          const chunks = chunksRef.current;
          chunksRef.current = [];
          const hadSpeech = hasSpeechRef.current;
          hasSpeechRef.current = false;
          silentSinceRef.current = null;

          if (hadSpeech && chunks.length > 0) {
            const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
            console.log("[VoiceInput] Sending", blob.size, "bytes to Sarvam STT...");
            const transcript = await transcribeBlob(blob);

            if (transcript && mountedRef.current) {
              const now = Date.now();
              const last = lastSubmittedRef.current;
              if (!(transcript.toLowerCase() === last.text.toLowerCase() && now - last.ts < DEDUP_WINDOW_MS)) {
                lastSubmittedRef.current = { text: transcript, ts: now };
                console.log("[VoiceInput] Transcript:", transcript);
                onFinalTranscript(transcript);
              }
            }
          }
          resolve();
        };
      });
    },
    [ensureAnalyser, onFinalTranscript, setRecState, stopVAD, transcribeBlob],
  );

  /* ── main effect: start/stop the continuous recording loop ── */
  const loopActiveRef = useRef(false);

  useEffect(() => {
    if (!sessionActive || suspended) {
      discardRecording();
      loopActiveRef.current = false;
      return;
    }

    // start the loop
    if (loopActiveRef.current) return; // already running
    loopActiveRef.current = true;

    let cancelled = false;

    (async () => {
      const stream = await ensureStream();
      if (!stream || cancelled) {
        loopActiveRef.current = false;
        return;
      }

      // continuous loop: record → transcribe → restart
      while (!cancelled && mountedRef.current) {
        try {
          await runRecordLoop(stream);
        } catch (err) {
          console.warn("[VoiceInput] loop error:", err);
          // small delay before retry
          await new Promise((r) => setTimeout(r, 500));
        }

        // check if we should continue
        if (cancelled) break;
        // small gap between recordings
        await new Promise((r) => setTimeout(r, 200));
      }

      loopActiveRef.current = false;
    })();

    return () => {
      cancelled = true;
      discardRecording();
      loopActiveRef.current = false;
    };
  }, [sessionActive, suspended, ensureStream, runRecordLoop, discardRecording]);

  /* ── react to resetSignal: discard current recording ── */
  useEffect(() => {
    if (!resetSignal) return;
    chunksRef.current = [];
    hasSpeechRef.current = false;
    silentSinceRef.current = null;
  }, [resetSignal]);

  /* ── cleanup on unmount ── */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      discardRecording();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
    };
  }, [discardRecording]);

  const statusText = (() => {
    if (!sessionActive) return placeholder;
    if (isSending) return "Processing speech...";
    if (isRecording) return "Recording...";
    return "Starting mic...";
  })();

  return (
    <div className="relative inline-flex items-center gap-2">
      <div className={`voice-pill ${sessionActive && isRecording ? "voice-pill-live" : "voice-pill-idle"}`}>
        <Mic
          className={`h-4 w-4 ${sessionActive && isRecording ? "text-emerald-700" : "text-gray-500"}`}
          aria-hidden="true"
        />
        <span className="text-xs font-medium text-gray-700">{statusText}</span>
      </div>

      {error && (
        <div className="absolute -bottom-7 left-0 rounded-full bg-red-600 px-2 py-1 text-xs whitespace-nowrap text-white z-10">
          {error}
        </div>
      )}
    </div>
  );
}
