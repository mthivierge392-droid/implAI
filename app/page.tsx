'use client';

import LoginForm from '@/components/LoginForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">AI Monitoring</h1>
          <p className="text-gray-600">Manage your AI phone calls</p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            No account?{' '}
            <a href="mailto:support@yourdomain.com" className="text-blue-600 hover:text-blue-800 font-semibold">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}