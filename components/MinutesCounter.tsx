// components/MinutesCounter.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/toast';

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
    <div className={`px-3 md:px-6 py-2 md:py-3 border-r border-gray-200 ${
      isEmpty ? 'bg-red-50' : isLow ? 'bg-yellow-50' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between gap-2 md:gap-4 min-w-0">
        <div className="min-w-0">
          {/* Desktop label */}
          <p className={`hidden md:block text-xs font-medium ${
            isEmpty ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            Minutes left
          </p>
          {/* Mobile: no label, just numbers */}
          <p className={`text-sm md:text-lg font-bold ${
            isEmpty ? 'text-red-700' : isLow ? 'text-yellow-700' : 'text-gray-800'
          }`}>
            {minutes.remaining} / {minutes.included}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="w-16 md:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isEmpty ? 'bg-red-600' : isLow ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{percentage}%</p>
        </div>
      </div>
    </div>
  );
}