import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "@/components/shell/ServiceWorkerRegistration";
import "@/styles/tokens.css";
import "@/styles/globals.css";
import "@/styles/utilities.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "ASCEND", template: "%s · ASCEND" },
  description: "Personal athletic progression. There is always another summit.",
  applicationName: "ASCEND",
  appleWebApp: { capable: true, title: "ASCEND", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) on iOS (spec §26).
  viewportFit: "cover",
  themeColor: "#f4f1e8",
  // Keeps the layout stable when the on-screen keyboard opens (spec §41).
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
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
