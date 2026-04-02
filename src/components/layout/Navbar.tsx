"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, BookOpen, ShoppingBag, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const path = usePathname();
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/buyer-portal", label: "Buyer Portal", icon: ShoppingBag },
    { href: "/ecosystem", label: "Ecosystem", icon: Network },
    { href: "/documentation", label: "Docs", icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-300/35 bg-[#f6f1e8]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-indigo shadow-md shadow-brand-indigo/20">
            <span className="text-xs font-bold text-white">WE</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold text-slate-900">WEConnect</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">Smart Supply Stack</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3.5 sm:text-sm",
                path.startsWith(href)
                  ? "border-brand-indigo/25 bg-brand-indigo text-white shadow-md shadow-brand-indigo/25"
                  : "border-transparent text-slate-600 hover:border-slate-300/45 hover:bg-white/75 hover:text-slate-900",
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
