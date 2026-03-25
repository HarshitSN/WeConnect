"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import VoiceInput from "@/components/ui/VoiceInput";
import ConversationTranscript from "@/components/register/ConversationTranscript";
import VoiceAgentControls from "@/components/register/VoiceAgentControls";
import { getNextQuestion, initialPointer } from "@/lib/voice-agent/engine";
import type { ConversationMessage, ConversationPointer, RegistrationState } from "@/types";

interface HistoryEntry {
  pointer: ConversationPointer;
  answers: RegistrationState;
  assessorId: string;
}

function mkMessage(type: ConversationMessage["type"], text: string): ConversationMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    text,
    timestamp: new Date().toISOString(),
  };
}

function nextBySkip(pointer: ConversationPointer, state: RegistrationState): ConversationPointer {
  const total = state.ownership_structure.reduce((sum, e) => sum + Number(e.percent || 0), 0);
  switch (pointer.stepId) {
    case "business_name":
      return { stepId: "women_owned" };
    case "women_owned":
      return { stepId: "country" };
    case "country":
      return { stepId: "naics_codes" };
    case "us_citizen":
      return { stepId: "naics_codes" };
    case "visa_type":
      return { stepId: "webank_certified" };
    case "webank_certified":
      return { stepId: "naics_codes" };
    case "naics_codes":
      return { stepId: "unspsc_codes" };
    case "unspsc_codes":
      return { stepId: "designations" };
    case "designations":
      return { stepId: "owner_name", ownerIndex: 0 };
    case "owner_name":
      return { stepId: "owner_gender", ownerIndex: pointer.ownerIndex ?? 0 };
    case "owner_gender":
      return { stepId: "owner_percent", ownerIndex: pointer.ownerIndex ?? 0 };
    case "owner_percent":
      return { stepId: "owner_add_more", ownerIndex: pointer.ownerIndex ?? 0 };
    case "owner_add_more":
      return total >= 100 ? { stepId: "num_employees" } : { stepId: "owner_name", ownerIndex: (pointer.ownerIndex ?? 0) + 1 };
    case "num_employees":
      return { stepId: "revenue_range" };
    case "revenue_range":
      return { stepId: "additional_certs" };
    case "additional_certs":
      return { stepId: "business_description" };
    case "business_description":
      return { stepId: "cert_type" };
    case "cert_type":
      return { stepId: "assessor" };
    case "assessor":
      return { stepId: "done" };
    default:
      return { stepId: "done" };
  }
}

async function playPrompt(text: string) {
  try {
    const response = await fetch("/api/sarvam-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, languageCode: "en-IN" }),
    });

    if (!response.ok) return;
    const data = await response.json();
    if (!data.ok || !data.audioBase64) return;

    const audio = new Audio(`data:${data.mimeType ?? "audio/wav"};base64,${data.audioBase64}`);
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
  } catch {
    // TTS is best-effort; silent fallback keeps flow resilient.
  }
}

