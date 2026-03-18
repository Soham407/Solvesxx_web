import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

// Plus Jakarta Sans - Refined, modern, excellent for data-dense apps
const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

// DM Sans - Clean geometric sans for headings
const dmSans = DM_Sans({ 
  subsets: ["latin"], 
  variable: "--font-heading",
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

// JetBrains Mono - For IDs, codes, and technical content
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    template: "%s | FacilityPro",
    default: "FacilityPro — Enterprise Facility Management",
  },
  description: "Next-generation facility management and ERP solution for modern enterprises.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased selection:bg-primary/10 selection:text-primary`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster position="top-right" closeButton richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
