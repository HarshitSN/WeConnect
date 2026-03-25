"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationMessage } from "@/types";
import { cn } from "@/lib/utils";
import TypewriterText, { ThinkingDots } from "@/components/ui/TypewriterText";
import { Bot, User } from "lucide-react";

export default function ConversationTranscript({
  messages,
}: {
  messages: ConversationMessage[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const lastBotId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === "bot_question" || messages[i].type === "bot_confirm") {
        return messages[i].id;
      }
    }
    return null;
  })();

  return (
    <div
      ref={containerRef}
      className="h-[420px] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3"
      aria-live="polite"
    >
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-400 italic">Start the voice session to begin...</p>
        </div>
      )}
      {messages.map((message) => {
        const isUser = message.type === "user_answer";
        const isHint = message.type === "system_hint";
        const isBot = message.type === "bot_question" || message.type === "bot_confirm";
        const shouldTypewrite = isBot && message.id === lastBotId && !completedIds.has(message.id);

        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-2",
              isUser ? "justify-end animate-slide-in-right" : "justify-start animate-slide-in-left",
            )}
          >
            {/* Bot avatar */}
            {!isUser && (
              <div className={cn(
                "shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
                isHint ? "bg-amber-100" : "bg-gradient-to-br from-blue-500 to-indigo-600",
              )}>
                {isHint ? (
                  <span className="text-xs">💡</span>
                ) : (
                  <Bot size={14} className="text-white" />
                )}
              </div>
            )}

            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                isUser && "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm",
                isBot && "bg-white border border-gray-200 text-gray-800 shadow-sm",
                isHint && "bg-amber-50 border border-amber-200 text-amber-800",
              )}
            >
              {shouldTypewrite ? (
                <TypewriterText
                  text={message.text}
                  speed={22}
                  onComplete={() => setCompletedIds((prev) => new Set(prev).add(message.id))}
                />
              ) : (
                message.text
              )}
            </div>

            {/* User avatar */}
            {isUser && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mt-0.5">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
