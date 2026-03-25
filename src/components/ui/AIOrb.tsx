"use client";

import { cn } from "@/lib/utils";

export type OrbState = "idle" | "speaking" | "listening";

const stateConfig: Record<OrbState, { gradient: string; animation: string; label: string }> = {
  idle: {
    gradient: "from-blue-400 to-indigo-500",
    animation: "animate-orb-pulse",
    label: "Ready",
  },
  speaking: {
    gradient: "from-purple-500 to-fuchsia-500",
    animation: "animate-orb-speak",
    label: "Speaking",
  },
  listening: {
    gradient: "from-emerald-400 to-teal-500",
    animation: "animate-orb-listen",
    label: "Listening",
  },
};

export default function AIOrb({ state = "idle" }: { state?: OrbState }) {
  const cfg = stateConfig[state];

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-md",
            cfg.gradient,
            cfg.animation,
          )}
          style={{ width: 72, height: 72 }}
        />
        {/* Main orb */}
        <div
          className={cn(
            "relative w-[72px] h-[72px] rounded-full bg-gradient-to-br shadow-lg",
            cfg.gradient,
            cfg.animation,
          )}
        >
          {/* Inner highlight */}
          <div className="absolute inset-2 rounded-full bg-white/20" />
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/60" />
          </div>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-500 tracking-wide uppercase">
        {cfg.label}
      </span>
    </div>
  );
}
