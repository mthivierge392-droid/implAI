// app/legal/terms/page.tsx
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Terms of Service | ${siteConfig.company.name}`,
  description: `Terms of Service for ${siteConfig.company.name}`,
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>

          <p className="text-muted-foreground mb-8">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using {siteConfig.company.name}, you agree to be bound by these Terms of Service.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p>
              This platform provides an AI Phone Agents monitoring dashboard that allows you to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Monitor AI phone call agents powered by Retell AI</li>
              <li>View call history and transcripts</li>
              <li>Manage agent prompts and configurations</li>
              <li>Track minute usage</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Account Responsibilities</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Eligibility</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must be at least 18 years old</li>
              <li>You must provide accurate information</li>
              <li>One account per user/business</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Account Security</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining account security</li>
              <li>Do not share your password</li>
              <li>Notify us immediately of unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use Policy</h2>
            <p className="mb-4">You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for illegal activities</li>
              <li>Spam or harass phone numbers</li>
              <li>Attempt to bypass rate limiting or security measures</li>
              <li>Reverse engineer or copy the Service</li>
              <li>Use bots or automated systems to abuse the API</li>
              <li>Violate telephone regulations (TCPA, Do Not Call lists)</li>
              <li>Impersonate others or provide false information</li>
            </ul>
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive font-semibold">
                ⚠️ Violation may result in immediate account termination.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Service Availability</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Uptime</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>We strive for 99.9% uptime</li>
              <li>No guarantee of uninterrupted service</li>
              <li>Scheduled maintenance will be announced</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.2 No Warranty</h3>
            <p>
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data and Privacy</h2>
            <p>
              Your use of the Service is governed by our{' '}
              <a href="/legal/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>You own your data (call transcripts, agent configs)</li>
              <li>We may use aggregated, anonymized data for analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Service and its content are owned by the service provider</li>
              <li>You retain ownership of your data</li>
              <li>We grant you a limited, non-exclusive license to use the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <div className="p-4 bg-muted rounded-lg">
              <p className="mb-4">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We are NOT liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount you paid in the last 12 months</li>
                <li>We are NOT responsible for third-party services (Retell AI, Supabase, Stripe)</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.1 By You</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You may close your account at any time</li>
              <li>Contact support to request deletion</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.2 By Us</h3>
            <p className="mb-4">We may terminate your account if:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You violate these Terms</li>
              <li>You abuse the Service</li>
              <li>We discontinue the Service (with 30 days notice)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
            <p>
              For questions about these Terms, please contact us at{' '}
              <a href={`mailto:${siteConfig.company.supportEmail}`} className="text-primary hover:underline">
                {siteConfig.company.supportEmail}
              </a>
            </p>
          </section>

          <div className="mt-12 p-6 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <strong>By using {siteConfig.company.name}, you acknowledge that you have read and agree to these Terms of Service.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
