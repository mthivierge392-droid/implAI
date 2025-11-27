// app/page.tsx
'use client';

import LoginForm from '@/components/LoginForm';
import { Phone, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/10 dark:bg-grid-white/5 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />
      
      <div className="relative w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-4 pb-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold">AI Phone Agents</CardTitle>
              <p className="text-sm text-muted-foreground">
                Professional monitoring dashboard for your AI calling system
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        <div className="mt-6 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1">
            <Shield className="w-4 h-4" />
            <span>Secure</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-4 h-4" />
            <span>Real-time</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Phone className="w-4 h-4" />
            <span>Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
}