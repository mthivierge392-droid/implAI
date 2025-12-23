//components/MinutesCounter.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/toast';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeMinutes } from '@/hooks/useRealtimeSubscriptions';

export default function MinutesCounter() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Setup global real-time subscription
  useRealtimeMinutes(userId || undefined);

  // Query for minutes data
  const { data: minutes, isLoading } = useQuery({
    queryKey: ['client-minutes', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user');

      const { data: clientData, error } = await supabase
        .from('clients')
        .select('minutes_included, minutes_used')
        .eq('user_id', userId)
        .single();

      if (error || !clientData) {
        return { included: 0, used: 0, remaining: 0 };
      }

      const remaining = Math.max(0, clientData.minutes_included - clientData.minutes_used);
      return {
        included: clientData.minutes_included,
        used: clientData.minutes_used,
        remaining,
      };
    },
    enabled: !!userId,
    staleTime: 0, // Always fresh - rely on real-time updates
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when user returns to app (mobile)
  });

  // Show toast when minutes change
  useEffect(() => {
    // Listen for query updates
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === 'client-minutes' &&
        event.query.queryKey[1] === userId
      ) {
        const data = event.query.state.data as any;
        if (data?.remaining !== undefined) {
          showToast(`Minutes remaining: ${data.remaining.toLocaleString()}`, 'info');
        }
      }
    });

    return unsubscribe;
  }, [userId, queryClient]);

  if (isLoading || !minutes) return null;

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
