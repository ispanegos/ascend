import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, Cinzel } from "next/font/google";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "@/components/shell/ServiceWorkerRegistration";
import "@/styles/tokens.css";
import "@/styles/globals.css";
import "@/styles/utilities.css";

// Product type (Design System V2 §7): Barlow for text and forms, Barlow Semi
// Condensed for headings, labels and metrics. Both have tabular figures.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-barlow",
});

const barlowCondensed = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-barlow-condensed",
});

// Fantasy display type: wordmark, Boss names, rare milestone titles only.
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-cinzel",
});

export const metadata: Metadata = {
  title: { default: "ASCEND", template: "%s · ASCEND" },
  description: "Real progress. Real you. An RPG where the character is your real body.",
  applicationName: "ASCEND",
  appleWebApp: { capable: true, title: "ASCEND", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) on iOS (spec §26).
  viewportFit: "cover",
  themeColor: "#091922",
  colorScheme: "dark",
  // Keeps the layout stable when the on-screen keyboard opens (spec §41).
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} ${cinzel.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
