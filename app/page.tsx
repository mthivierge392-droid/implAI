// app/page.tsx
'use client';

import LoginForm from '@/components/LoginForm';
import { Footer } from '@/components/Footer';
import { Phone, Shield, Zap } from 'lucide-react';
import { siteConfig } from '@/config/site';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 dark:bg-grid-white/5 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />

        <div className="relative w-full max-w-md">
          {/* Glassmorphism card */}
          <div className="bg-card/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-border p-8">
            <div className="space-y-4 text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">{siteConfig.login.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {siteConfig.login.subtitle}
                </p>
              </div>
            </div>
            <LoginForm />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>{siteConfig.login.features.feature1}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>{siteConfig.login.features.feature2}</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{siteConfig.login.features.feature3}</span>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}