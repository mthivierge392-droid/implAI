// hooks/useRealtimeSubscriptions.ts
'use client';

import { useEffect, useRef } from 'react';
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
  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const setupSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      console.log('[Real-time] Setting up minutes subscription for user:', userId);

      channelRef.current = supabase
        .channel(`client-minutes-${userId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: userId },
          },
        })
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
        .subscribe((status, err) => {
          console.log('[Real-time] Minutes subscription status:', status, err);

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Real-time] Minutes subscription failed, retrying in 2s...', err);
            // Retry connection after 2 seconds
            retryTimeoutRef.current = setTimeout(() => {
              setupSubscription();
            }, 2000);
          }
        });
    };

    setupSubscription();

    return () => {
      console.log('[Real-time] Cleaning up minutes subscription');
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, queryClient]);
}

/**
 * Global real-time subscription for call history updates
 * Automatically invalidates React Query cache when new calls arrive
 * Works across all pages in the dashboard
 * Fetches agentIds internally to work on any page
 */
export function useRealtimeCallHistory(userId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const agentIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    // Fetch agent IDs for this user
    const fetchAgentIds = async () => {
      try {
        const { data } = await supabase
          .from('agents')
          .select('retell_agent_id')
          .eq('client_id', userId);

        agentIdsRef.current = data?.map(a => a.retell_agent_id) || [];
        console.log('[Real-time] Loaded agent IDs for call history:', agentIdsRef.current);

        // Setup subscription after getting agent IDs
        setupSubscription();
      } catch (error) {
        console.error('[Real-time] Failed to fetch agent IDs:', error);
        // Retry after 3 seconds
        retryTimeoutRef.current = setTimeout(fetchAgentIds, 3000);
      }
    };

    const setupSubscription = () => {
      if (agentIdsRef.current.length === 0) {
        console.log('[Real-time] No agents yet, will retry...');
        return;
      }

      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      console.log('[Real-time] Setting up call history subscription for user:', userId);

      channelRef.current = supabase
        .channel(`call-history-${userId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: userId },
          },
        })
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
            if (agentIdsRef.current.includes(newCall.retell_agent_id)) {
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
        .subscribe((status, err) => {
          console.log('[Real-time] Call history subscription status:', status, err);

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Real-time] Call history subscription failed, retrying in 2s...', err);
            // Retry connection after 2 seconds
            retryTimeoutRef.current = setTimeout(() => {
              setupSubscription();
            }, 2000);
          }
        });
    };

    // Start by fetching agent IDs
    fetchAgentIds();

    return () => {
      console.log('[Real-time] Cleaning up call history subscription');
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, queryClient]);
}

/**
 * Global real-time subscription for agents table updates
 * Automatically invalidates React Query cache when agents change
 * Works across all pages in the dashboard
 */
export function useRealtimeAgents(userId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const setupSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      console.log('[Real-time] Setting up agents subscription for user:', userId);

      channelRef.current = supabase
        .channel(`agents-${userId}`, {
          config: {
            broadcast: { self: true },
            presence: { key: userId },
          },
        })
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
        .subscribe((status, err) => {
          console.log('[Real-time] Agents subscription status:', status, err);

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Real-time] Agents subscription failed, retrying in 2s...', err);
            // Retry connection after 2 seconds
            retryTimeoutRef.current = setTimeout(() => {
              setupSubscription();
            }, 2000);
          }
        });
    };

    setupSubscription();

    return () => {
      console.log('[Real-time] Cleaning up agents subscription');
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, queryClient]);
}
