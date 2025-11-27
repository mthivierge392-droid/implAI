'use client';

import LoginForm from '@/components/LoginForm';
import { Phone } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Phone size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sign in to your AI monitoring dashboard
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />
        </div>

        {/* Subtle Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Protected by enterprise-grade security
        </div>
      </div>
    </main>
  );
}