import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/lib/providers';
import { ThemeProvider } from '@/lib/theme-provider';
import { ToastContainer } from '@/components/toast';
import { LanguageProvider } from '@/lib/language-provider'; // ✅ NEW IMPORT

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Phone Agents - Monitoring",
  description: "Gérez vos agents téléphoniques IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <ThemeProvider>
            <LanguageProvider> {/* ✅ WRAP WITH LANGUAGE PROVIDER */}
              {children}
            </LanguageProvider>
          </ThemeProvider>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}