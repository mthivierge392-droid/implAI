// components/MinutesCounter.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/toast';
import { cn } from '@/lib/utils';

export default function MinutesCounter() {
  const [minutes, setMinutes] = useState({
    included: 0,
    used: 0,
    remaining: 0,
  });
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    let channel: any;
    
    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted.current) setLoading(false);
          return;
        }

        const { data: clientData, error } = await supabase
          .from('clients')
          .select('minutes_included, minutes_used')
          .eq('user_id', user.id)
          .single();

        if (error || !clientData) {
          if (isMounted.current) setLoading(false);
          return;
        }

        const remaining = Math.max(0, clientData.minutes_included - clientData.minutes_used);
        if (isMounted.current) {
          setMinutes({
            included: clientData.minutes_included,
            used: clientData.minutes_used,
            remaining,
          });
        }

        channel = supabase
          .channel('minutes-counter')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'clients',
            },
            (payload) => {
              if (!isMounted.current) return;
              
              const newData = payload.new as any;
              if (newData.user_id === user.id) {
                const remaining = Math.max(0, newData.minutes_included - newData.minutes_used);
                setMinutes({
                  included: newData.minutes_included,
                  used: newData.minutes_used,
                  remaining,
                });
                showToast(`Minutes used: ${newData.minutes_used}/${newData.minutes_included}`, 'info');
              }
            }
          )
          .subscribe();

        if (isMounted.current) setLoading(false);

      } catch (error) {
        console.error('Minutes counter error:', error);
        if (isMounted.current) setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      isMounted.current = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  if (loading) return null;
  
  const percentage = minutes.included > 0 
    ? Math.max(1, Math.round((minutes.used / minutes.included) * 100))
    : 0;
  const isLow = minutes.remaining < 500;
  const isEmpty = minutes.remaining <= 0;

  return (
    <div className={cn(
      "px-3 md:px-4 py-2 border-r border-border",
      isEmpty && "bg-destructive/10 border-destructive/20",
      isLow && !isEmpty && "bg-warning/10 border-warning/20"
    )}>
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className={cn(
            "hidden md:block text-xs font-medium",
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
            {minutes.remaining} / {minutes.included}
          </p>
        </div>
        <div className="w-16 h-2 bg-border rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isEmpty && "bg-destructive",
              isLow && !isEmpty && "bg-warning",
              !isLow && !isEmpty && "bg-success"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}