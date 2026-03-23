import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: BrowserSpeechRecognitionResult[];
}

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

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
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldBeListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const finalChunkRef = useRef("");
  const interimChunkRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const lastSubmittedRef = useRef<{ text: string; ts: number }>({ text: "", ts: 0 });

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearUtteranceBuffer = useCallback(() => {
    finalChunkRef.current = "";
    interimChunkRef.current = "";
    clearSilenceTimer();
  }, [clearSilenceTimer]);

  const commitBufferedUtterance = useCallback(() => {
    const combined = `${finalChunkRef.current} ${interimChunkRef.current}`.replace(/\s+/g, " ").trim();
    clearUtteranceBuffer();
    if (!combined) return;

    const now = Date.now();
    const last = lastSubmittedRef.current;
    if (combined.toLowerCase() === last.text.toLowerCase() && now - last.ts < 2500) return;

    lastSubmittedRef.current = { text: combined, ts: now };
    onFinalTranscript(combined);
  }, [clearUtteranceBuffer, onFinalTranscript]);

  const scheduleSilenceCommit = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      commitBufferedUtterance();
    }, 1100);
  }, [clearSilenceTimer, commitBufferedUtterance]);

  const setListeningState = useCallback(
    (listening: boolean) => {
      setIsListening(listening);
      onListeningStateChange?.(listening);
    },
    [onListeningStateChange],
  );

  const stopRecognition = useCallback(() => {
    shouldBeListeningRef.current = false;
    isStartingRef.current = false;
    clearUtteranceBuffer();
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
    }
  }, [clearUtteranceBuffer]);

  const ensureRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) return null;

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageCode;

    recognition.onstart = () => {
      isStartingRef.current = false;
      setError(null);
      setListeningState(true);
      clearUtteranceBuffer();
    };

    recognition.onend = () => {
      setListeningState(false);
      if (shouldBeListeningRef.current && !suspended) {
        try {
          isStartingRef.current = true;
          recognition.start();
        } catch {
          isStartingRef.current = false;
        }
      }
    };

    recognition.onerror = (event) => {
      isStartingRef.current = false;
      const msg =
        event.error === "not-allowed"
          ? "Microphone permission denied. Please allow microphone access."
          : event.error === "service-not-allowed"
            ? "Speech recognition is blocked in this browser."
            : "Voice recognition failed. You can continue by typing.";
      setError(msg);
      onSessionError?.(msg);
    };

    recognition.onresult = (event) => {
      let hasAnySpeech = false;
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;
        hasAnySpeech = true;
        if (result.isFinal) {
          finalChunkRef.current = `${finalChunkRef.current} ${transcript}`.replace(/\s+/g, " ").trim();
          interimChunkRef.current = "";
        } else {
          interimChunkRef.current = transcript;
        }
      }
      if (!hasAnySpeech) return;

      scheduleSilenceCommit();
      if (finalChunkRef.current) {
        clearSilenceTimer();
        commitBufferedUtterance();
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [clearSilenceTimer, clearUtteranceBuffer, commitBufferedUtterance, languageCode, onSessionError, scheduleSilenceCommit, setListeningState, suspended]);

  const startRecognition = useCallback(() => {
    const recognition = ensureRecognition();
    if (!recognition) {
      const msg = "SpeechRecognition not available in this browser. You can continue by typing.";
      setError(msg);
      onSessionError?.(msg);
      return;
    }

    if (isListening || isStartingRef.current) return;
    shouldBeListeningRef.current = true;
    try {
      isStartingRef.current = true;
      recognition.start();
    } catch {
      isStartingRef.current = false;
    }
  }, [ensureRecognition, isListening, onSessionError]);

  useEffect(() => {
    if (sessionActive && !suspended) {
      startRecognition();
      return;
    }
    stopRecognition();
  }, [sessionActive, startRecognition, stopRecognition, suspended]);

  useEffect(() => {
    clearUtteranceBuffer();
  }, [clearUtteranceBuffer, resetSignal]);

  useEffect(() => {
    return () => {
      stopRecognition();
      recognitionRef.current = null;
    };
  }, [stopRecognition]);

  return (
    <div className="relative inline-flex items-center gap-2">
      <div className={`voice-pill ${sessionActive && isListening ? "voice-pill-live" : "voice-pill-idle"}`}>
        <Mic className={`h-4 w-4 ${sessionActive && isListening ? "text-emerald-700" : "text-gray-500"}`} aria-hidden="true" />
        <span className="text-xs font-medium text-gray-700">
          {sessionActive ? (isListening ? "Listening..." : "Starting mic...") : placeholder}
        </span>
      </div>

      {error && (
        <div className="absolute -bottom-7 left-0 rounded-full bg-red-600 px-2 py-1 text-xs whitespace-nowrap text-white z-10">
          {error}
        </div>
      )}
    </div>
  );
}
