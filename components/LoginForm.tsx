'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ContactForm from '@/components/ContactForm';
import { siteConfig } from '@/config/site';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password: string) => password.length >= 6;

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const newErrors: typeof errors = {};
    if (!validateEmail(email)) newErrors.email = 'Please enter a valid email';
    if (!validatePassword(password)) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      showToast('Login successful', 'success');
      router.push('/dashboard');
      router.refresh();
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let message = 'Invalid credentials';
      if (error.message?.includes('Invalid login')) {
        message = 'Invalid email or password';
      }
      
      setError(message);
      showToast('Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-5">
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
              placeholder={siteConfig.login.emailPlaceholder}
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
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder={siteConfig.login.passwordPlaceholder}
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

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={loading}
        >
          <LogIn size={18} />
          {siteConfig.login.loginButton}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowContactForm(true)}
          disabled={loading}
          className="w-full"
        >
          <Mail size={18} />
          {siteConfig.login.contactButton}
        </Button>
      </form>

      {showContactForm && (
        <ContactForm onClose={() => setShowContactForm(false)} />
      )}
    </>
  );
}