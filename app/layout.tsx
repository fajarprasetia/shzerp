import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers";
import { GlassLayout } from "./components/layout/glass-layout";
import { Toaster } from "@/components/ui/toaster";
import { SWRProvider } from "@/app/providers";
import { SessionProvider } from "@/app/providers";
import { LanguageProvider } from "@/app/providers";
import { I18nProvider } from "./app";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SHUNHUI ZHIYE INDONESIA",
  description: "Enterprise Resource Planning System for SHUNHUI ZHIYE INDONESIA",
  icons: {
    icon: [
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon_io/favicon.ico", type: "image/x-icon" },
    ],
    apple: {
      url: "/favicon_io/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
    other: [
      {
        rel: "manifest",
        url: "/favicon_io/site.webmanifest",
      },
      {
        url: "/favicon_io/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/favicon_io/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="ui-theme"
        >
          <SessionProvider>
            <SWRProvider>
              <LanguageProvider>
                <I18nProvider>
                  {children}
                </I18nProvider>
              </LanguageProvider>
            </SWRProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 