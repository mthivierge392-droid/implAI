'use client';

import { Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/toast';
import { APP_CONFIG } from '@/lib/config';
import { siteConfig } from '@/config/site';

export function StripeBanner() {
  const stripeUrl = APP_CONFIG.urls.stripePayment;

  const handleClick = () => {
    if (!stripeUrl) {
      showToast(siteConfig.stripeBanner.toastNotConfigured, 'error');
      return;
    }
    showToast(siteConfig.stripeBanner.toastRedirecting, 'info');
    window.open(stripeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b border-primary/30 backdrop-blur-sm">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-1/2 -top-1/2 w-full h-full bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          <Zap className="w-5 h-5 text-primary animate-pulse" />
          <p className="text-sm font-medium text-foreground">
            {siteConfig.stripeBanner.message}
          </p>
          <Button
            onClick={handleClick}
            variant="default"
            size="sm"
            className="gap-2 font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
          >
            {siteConfig.stripeBanner.buttonText}
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}