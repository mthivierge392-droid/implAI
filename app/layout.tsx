// app/layout.tsx - UPDATED VERSION
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from '@/lib/providers';
import { ThemeProvider } from '@/lib/theme-provider';
import { ToastContainer } from '@/components/toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Phone Agents",
  description: "Real-time AI phone agent monitoring platform",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ✅ Validate env on every request in development
  if (process.env.NODE_ENV === 'development') {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'RETELL_API_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_SECRET'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      return (
        <html lang="en">
          <body style={{ 
            padding: '40px', 
            fontFamily: 'monospace', 
            backgroundColor: '#1a1a1a', 
            color: '#ff4444' 
          }}>
            <h1>❌ MISSING ENVIRONMENT VARIABLES</h1>
            <p>The following required variables are missing from your .env.local file:</p>
            <ul>
              {missing.map(key => <li key={key}><strong>{key}</strong></li>)}
            </ul>
            <hr style={{ margin: '20px 0', borderColor: '#333' }} />
            <h2>🔧 How to fix:</h2>
            <ol>
              <li>Create a <strong>.env.local</strong> file in your project root</li>
              <li>Copy the template from <strong>.env.example</strong></li>
              <li>Fill in all values from your Supabase and Retell dashboards</li>
              <li>Restart the dev server</li>
            </ol>
            <p style={{ color: '#888' }}>See SETUP.md for detailed instructions</p>
          </body>
        </html>
      );
    }
  }
  
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