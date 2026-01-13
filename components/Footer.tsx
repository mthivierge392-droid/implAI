// components/Footer.tsx
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side - Copyright */}
          <div className="text-sm text-muted-foreground">
            © {currentYear} {siteConfig.company.name}. All rights reserved.
          </div>

          {/* Right side - Legal links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href={siteConfig.urls.privacy}
              className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              {siteConfig.footer.privacyLabel}
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              href={siteConfig.urls.terms}
              className="text-muted-foreground hover:text-foreground transition-colors hover:underline"
            >
              {siteConfig.footer.termsLabel}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
