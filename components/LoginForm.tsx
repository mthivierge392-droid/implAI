'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { showToast } from '@/components/toast';
import { cn } from '@/lib/utils';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password: string) => password.length >= 6;

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate
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

  const handleContactUs = () => {
    // Opens default email client immediately
    window.location.href = 'mailto:mthivierge392@gmail.com?subject=Request%20for%20AI%20Monitoring%20Account';
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {/* Error Message */}
      {error && (
        <div className={cn(
          "p-3 rounded-lg border flex items-center gap-2 text-sm",
          "bg-red-50 border-red-200 text-red-700",
          "dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
        )}>
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
            }}
            className={cn(
              "w-full pl-10 pr-4 py-3 rounded-lg border text-base transition-all",
              "bg-slate-50 dark:bg-slate-900",
              "border-slate-200 dark:border-slate-700",
              "text-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            disabled={loading}
          />
        </div>
        {errors.email && <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Password
        </label>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
            }}
            className={cn(
              "w-full pl-10 pr-4 py-3 rounded-lg border text-base transition-all",
              "bg-slate-50 dark:bg-slate-900",
              "border-slate-200 dark:border-slate-700",
              "text-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500"
            )}
            disabled={loading}
          />
        </div>
        {errors.password && <p className="text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full py-3 px-4 rounded-lg font-semibold text-white transition-all",
          "bg-blue-600 hover:bg-blue-700 active:scale-95",
          "disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100",
          "flex items-center justify-center gap-2"
        )}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <LogIn size={18} />
            Sign In
          </>
        )}
      </button>

      {/* Contact Us Button */}
      <button
        type="button"
        onClick={handleContactUs}
        className="w-full py-3 px-4 rounded-lg font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center gap-2 mt-2"
      >
        <Mail size={18} />
        Contact us to create an account
      </button>
    </form>
  );
}