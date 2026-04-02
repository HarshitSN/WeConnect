"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Vapi from "@vapi-ai/web";
import ConversationTranscript from "@/components/register/ConversationTranscript";
import VoiceAgentControls from "@/components/register/VoiceAgentControls";
import ProgressStepper from "@/components/register/ProgressStepper";
import AIOrb from "@/components/ui/AIOrb";
import type { OrbState } from "@/components/ui/AIOrb";
import CompletionCelebration from "@/components/ui/CompletionCelebration";
import { getNextQuestion, initialPointer, getSectionIndex } from "@/lib/voice-agent/engine";
import type { ConversationMessage, ConversationPointer, ConversationStepId, RegistrationState } from "@/types";
import { cn } from "@/lib/utils";
import { panelLift, SPRING_SOFT, statusGlow } from "@/lib/motion";
import {
  buildVapiContextMessage,
  extractFinalUserTranscript,
  extractProcessRegistrationTurnAnswer,
  isFillerUtterance,
  isYesNoLikeUtterance,
  normalizeUtterance,
} from "@/lib/voice-agent/vapi-adapter";

interface HistoryEntry {
  pointer: ConversationPointer;
  answers: RegistrationState;
  assessorId: string;
}

interface PendingAnswer {
  text: string;
  stepId: ConversationStepId;
  ts: number;
}

const PENDING_ANSWER_FRESH_MS = 5000;

