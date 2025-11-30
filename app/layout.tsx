import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/lib/providers';
import { ThemeProvider } from '@/lib/theme-provider';
import { ToastContainer } from '@/components/toast';
import { validateEnv } from '@/lib/validate-env';
import { APP_CONFIG } from '@/lib/config';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} - Monitoring`,
  description: APP_CONFIG.description,
};


// Validate environment on startup
validateEnv();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <ThemeProvider>{children}</ThemeProvider>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}