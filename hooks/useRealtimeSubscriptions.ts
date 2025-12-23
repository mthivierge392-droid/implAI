// hooks/useRealtimeSubscriptions.ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/toast';

/**
 * Global real-time subscription for client minutes updates
 * Automatically invalidates React Query cache when minutes change
 * Works across all pages in the dashboard
 */
export function useRealtimeMinutes(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('[Real-time] Setting up minutes subscription for user:', userId);

    const channel = supabase.channel('client-minutes-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Real-time] Minutes updated:', payload);
          // Invalidate all queries that depend on client minutes
          queryClient.invalidateQueries({ queryKey: ['client-minutes', userId] });
          queryClient.invalidateQueries({ queryKey: ['client'] });
        }
      )
      .subscribe((status) => {
        console.log('[Real-time] Minutes subscription status:', status);
      });

    return () => {
      console.log('[Real-time] Cleaning up minutes subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/**
 * Global real-time subscription for call history updates
 * Automatically invalidates React Query cache when new calls arrive
 * Works across all pages in the dashboard
 */
export function useRealtimeCallHistory(agentIds: string[] | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!agentIds || agentIds.length === 0 || !userId) return;

    console.log('[Real-time] Setting up call history subscription for agents:', agentIds);

    const channel = supabase.channel('call-history-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_history',
        },
        (payload) => {
          const newCall = payload.new as any;

          // Only process if this call belongs to one of the user's agents
          if (agentIds.includes(newCall.retell_agent_id)) {
            console.log('[Real-time] New call received:', newCall);

            // Show toast notification for new call
            const phoneDisplay = newCall.phone_number || 'Unknown';
            showToast(`New call from ${phoneDisplay}`, 'info');

            // Invalidate call history queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['call-history'] });
            queryClient.invalidateQueries({ queryKey: ['calls'] });
            queryClient.invalidateQueries({ queryKey: ['client-minutes', userId] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Real-time] Call history subscription status:', status);
      });

    return () => {
      console.log('[Real-time] Cleaning up call history subscription');
      supabase.removeChannel(channel);
    };
  }, [agentIds, userId, queryClient]);
}

/**
 * Global real-time subscription for agents table updates
 * Automatically invalidates React Query cache when agents change
 * Works across all pages in the dashboard
 */
export function useRealtimeAgents(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('[Real-time] Setting up agents subscription for user:', userId);

    const channel = supabase.channel('agents-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // All events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'agents',
          filter: `client_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Real-time] Agent change detected:', payload);
          // Invalidate agents query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['agents', userId] });
          queryClient.invalidateQueries({ queryKey: ['agent-ids', userId] });
        }
      )
      .subscribe((status) => {
        console.log('[Real-time] Agents subscription status:', status);
      });

    return () => {
      console.log('[Real-time] Cleaning up agents subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
