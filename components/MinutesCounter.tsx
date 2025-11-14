// components/MinutesCounter.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MinutesCounter() {
  const [minutes, setMinutes] = useState({
    included: 0,
    used: 0,
    remaining: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMinutes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: clientData, error } = await supabase
          .from('clients')
          .select('minutes_included, minutes_used')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (clientData) {
          const remaining = clientData.minutes_included - clientData.minutes_used;
          setMinutes({
            included: clientData.minutes_included,
            used: clientData.minutes_used,
            remaining: Math.max(0, remaining),
          });
        }
      } catch (error) {
        console.error('Erreur chargement minutes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMinutes();
  }, []);

  if (loading) return null;

  const percentage = minutes.included > 0 
    ? Math.max(1, Math.round((minutes.used / minutes.included) * 100))
    : 0;
  const isLow = minutes.remaining < 500;
  const isEmpty = minutes.remaining <= 0;

  return (
    <div className={`px-6 py-3 border-r border-gray-200 ${
      isEmpty ? 'bg-red-50' : isLow ? 'bg-yellow-50' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={`text-xs font-medium ${
            isEmpty ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            Minutes left
          </p>
          <p className={`text-lg font-bold ${
            isEmpty ? 'text-red-700' : isLow ? 'text-yellow-700' : 'text-gray-800'
          }`}>
            {minutes.remaining} / {minutes.included}
          </p>
        </div>
        <div className="text-right">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isEmpty ? 'bg-red-600' : isLow ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{percentage}% used</p>
        </div>
      </div>
    </div>
  );
}