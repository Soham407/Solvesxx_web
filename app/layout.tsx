import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";

import "./globals.css";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import {
  BRAND_DESCRIPTION,
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  BRAND_PORTAL_LABEL,
} from "@/src/lib/brand";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${BRAND_NAME}`,
    default: `${BRAND_NAME} | ${BRAND_PORTAL_LABEL}`,
  },
  description: `${BRAND_LEGAL_NAME}. ${BRAND_DESCRIPTION}`,
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${plusJakarta.variable} ${cormorant.variable} ${jetbrainsMono.variable} font-sans antialiased selection:bg-primary/10 selection:text-primary`}
      >
        <AuthProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster position="top-right" closeButton richColors />
          <ShadcnToaster />
        </AuthProvider>
      </body>
    </html>
  );
}
