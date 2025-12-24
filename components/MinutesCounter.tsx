//components/MinutesCounter.tsx
'use client';

import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export default function MinutesCounter() {
  // Get user ID from auth store (same as layout) - avoids extra fetch
  const { user } = useAuthStore();

  console.log('[MinutesCounter] Rendering, user:', user?.id);

  // Query for minutes data
  const { data: minutes, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['client-minutes', user?.id],
    queryFn: async () => {
      console.log('[MinutesCounter] Fetching minutes for user:', user?.id);
      if (!user?.id) throw new Error('No user');

      try {
        // Add timeout to prevent indefinite hanging
        const queryPromise = supabase
          .from('clients')
          .select('minutes_included, minutes_used')
          .eq('user_id', user.id)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
        );

        const { data: clientData, error: supabaseError } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any;

        console.log('[MinutesCounter] Fetched data:', clientData, 'Supabase Error:', supabaseError);

        if (supabaseError) {
          console.error('[MinutesCounter] Supabase query error:', supabaseError);
          // Return default values on error instead of throwing
          return { included: 0, used: 0, remaining: 0 };
        }

        if (!clientData) {
          console.warn('[MinutesCounter] No client data found for user');
          return { included: 0, used: 0, remaining: 0 };
        }

        const remaining = Math.max(0, clientData.minutes_included - clientData.minutes_used);
        const result = {
          included: clientData.minutes_included,
          used: clientData.minutes_used,
          remaining,
        };
        console.log('[MinutesCounter] Returning minutes data:', result);
        return result;
      } catch (err) {
        console.error('[MinutesCounter] Query exception:', err);
        return { included: 0, used: 0, remaining: 0 };
      }
    },
    enabled: !!user?.id,
    staleTime: 0, // Always fresh - rely on real-time updates
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when user returns to app (mobile)
    retry: 2, // Retry failed queries
    retryDelay: 1000, // 1 second between retries
  });

  console.log('[MinutesCounter] State:', { minutes, isLoading, isFetching, isError, error });

  // Toast notifications are now handled in the real-time subscription hook
  // to prevent duplicates on page load/refetch

  // Show loading skeleton while data is being fetched - prevents component from disappearing
  if (!minutes || minutes.remaining === undefined) {
    console.log('[MinutesCounter] Showing loading skeleton');
    return (
      <div className="px-2 md:px-4 py-2 border-r border-border flex items-center gap-1.5 md:gap-3">
        <div className="w-3 h-3 rounded-full bg-muted animate-pulse" />
        <div className="min-w-0">
          <div className="h-3 w-16 bg-muted rounded animate-pulse mb-1" />
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  console.log('[MinutesCounter] Showing actual data:', minutes);

  const percentage = minutes.included > 0
    ? Math.max(1, Math.round((minutes.used / minutes.included) * 100))
    : 0;
  const isLow = minutes.remaining < 500;
  const isEmpty = minutes.remaining <= 0;

  return (
    <div className={cn(
      "px-2 md:px-4 py-2 border-r border-border flex items-center gap-1.5 md:gap-3",
      isEmpty && "bg-destructive/10 border-destructive/20",
      isLow && !isEmpty && "bg-warning/10 border-warning/20"
    )}>
      {/* Glowing Status Light */}
      <div className="relative">
        <div className={cn(
          "w-3 h-3 rounded-full",
          isEmpty ? "bg-destructive" : isLow ? "bg-warning" : "bg-success",
        )}></div>
        <div className={cn(
          "absolute inset-0 rounded-full animate-pulse",
          isEmpty ? "bg-destructive/40" : isLow ? "bg-warning/40" : "bg-success/40",
        )}></div>
        <div className={cn(
          "absolute inset-0 rounded-full animate-ping",
          isEmpty ? "bg-destructive/20" : isLow ? "bg-warning/20" : "bg-success/20",
        )}></div>
      </div>

      <div className="min-w-0">
        <p className={cn(
          "text-xs font-medium",
          isEmpty && "text-destructive",
          isLow && !isEmpty && "text-warning",
          !isLow && !isEmpty && "text-muted-foreground"
        )}>
          Minutes left
        </p>
        <p className={cn(
          "text-sm md:text-base font-bold",
          isEmpty && "text-destructive",
          isLow && !isEmpty && "text-warning",
          !isLow && !isEmpty && "text-foreground"
        )}>
          {minutes.remaining.toLocaleString()}
        </p>
      </div>
      <div className="hidden sm:flex flex-1">
        <div className="w-full h-2 bg-border rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isEmpty ? "bg-destructive" : isLow ? "bg-warning" : "bg-success"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
