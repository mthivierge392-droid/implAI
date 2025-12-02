// app/legal/privacy/page.tsx
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.company.name}`,
  description: `Privacy Policy for ${siteConfig.company.name}`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>

          <p className="text-muted-foreground mb-8">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              This Privacy Policy explains how we collect, use, and protect your personal information
              when you use our {siteConfig.company.name} service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Email address, password (encrypted)</li>
              <li><strong>Business Information:</strong> Company name, support email</li>
              <li><strong>Agent Configuration:</strong> AI agent prompts and settings</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Information Automatically Collected</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Call Data:</strong> Phone numbers, call duration, timestamps</li>
              <li><strong>Call Transcripts:</strong> Audio transcriptions from AI phone calls</li>
              <li><strong>Usage Data:</strong> Minutes used, API requests</li>
              <li><strong>Technical Data:</strong> IP addresses (for rate limiting), browser type, device information</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Payment Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Payment data is processed by <strong>Stripe</strong> (our payment processor)</li>
              <li>We do <strong>NOT</strong> store full credit card numbers</li>
              <li>We store transaction IDs and purchase history</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the AI Phone Agents service</li>
              <li>Process payments and track minute usage</li>
              <li>Monitor call history and generate transcripts</li>
              <li>Prevent fraud and abuse (rate limiting)</li>
              <li>Send important service updates</li>
              <li>Improve our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
            <p className="mb-4">We use the following trusted third-party services:</p>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-border rounded-lg">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left border-b border-border">Service</th>
                    <th className="px-4 py-2 text-left border-b border-border">Purpose</th>
                    <th className="px-4 py-2 text-left border-b border-border">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">Supabase</td>
                    <td className="px-4 py-2">Database, Authentication</td>
                    <td className="px-4 py-2">
                      <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Supabase Privacy
                      </a>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">Retell AI</td>
                    <td className="px-4 py-2">AI Phone Agents</td>
                    <td className="px-4 py-2">
                      <a href="https://retellai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Retell Privacy
                      </a>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">Stripe</td>
                    <td className="px-4 py-2">Payment Processing</td>
                    <td className="px-4 py-2">
                      <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Stripe Privacy
                      </a>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">Upstash</td>
                    <td className="px-4 py-2">Rate Limiting</td>
                    <td className="px-4 py-2">
                      <a href="https://upstash.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Upstash Privacy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Vercel</td>
                    <td className="px-4 py-2">Hosting</td>
                    <td className="px-4 py-2">
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Vercel Privacy
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="mb-4">We implement industry-standard security measures:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption:</strong> All data encrypted in transit (HTTPS/TLS)</li>
              <li><strong>Access Control:</strong> Row Level Security (RLS) in database</li>
              <li><strong>Authentication:</strong> Secure password hashing</li>
              <li><strong>Rate Limiting:</strong> Protection against abuse and DoS attacks</li>
              <li><strong>Regular Updates:</strong> Security patches applied promptly</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Retained while your account is active</li>
              <li><strong>Call History:</strong> Retained for 12 months (configurable)</li>
              <li><strong>Deleted Accounts:</strong> Data deleted within 30 days of account closure</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights (GDPR & CCPA)</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your data</li>
              <li><strong>Correction:</strong> Update incorrect information</li>
              <li><strong>Deletion:</strong> Request account and data deletion</li>
              <li><strong>Export:</strong> Download your data in portable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails</li>
            </ul>
            <p className="mt-4">
              <strong>To exercise these rights, contact the service administrator.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="mb-4">We use essential cookies for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Authentication (keeping you logged in)</li>
              <li>Security (CSRF protection)</li>
              <li>Preferences (dark mode, language)</li>
            </ul>
            <p className="mt-4">
              <strong>We do NOT use tracking or advertising cookies.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p>
              Our service is NOT intended for users under 18. We do not knowingly collect data from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy. Changes will be posted on this page with an updated "Last Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p>
              For privacy questions or concerns, please contact us at{' '}
              <a href={`mailto:${siteConfig.company.supportEmail}`} className="text-primary hover:underline">
                {siteConfig.company.supportEmail}
              </a>
            </p>
          </section>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Compliance:</strong> This policy is designed to comply with GDPR, CCPA, and other privacy regulations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