function mkMessage(type: ConversationMessage["type"], text: string, pointer?: ConversationPointer): ConversationMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    text,
    timestamp: new Date().toISOString(),
    pointer,
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
      return { stepId: "owner_details", ownerIndex: 0 };
    case "owner_details":
      return { stepId: "owner_add_more", ownerIndex: pointer.ownerIndex ?? 0 };
    case "owner_add_more":
      return total >= 100 ? { stepId: "num_employees" } : { stepId: "owner_details", ownerIndex: (pointer.ownerIndex ?? 0) + 1 };
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
  const [celebrationText, setCelebrationText] = useState<string | null>(null);
  const [voiceDebug, setVoiceDebug] = useState<{ lastUtterance: string; ts: string; dropped: number }>({
    lastUtterance: "",
    ts: "",
    dropped: 0,
  });
  const [isVapiConfigured, setIsVapiConfigured] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const busyRef = useRef(busy);
  const runningRef = useRef(running);
  const speakingRef = useRef(isAssistantSpeaking);
  const pointerRef = useRef(pointer);
  const vapiRef = useRef<Vapi | null>(null);
  const processAnswerRef = useRef<(answer: string, expectedStepId?: ConversationStepId) => Promise<void>>(async () => {});
  const lastUserUtteranceRef = useRef<{ text: string; stepId: ConversationStepId; ts: number }>({
    text: "",
    stepId: pointer.stepId,
    ts: 0,
  });
  const pendingUserAnswerRef = useRef<PendingAnswer | null>(null);
  const stepRetryCountsRef = useRef<Partial<Record<ConversationStepId, number>>>({});

  const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
  const vapiAssistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim() ?? "";
  const hasVapiCredentials = Boolean(vapiPublicKey && vapiAssistantId);

  const currentPrompt = useMemo(() => getNextQuestion(pointer, answers), [pointer, answers]);

  const interactionState: OrbState = pointer.stepId === "done"
    ? "success"
    : busy
      ? "processing"
      : !running
        ? "idle"
        : isAssistantSpeaking
          ? "speaking"
          : isListening
            ? "listening"
            : "idle";

  const orbIntensity = interactionState === "speaking" ? 1.25 : interactionState === "listening" ? 1.15 : interactionState === "processing" ? 1.35 : 1;

  // Detect section transitions for celebration
  const prevSectionRef = useRef(getSectionIndex(pointer.stepId));
  useEffect(() => {
    const newSection = getSectionIndex(pointer.stepId);
    if (newSection > prevSectionRef.current && running) {
      const sectionNames = ["Business Info", "Location", "Industry", "Ownership", "Profile", "Certification"];
      const completedName = sectionNames[prevSectionRef.current] ?? "Section";
      setCelebrationText(`${completedName} complete!`);
      setTimeout(() => setCelebrationText(null), 2500);
    }
    prevSectionRef.current = newSection;
  }, [pointer.stepId, running]);

  const addMessage = useCallback((type: ConversationMessage["type"], text: string, msgPointer?: ConversationPointer) => {
    setMessages((prev) => [...prev, mkMessage(type, text, msgPointer)]);
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

  useEffect(() => {
    pointerRef.current = pointer;
  }, [pointer]);

  useEffect(() => {
    const pending = pendingUserAnswerRef.current;
    if (!pending) return;
    if (pending.stepId === pointer.stepId) return;
    pendingUserAnswerRef.current = null;
    console.info("[voice-agent] dropped_stale_answer", `from=${pending.stepId}`, `to=${pointer.stepId}`);
    setVoiceDebug((prev) => ({ ...prev, dropped: prev.dropped + 1 }));
  }, [pointer.stepId]);

  const stopAssistantSpeech = useCallback(() => {
    const vapi = vapiRef.current;
    if (vapi) {
      try {
        vapi.send({ type: "control", control: "mute-assistant" });
        setTimeout(() => {
          try {
            vapi.send({ type: "control", control: "unmute-assistant" });
          } catch {
            // noop
          }
        }, 120);
      } catch {
        // noop
      }
    }
    setIsAssistantSpeaking(false);
  }, []);

  const speakPrompt = useCallback(async (text: string) => {
    const safeText = text.trim();
    if (!safeText) return;

    const vapi = vapiRef.current;
    if (!vapi || !isVapiConfigured) return;

    setIsAssistantSpeaking(true);
    try {
      vapi.say(safeText, false, true, true);
    } catch {
      setIsAssistantSpeaking(false);
    }
  }, [isVapiConfigured]);

  const sendContextToVapi = useCallback((activePointer: ConversationPointer, activeState: RegistrationState) => {
    const vapi = vapiRef.current;
    if (!vapi || !runningRef.current) return;
    const contextMessage = buildVapiContextMessage({
      pointer: activePointer,
      state: activeState,
      assessorId,
      messages,
    });
    vapi.send({
      type: "add-message",
      message: {
        role: "system",
        content: contextMessage,
      },
      triggerResponseEnabled: false,
    });
  }, [assessorId, messages]);

  const startVapiSession = useCallback(async () => {
    if (!hasVapiCredentials) {
      setMicError("Voice is unavailable: set NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID.");
      setIsVapiConfigured(false);
      return;
    }

    let vapi = vapiRef.current;
    if (!vapi) {
      vapi = new Vapi(vapiPublicKey);
      vapiRef.current = vapi;
    }
    try {
      await vapi.start(vapiAssistantId);
      setMicError(null);
      setIsVapiConfigured(true);
      vapi.send({
        type: "add-message",
        message: {
          role: "system",
          content:
            "For every user utterance, call the function process_registration_turn with JSON arguments: {\"answer\":\"<exact user answer>\"}. Do not run your own independent registration flow.",
        },
        triggerResponseEnabled: false,
      });
      sendContextToVapi(pointer, answers);
    } catch {
      setMicError("Could not start Vapi voice session. You can continue by typing.");
      setIsVapiConfigured(false);
    }
  }, [answers, hasVapiCredentials, pointer, sendContextToVapi, vapiAssistantId, vapiPublicKey]);

  const stopVapiSession = useCallback(async () => {
    const vapi = vapiRef.current;
    if (!vapi) return;
    try {
      await vapi.stop();
    } catch {
      // noop
    }
  }, []);

  const askCurrent = useCallback(async () => {
    addMessage("bot_question", currentPrompt, pointer);
    await speakPrompt(currentPrompt);
  }, [addMessage, currentPrompt, speakPrompt, pointer]);

  useEffect(() => {
    onPointerChange?.(pointer);
  }, [onPointerChange, pointer]);

  useEffect(() => {
    if (!running || messages.length > 0) return;
    void askCurrent();
  }, [askCurrent, messages.length, running]);

  const processAnswer = useCallback(
    async (rawAnswer: string, expectedStepId?: ConversationStepId) => {
      const answer = rawAnswer.trim();
      const activePointer = pointer;
      const activeStepId = activePointer.stepId;

      if (!answer || busy || !running) return;
      if (expectedStepId && expectedStepId !== activeStepId) {
        console.info("[voice-agent] dropped_stale_answer", `expected=${expectedStepId}`, `current=${activeStepId}`);
        setVoiceDebug((prev) => ({ ...prev, dropped: prev.dropped + 1 }));
        return;
      }
      if (activeStepId === "country" && isYesNoLikeUtterance(answer)) {
        addMessage("system_hint", "Please say the country name, for example India, Pakistan, or United States.");
        await speakPrompt("Please say the country name, for example India, Pakistan, or United States.");
        return;
      }
      if ((activeStepId === "naics_codes" || activeStepId === "unspsc_codes") && isFillerUtterance(answer)) {
        const clarification = activeStepId === "naics_codes"
          ? "Please provide NAICS code or label, for example 72 - Accommodation and Food Services."
          : "Please provide UNSPSC code or category label, for example Information Technology.";
        addMessage("system_hint", clarification);
        await speakPrompt(clarification);
        return;
      }

      addMessage("user_answer", answer);
      setHistory((prev) => [...prev, { pointer: activePointer, answers: structuredClone(answers), assessorId }]);
      setBusy(true);

      try {
        const response = await fetch("/api/register-voice-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pointer: activePointer,
            answer,
            state: answers,
            turnMeta: { stepRetryCounts: stepRetryCountsRef.current },
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.ok || !data.result) {
          addMessage("system_hint", data?.error?.message || "Could not process your answer. Please retry.");
          return;
        }

        const result = data.result;
        const mergedAnswers: RegistrationState = {
          ...answers,
          ...(result.updates ?? {}),
          ownership_structure: result.ownershipUpdate ?? answers.ownership_structure,
        };

        if (result.updates || result.ownershipUpdate) {
          setAnswers(mergedAnswers);
        }

        if (typeof result.assessorId === "string") {
          setAssessorId(result.assessorId);
        }

        if (!result.ok && result.next.stepId === activeStepId) {
          const currentRetries = stepRetryCountsRef.current[activeStepId] ?? 0;
          const nextRetries = currentRetries + 1;
          stepRetryCountsRef.current = { ...stepRetryCountsRef.current, [activeStepId]: nextRetries };
          if ((activeStepId === "naics_codes" || activeStepId === "unspsc_codes") && nextRetries >= 2) {
            console.info("[voice-agent] loop_escalation_shown", `step=${activeStepId}`, `retries=${nextRetries}`);
          }
        } else {
          const retryCopy = { ...stepRetryCountsRef.current };
          delete retryCopy[activeStepId];
          stepRetryCountsRef.current = retryCopy;
        }

        addMessage("bot_confirm", result.confirmation);

        if (!result.ok && result.clarification) {
          sendContextToVapi(activePointer, mergedAnswers);
          addMessage("system_hint", result.clarification);
          await speakPrompt(result.clarification);
          return;
        }

        setPointer(result.next);
        sendContextToVapi(result.next, mergedAnswers);

        if (result.done) {
          const doneMsg = "Voice steps complete. Review the form, finish payment, then submit registration.";
          addMessage("system_hint", doneMsg);
          await speakPrompt(doneMsg);
          return;
        }

        const rawPrompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
        const nextPrompt = rawPrompt || getNextQuestion(result.next, mergedAnswers);
        addMessage("bot_question", nextPrompt, result.next);
        await speakPrompt(nextPrompt);
      } catch {
        addMessage("system_hint", "Network issue while processing answer. Please retry.");
      } finally {
        setBusy(false);
      }
    },
    [
      addMessage,
      answers,
      assessorId,
      busy,
      pointer,
      running,
      sendContextToVapi,
      setAnswers,
      setAssessorId,
      speakPrompt,
    ],
  );

  const onSubmitTyped = async () => {
    if (!typedAnswer.trim()) return;
    const input = typedAnswer;
    setTypedAnswer("");
    await processAnswer(input, pointer.stepId);
  };

  const onStartPause = async () => {
    if (running) {
      await stopVapiSession();
      setRunning(false);
      return;
    }

    if (!hasVoiceIntroAccepted) {
      setIsVoiceIntroOpen(true);
      return;
    }

    setRunning(true);
    await startVapiSession();
  };

  const onRepeat = async () => {
    if (!running) return;
    addMessage("bot_question", currentPrompt, pointer);
    await speakPrompt(currentPrompt);
  };

  const onSkip = async () => {
    if (!running || busy) return;
    const next = nextBySkip(pointer, answers);
    setPointer(next);
    const prompt = getNextQuestion(next, answers);
    addMessage("system_hint", "No problem — you can fill this in later from your dashboard.");
    addMessage("bot_question", prompt, next);
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
    addMessage("bot_question", prompt, last.pointer);
    await speakPrompt(prompt);
  };

  const onEditLast = async () => {
    await onGoBack();
  };

  const onConfirmVoiceIntro = async () => {
    setHasVoiceIntroAccepted(true);
    setIsVoiceIntroOpen(false);
    setRunning(true);
    await startVapiSession();
  };

  useEffect(() => {
    processAnswerRef.current = processAnswer;
  }, [processAnswer]);

  const submitOrQueueAnswer = useCallback((answer: string) => {
    const safe = answer.trim();
    if (!safe || !runningRef.current) return;
    const stepId = pointerRef.current.stepId;
    if (busyRef.current) {
      pendingUserAnswerRef.current = { text: safe, stepId, ts: Date.now() };
      return;
    }
    void processAnswerRef.current(safe, stepId);
  }, []);

  useEffect(() => {
    if (busy || !running) return;
    const pending = pendingUserAnswerRef.current;
    if (!pending) return;
    const now = Date.now();
    const currentStepId = pointerRef.current.stepId;
    pendingUserAnswerRef.current = null;
    if (pending.stepId !== currentStepId || now - pending.ts > PENDING_ANSWER_FRESH_MS) {
      console.info(
        "[voice-agent] dropped_stale_answer",
        `pending_step=${pending.stepId}`,
        `current_step=${currentStepId}`,
        `age_ms=${now - pending.ts}`,
      );
      setVoiceDebug((prev) => ({ ...prev, dropped: prev.dropped + 1 }));
      return;
    }
    console.info("[voice-agent] queued_answer_applied", `step=${pending.stepId}`, `age_ms=${now - pending.ts}`);
    void processAnswerRef.current(pending.text, pending.stepId);
  }, [busy, running]);

  useEffect(() => {
    if (!running) return;
    sendContextToVapi(pointer, answers);
  }, [answers, pointer, running, sendContextToVapi]);

  useEffect(() => {
    if (!hasVapiCredentials) return;
    if (vapiRef.current) return;

    const vapi = new Vapi(vapiPublicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setIsListening(true);
      setMicError(null);
      setIsVapiConfigured(true);
    });

    vapi.on("call-end", () => {
      setIsListening(false);
      setIsAssistantSpeaking(false);
    });

    vapi.on("speech-start", () => {
      setIsAssistantSpeaking(true);
      setIsListening(false);
    });

    vapi.on("speech-end", () => {
      setIsAssistantSpeaking(false);
      if (runningRef.current && !busyRef.current) {
        setIsListening(true);
      }
    });

    vapi.on("error", () => {
      const msg = "Vapi session error. You can continue by typing.";
      setMicError(msg);
      addMessage("system_hint", msg);
      setIsListening(false);
    });

    vapi.on("message", (message: unknown) => {
      const toolAnswer = extractProcessRegistrationTurnAnswer(message);
      if (toolAnswer) {
        if (!runningRef.current) return;
        if (speakingRef.current) stopAssistantSpeech();
        const now = Date.now();
        const stepId = pointerRef.current.stepId;
        const normalized = normalizeUtterance(toolAnswer);
        if (
          normalized &&
          normalized === lastUserUtteranceRef.current.text &&
          stepId === lastUserUtteranceRef.current.stepId &&
          now - lastUserUtteranceRef.current.ts < 1800
        ) {
          return;
        }
        // Stale cross-step detection: if the pointer just changed and this
        // utterance matches the last utterance from a *different* step, it's a
        // stale replay (old tool-call resurfacing after pointer advance).
        if (
          normalized &&
          normalized === lastUserUtteranceRef.current.text &&
          stepId !== lastUserUtteranceRef.current.stepId &&
          now - lastUserUtteranceRef.current.ts < 3000
        ) {
          console.info("[voice-agent] dropped_cross_step_stale_tool_answer", `prev=${lastUserUtteranceRef.current.stepId}`, `cur=${stepId}`);
          setVoiceDebug((prev) => ({ ...prev, dropped: prev.dropped + 1 }));
          return;
        }
        lastUserUtteranceRef.current = { text: normalized, stepId, ts: now };
        submitOrQueueAnswer(toolAnswer);
        return;
      }

      const transcript = extractFinalUserTranscript(message);
      if (!transcript) return;
      if (!runningRef.current) return;
      if (speakingRef.current) stopAssistantSpeech();
      setVoiceDebug({
        lastUtterance: transcript,
        ts: new Date().toISOString(),
        dropped: 0,
      });
      const now = Date.now();
      const stepId = pointerRef.current.stepId;
      const normalized = normalizeUtterance(transcript);
      if (
        normalized &&
        normalized === lastUserUtteranceRef.current.text &&
        stepId === lastUserUtteranceRef.current.stepId &&
        now - lastUserUtteranceRef.current.ts < 1800
      ) {
        return;
      }
      // Stale cross-step detection for transcripts: if the pointer just
      // changed and this utterance is the same as the prior step's last
      // utterance, drop it as a stale conversation-update replay.
      if (
        normalized &&
        normalized === lastUserUtteranceRef.current.text &&
        stepId !== lastUserUtteranceRef.current.stepId &&
        now - lastUserUtteranceRef.current.ts < 3000
      ) {
        console.info("[voice-agent] dropped_cross_step_stale_transcript", `prev=${lastUserUtteranceRef.current.stepId}`, `cur=${stepId}`);
        setVoiceDebug((prev) => ({ ...prev, dropped: prev.dropped + 1 }));
        return;
      }
      lastUserUtteranceRef.current = { text: normalized, stepId, ts: now };
      submitOrQueueAnswer(transcript);
    });

    return () => {
      void vapi.stop();
      vapi.removeAllListeners();
      vapiRef.current = null;
    };
  }, [hasVapiCredentials, stopAssistantSpeech, submitOrQueueAnswer, vapiPublicKey]);

  useEffect(() => {
    return () => {
      stopAssistantSpeech();
      void stopVapiSession();
    };
  }, [stopAssistantSpeech, stopVapiSession]);

  const modeLabel =
    interactionState === "success"
      ? "Completed"
      : interactionState === "processing"
        ? "Processing Answer"
        : interactionState === "speaking"
          ? "Assistant Speaking"
          : interactionState === "listening"
            ? "Listening"
            : "Paused";

  return (
    <motion.div
      className="space-y-4"
      variants={panelLift}
      initial="hidden"
      animate="visible"
    >
      <motion.div layout={!prefersReducedMotion} className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">Voice Assistant</h2>
          <p className="text-xs text-gray-500">Interactive voice + text guidance. Use Pause to stop voice session; typing remains available anytime.</p>
        </div>
        <span className="badge bg-blue-100 text-blue-700">Current: {pointer.stepId.replaceAll("_", " ")}</span>
      </motion.div>

      <motion.div layout={!prefersReducedMotion}>
        <ProgressStepper currentStepId={pointer.stepId} />
      </motion.div>

      <AnimatePresence>
        {celebrationText && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            <CompletionCelebration text={celebrationText} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout={!prefersReducedMotion} transition={SPRING_SOFT}>
        <VoiceAgentControls
          running={running}
          onStartPause={onStartPause}
          onRepeat={onRepeat}
          onSkip={onSkip}
          onGoBack={onGoBack}
          onEditLast={onEditLast}
        />
      </motion.div>

      <motion.div
        layout={!prefersReducedMotion}
        className={cn(
          "interaction-state interactive-surface bg-gradient-to-br p-3 ring-1",
          statusGlow[interactionState].ring,
          statusGlow[interactionState].surface,
        )}
        transition={SPRING_SOFT}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={cn("text-xs font-semibold uppercase tracking-[0.12em]", statusGlow[interactionState].text)}>{modeLabel}</p>
            <p className="text-xs text-gray-600">Live command bar adapts to every turn so the flow feels guided, not static.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="voice-pill voice-pill-idle text-[11px] font-semibold">Step {pointer.stepId.replaceAll("_", " ")}</span>
            {busy && <span className="voice-pill voice-pill-live text-[11px] font-semibold animate-soft-shimmer bg-[length:180%_100%]">Syncing...</span>}
          </div>
        </div>
      </motion.div>

      <motion.div layout={!prefersReducedMotion} transition={SPRING_SOFT}>
        <AIOrb
          state={interactionState}
          intensity={orbIntensity}
          mutedMotion={Boolean(prefersReducedMotion)}
        />
      </motion.div>

      <motion.div layout={!prefersReducedMotion} transition={SPRING_SOFT}>
        <ConversationTranscript
          messages={messages}
          answers={answers}
          setAnswers={setAnswers}
          assessorId={assessorId}
          setAssessorId={setAssessorId}
          isSubmitting={busy}
        />
      </motion.div>

      <motion.div className="space-y-2" layout={!prefersReducedMotion} transition={SPRING_SOFT}>
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
      </motion.div>

      <motion.div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3" layout={!prefersReducedMotion}>
        <div>
          <p className="text-xs font-semibold text-gray-700">Answer by voice</p>
          <p className="text-xs text-gray-500">
            Powered by Vapi with real-time interruption. Use Pause above to stop voice session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "voice-pill text-[11px] font-semibold",
            isVapiConfigured ? "voice-pill-live" : "voice-pill-idle",
          )}>
            {isVapiConfigured ? "Vapi Connected" : "Vapi Not Configured"}
          </span>
          {!hasVapiCredentials && (
            <span className="text-[11px] text-amber-700">Set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.</span>
          )}
        </div>
      </motion.div>

      <motion.div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2" layout={!prefersReducedMotion}>
        <p className="text-xs text-gray-600">
          Voice status:{" "}
          <span className="font-semibold text-gray-800">
            {!running ? "Paused" : busy || isAssistantSpeaking ? "Assistant speaking..." : isListening ? "Recording..." : "Connecting mic..."}
          </span>
        </p>
      </motion.div>

      {process.env.NODE_ENV !== "production" && (
        <p className="sr-only" aria-hidden="true">
          Debug voice: {voiceDebug.lastUtterance} {voiceDebug.ts} dropped:{voiceDebug.dropped}
        </p>
      )}

      <AnimatePresence>
        {micError && (
          <motion.p className="text-xs text-red-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {micError}
          </motion.p>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {busy && (
          <motion.p className="text-xs text-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Processing answer...
          </motion.p>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}
