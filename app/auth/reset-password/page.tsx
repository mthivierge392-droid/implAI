// app/auth/reset-password/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/Footer';

const validatePassword = (password: string) => password.length >= 6;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user has a valid session from the reset email link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidSession(true);
      } else {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    const newErrors: typeof errors = {};
    if (!validatePassword(password)) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      showToast('Password updated successfully', 'success');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error: any) {
      console.error('Password update error:', error);
      setError('Failed to update password. Please try again.');
      showToast('Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!validSession && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <div className="bg-card/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-border p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Invalid Reset Link</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button
                  onClick={() => router.push('/auth/forgot-password')}
                  className="mt-4"
                >
                  Request New Reset Link
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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
                <h2 className="text-2xl font-bold text-foreground">Password Updated</h2>
                <p className="text-muted-foreground">
                  Your password has been successfully updated. You can now log in with your new password.
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to login page...
                </p>
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
            <div className="space-y-4 text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your new password below
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
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground",
                      "focus:ring-2 focus:ring-ring focus:border-ring transition-all",
                      errors.password && "border-destructive focus:border-destructive focus:ring-destructive"
                    )}
                    disabled={loading}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground",
                      "focus:ring-2 focus:ring-ring focus:border-ring transition-all",
                      errors.confirmPassword && "border-destructive focus:border-destructive focus:ring-destructive"
                    )}
                    disabled={loading}
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                <Lock size={18} />
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
