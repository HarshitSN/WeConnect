import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WEConnect — Smart Supply For Impact",
  description: "AI-powered WOB certification platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
