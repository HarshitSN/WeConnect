"use client";

import { useEffect, useRef } from "react";
import type { ConversationMessage } from "@/types";
import { cn } from "@/lib/utils";

export default function ConversationTranscript({
  messages,
}: {
  messages: ConversationMessage[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3"
      aria-live="polite"
    >
      {messages.map((message) => {
        const isUser = message.type === "user_answer";
        const isHint = message.type === "system_hint";
        return (
          <div
            key={message.id}
            className={cn("flex", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                isUser && "bg-brand-blue text-white",
                !isUser && !isHint && "bg-white border border-gray-200 text-gray-800",
                isHint && "bg-amber-50 border border-amber-200 text-amber-800",
              )}
            >
              {message.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
