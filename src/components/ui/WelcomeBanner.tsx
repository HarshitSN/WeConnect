import { Sparkles } from "lucide-react";

export default function WelcomeBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/30 bg-banner-gradient p-5 shadow-lg shadow-brand-indigo/20">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/20">
        <Sparkles className="text-white" size={20} />
      </div>
      <div>
        <h2 className="text-base font-bold leading-snug text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-white/80">{subtitle}</p>
      </div>
    </div>
  );
}