export default function ConversationRegistrationShell({
  answers,
  setAnswers,
  assessorId,
  setAssessorId,
  onPointerChange,
}: {
  answers: RegistrationState;
  setAnswers: Dispatch<SetStateAction<RegistrationState>>;
  assessorId: string;
  setAssessorId: (id: string) => void;
  onPointerChange?: (pointer: ConversationPointer) => void;
}) {
  const [pointer, setPointer] = useState<ConversationPointer>(initialPointer());
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [isVoiceIntroOpen, setIsVoiceIntroOpen] = useState(false);
  const [hasVoiceIntroAccepted, setHasVoiceIntroAccepted] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceResetSignal, setVoiceResetSignal] = useState(0);
  const [voiceDebug, setVoiceDebug] = useState<{ lastUtterance: string; ts: string; dropped: number }>({
    lastUtterance: "",
    ts: "",
    dropped: 0,
  });
  const busyRef = useRef(busy);
  const runningRef = useRef(running);
  const speakingRef = useRef(isAssistantSpeaking);

  const currentPrompt = useMemo(() => getNextQuestion(pointer, answers), [pointer, answers]);

  const addMessage = useCallback((type: ConversationMessage["type"], text: string) => {
    setMessages((prev) => [...prev, mkMessage(type, text)]);
  }, []);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    speakingRef.current = isAssistantSpeaking;
  }, [isAssistantSpeaking]);

  const speakPrompt = useCallback(async (text: string) => {
    setIsAssistantSpeaking(true);
    setVoiceResetSignal((v) => v + 1);
    try {
      await playPrompt(text);
    } finally {
      setIsAssistantSpeaking(false);
      setVoiceResetSignal((v) => v + 1);
    }
  }, []);

  const askCurrent = useCallback(async () => {
    addMessage("bot_question", currentPrompt);
    await speakPrompt(currentPrompt);
  }, [addMessage, currentPrompt, speakPrompt]);

  useEffect(() => {
    onPointerChange?.(pointer);
  }, [onPointerChange, pointer]);

  useEffect(() => {
    if (!running || messages.length > 0) return;
    void askCurrent();
  }, [askCurrent, messages.length, running]);

  const processAnswer = useCallback(
    async (rawAnswer: string) => {
      const answer = rawAnswer.trim();
      if (!answer || busy || !running) return;

      addMessage("user_answer", answer);
      setHistory((prev) => [...prev, { pointer, answers: structuredClone(answers), assessorId }]);
      setBusy(true);

      try {
        const response = await fetch("/api/register-voice-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pointer, answer, state: answers }),
        });

        const data = await response.json();
        if (!response.ok || !data.ok || !data.result) {
          addMessage("system_hint", data?.error?.message || "Could not process your answer. Please retry.");
          return;
        }

        const result = data.result;
        if (result.updates || result.ownershipUpdate) {
          setAnswers((prev) => ({
            ...prev,
            ...(result.updates ?? {}),
            ownership_structure: result.ownershipUpdate ?? prev.ownership_structure,
          }));
        }

        if (typeof result.assessorId === "string") {
          setAssessorId(result.assessorId);
        }

        addMessage("bot_confirm", result.confirmation);

        if (!result.ok && result.clarification) {
          addMessage("system_hint", result.clarification);
          await speakPrompt(result.clarification);
          return;
        }

        setPointer(result.next);

        if (result.done) {
          const doneMsg = "Voice steps complete. Review the form, finish payment, then submit registration.";
          addMessage("system_hint", doneMsg);
          await speakPrompt(doneMsg);
          return;
        }

        const nextPrompt = data.prompt || getNextQuestion(result.next, answers);
        addMessage("bot_question", nextPrompt);
        await speakPrompt(nextPrompt);
      } catch {
        addMessage("system_hint", "Network issue while processing answer. Please retry.");
      } finally {
        setBusy(false);
      }
    },
    [addMessage, answers, assessorId, busy, pointer, running, setAnswers, setAssessorId, speakPrompt],
  );

  const onSubmitTyped = async () => {
    if (!typedAnswer.trim()) return;
    const input = typedAnswer;
    setTypedAnswer("");
    await processAnswer(input);
  };

  const onStartPause = () => {
    if (running) {
      setRunning(false);
      return;
    }

    if (!hasVoiceIntroAccepted) {
      setIsVoiceIntroOpen(true);
      return;
    }

    setRunning(true);
  };

  const onRepeat = async () => {
    if (!running) return;
    addMessage("bot_question", currentPrompt);
    await speakPrompt(currentPrompt);
  };

  const onSkip = async () => {
    if (!running || busy) return;
    const next = nextBySkip(pointer, answers);
    setPointer(next);
    const prompt = getNextQuestion(next, answers);
    addMessage("system_hint", "Skipped this step. You can edit it in the form panel.");
    addMessage("bot_question", prompt);
    await speakPrompt(prompt);
  };

  const onGoBack = async () => {
    const last = history[history.length - 1];
    if (!last || busy) return;
    setHistory((prev) => prev.slice(0, -1));
    setAnswers(last.answers);
    setAssessorId(last.assessorId);
    setPointer(last.pointer);
    const prompt = getNextQuestion(last.pointer, last.answers);
    addMessage("system_hint", "Moved back to previous question.");
    addMessage("bot_question", prompt);
    await speakPrompt(prompt);
  };

  const onEditLast = async () => {
    await onGoBack();
  };

  const onConfirmVoiceIntro = () => {
    setHasVoiceIntroAccepted(true);
    setIsVoiceIntroOpen(false);
    setRunning(true);
  };

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (!runningRef.current || busyRef.current || speakingRef.current) {
        setVoiceDebug((prev) => ({ ...prev, dropped: prev.dropped + 1 }));
        return;
      }
      setVoiceDebug({
        lastUtterance: text,
        ts: new Date().toISOString(),
        dropped: 0,
      });
      void processAnswer(text);
    },
    [processAnswer],
  );

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">Voice Assistant</h2>
          <p className="text-xs text-gray-500">Interactive voice + text guidance. Use Pause to stop voice session; typing remains available anytime.</p>
        </div>
        <span className="badge bg-blue-100 text-blue-700">Current: {pointer.stepId.replaceAll("_", " ")}</span>
      </div>

      <VoiceAgentControls
        running={running}
        onStartPause={onStartPause}
        onRepeat={onRepeat}
        onSkip={onSkip}
        onGoBack={onGoBack}
        onEditLast={onEditLast}
      />

      <ConversationTranscript messages={messages} />

      <div className="space-y-2">
        <label className="label">Answer by text</label>
        <div className="flex gap-2 items-center">
          <input
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void onSubmitTyped();
              }
            }}
            className="input-field"
            placeholder="Type your answer and press Enter"
            disabled={!running || busy}
          />
          <button className="btn-blue w-auto px-4" onClick={() => void onSubmitTyped()} disabled={!running || busy || !typedAnswer.trim()}>
            Send
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div>
          <p className="text-xs font-semibold text-gray-700">Answer by voice</p>
          <p className="text-xs text-gray-500">
            Listening continuously while voice session is active. Use Pause above to stop.
          </p>
        </div>
        <VoiceInput
          placeholder="Voice session paused"
          sessionActive={running}
          suspended={busy || isAssistantSpeaking}
          resetSignal={voiceResetSignal}
          onSessionError={(error) => {
            setMicError(error);
            addMessage("system_hint", error);
          }}
          onListeningStateChange={setIsListening}
          onFinalTranscript={handleVoiceTranscript}
        />
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-600">
          Voice status:{" "}
          <span className="font-semibold text-gray-800">
            {!running ? "Paused" : busy || isAssistantSpeaking ? "Assistant speaking..." : isListening ? "Recording..." : "Connecting mic..."}
          </span>
        </p>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <p className="sr-only" aria-hidden="true">
          Debug voice: {voiceDebug.lastUtterance} {voiceDebug.ts} dropped:{voiceDebug.dropped}
        </p>
      )}

      {micError && <p className="text-xs text-red-600">{micError}</p>}
      {busy && <p className="text-xs text-gray-500">Processing answer...</p>}

      {isVoiceIntroOpen && (
        <div className="modal-backdrop">
          <div className="modal-card max-w-md">
            <h3 className="text-base font-semibold text-gray-900">Start Voice Conversation</h3>
            <p className="mt-2 text-sm text-gray-600">
              Here is what will happen: the assistant asks one question at a time, you answer naturally, and the mic keeps listening
              automatically for a smooth interactive conversation.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              You can pause or end only from the top controls. If voice fails, you can always continue by typing.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="btn-outline !px-4 !py-2" onClick={() => setIsVoiceIntroOpen(false)}>
                Cancel
              </button>
              <button className="btn-blue !w-auto !px-4 !py-2" onClick={onConfirmVoiceIntro}>
                Start Voice Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
