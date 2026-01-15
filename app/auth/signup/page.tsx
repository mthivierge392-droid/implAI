// app/auth/signup/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password: string) => password.length >= 6;

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    const newErrors: typeof errors = {};
    if (!validateEmail(email)) newErrors.email = 'Please enter a valid email';
    if (!validatePassword(password)) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName || null,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) throw signUpError;

      // Create client record
      if (data.user) {
        const { error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: data.user.id,
            email: email,
            company_name: companyName || null,
            minutes_included: 0,
            minutes_used: 0,
          });

        if (clientError) {
          console.error('Client creation error:', clientError);
          // Don't fail signup if client creation fails - admin can fix this
        }
      }

      setSuccess(true);
      showToast('Account created successfully! Please check your email to verify your account.', 'success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (error: any) {
      console.error('Sign up error:', error);

      let message = 'Failed to create account';
      if (error.message?.includes('already registered')) {
        message = 'An account with this email already exists';
      } else if (error.message?.includes('Invalid email')) {
        message = 'Please enter a valid email address';
      }

      setError(message);
      showToast(message, 'error');
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
                  We've sent you an email with a confirmation link. Please click the link to verify your account.
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
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>

            <div className="space-y-4 text-center mb-8">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-xl flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                <p className="text-sm text-muted-foreground">
                  Sign up to get started with your AI voice agents
                </p>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-5">
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
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground",
                      "focus:ring-2 focus:ring-ring focus:border-ring transition-all",
                      errors.email && "border-destructive focus:border-destructive focus:ring-destructive"
                    )}
                    disabled={loading}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="companyName" className="text-sm font-medium text-foreground">
                  Company Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="companyName"
                    type="text"
                    name="companyName"
                    autoComplete="organization"
                    placeholder="Your Company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
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
                  Confirm Password
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
                <User size={18} />
                Create Account
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
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
