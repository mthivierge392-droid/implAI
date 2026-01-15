// app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
      showToast('Password reset email sent', 'success');

    } catch (error: any) {
      console.error('Password reset error:', error);
      setError('Failed to send reset email. Please try again.');
      showToast('Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <div className="bg-card/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-border p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Check Your Email</h2>
                <p className="text-muted-foreground">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                <Link href="/">
                  <Button variant="outline" className="mt-4">
                    <ArrowLeft size={16} />
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 dark:bg-grid-white/5 bg-grid-black/5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]" />

        <div className="relative w-full max-w-md">
          <div className="bg-card/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-border p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>

            <div className="space-y-4 text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Forgot Password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a link to reset your password
                </p>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
              {error && (
                <div className={cn(
                  "p-3 rounded-lg border flex items-center gap-2 text-sm",
                  "bg-destructive/10 border-destructive/20 text-destructive"
                )}>
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground",
                      "focus:ring-2 focus:ring-ring focus:border-ring transition-all",
                      error && "border-destructive focus:border-destructive focus:ring-destructive"
                    )}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                <Mail size={18} />
                Send Reset Link
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
