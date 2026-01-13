// hooks/useRealtimeSubscriptions.ts
'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/toast';

// Global singleton channels to prevent duplicates across all hook instances
let globalMinutesChannel: any = null;
let globalCallHistoryChannel: any = null;
let globalAgentsChannel: any = null;

/**
 * Global real-time subscription for client minutes updates
 * Automatically invalidates React Query cache when minutes change
 * Works across all pages in the dashboard
 */
export function useRealtimeMinutes(userId: string | undefined) {
  const queryClient = useQueryClient();
  const lastNotificationRef = useRef<number>(0);
  const NOTIFICATION_COOLDOWN = 2000; // 2 seconds between notifications

  useEffect(() => {
    if (!userId) return;

    // If global channel already exists and is active, just return
    if (globalMinutesChannel?.state === 'joined') {
      console.log('[Real-time] Minutes subscription already active globally');
      return;
    }

    const setupSubscription = () => {
      // Clean up existing global channel if it exists
      if (globalMinutesChannel) {
        supabase.removeChannel(globalMinutesChannel);
        globalMinutesChannel = null;
      }

      console.log('[Real-time] Setting up minutes subscription for user:', userId);

      const channelName = `client-minutes-${userId}`;

      globalMinutesChannel = supabase
        .channel(channelName, {
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
          async (payload) => {
            console.log('[Real-time] Minutes updated:', payload);

            // Force immediate refetch of all client/minutes queries across all pages
            queryClient.refetchQueries({ queryKey: ['client-minutes', userId] });
            queryClient.refetchQueries({ queryKey: ['agent-status', userId] }); // Agents page status
            queryClient.refetchQueries({ queryKey: ['client'] });
            // Also invalidate to mark as stale
            queryClient.invalidateQueries({ queryKey: ['client-minutes'] });
            queryClient.invalidateQueries({ queryKey: ['agent-status'] });
            queryClient.invalidateQueries({ queryKey: ['client'] });

            // Show toast notification with deduplication
            const now = Date.now();
            if (now - lastNotificationRef.current > NOTIFICATION_COOLDOWN) {
              lastNotificationRef.current = now;

              // Get updated minutes from payload
              const newData = payload.new as any;
              if (newData?.minutes_included !== undefined && newData?.minutes_used !== undefined) {
                const remaining = Math.max(0, newData.minutes_included - newData.minutes_used);
                console.log('[Real-time] Showing minutes toast:', { remaining, included: newData.minutes_included, used: newData.minutes_used });
                if (remaining !== undefined && !isNaN(remaining)) {
                  showToast(`Minutes remaining: ${remaining.toLocaleString()}`, 'info');
                }
              }
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Real-time] Minutes subscription status:', status, err);

          if (status === 'SUBSCRIBED') {
            console.log('[Real-time] Minutes subscription active');
          }
        });
    };

    setupSubscription();

    // Cleanup only happens when component unmounts
    return () => {
      console.log('[Real-time] Component unmounting, but keeping global subscription alive');
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
  const agentIdsRef = useRef<string[]>([]);
  const agentIdsFetchedRef = useRef(false);
  const lastCallNotificationRef = useRef<string>(''); // Track last call ID to prevent duplicates

  useEffect(() => {
    if (!userId) return;

    // If global channel already exists and is active, just return
    if (globalCallHistoryChannel?.state === 'joined') {
      console.log('[Real-time] Call history subscription already active globally');
      return;
    }

    // Fetch agent IDs for this user
    const fetchAgentIds = async () => {
      try {
        const { data } = await supabase
          .from('agents')
          .select('retell_agent_id')
          .eq('client_id', userId);

        agentIdsRef.current = data?.map(a => a.retell_agent_id) || [];
        agentIdsFetchedRef.current = true;
        console.log('[Real-time] Loaded agent IDs for call history:', agentIdsRef.current);

        // Setup subscription after getting agent IDs
        setupSubscription();
      } catch (error) {
        console.error('[Real-time] Failed to fetch agent IDs:', error);
      }
    };

    const setupSubscription = () => {
      if (!agentIdsFetchedRef.current || agentIdsRef.current.length === 0) {
        console.log('[Real-time] No agents yet, will retry...');
        return;
      }

      // Clean up existing global channel if it exists
      if (globalCallHistoryChannel) {
        supabase.removeChannel(globalCallHistoryChannel);
        globalCallHistoryChannel = null;
      }

      console.log('[Real-time] Setting up call history subscription for user:', userId);

      const channelName = `call-history-${userId}`;

      globalCallHistoryChannel = supabase
        .channel(channelName, {
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
            console.log('[Real-time] Call history INSERT event received:', newCall);
            console.log('[Real-time] Current agent IDs:', agentIdsRef.current);
            console.log('[Real-time] Call agent ID:', newCall.retell_agent_id);

            // Only process if this call belongs to one of the user's agents
            if (agentIdsRef.current.includes(newCall.retell_agent_id)) {
              console.log('[Real-time] ✅ New call received for user agent:', newCall);

              // Show toast notification for new call with deduplication
              const callId = newCall.id || newCall.call_id || '';
              console.log('[Real-time] Call ID:', callId, 'Last notification ID:', lastCallNotificationRef.current);

              if (callId && lastCallNotificationRef.current !== callId) {
                lastCallNotificationRef.current = callId;
                const phoneDisplay = newCall.phone_number || 'Unknown';
                console.log('[Real-time] 🔔 Showing call notification for:', phoneDisplay);
                showToast(`New call from ${phoneDisplay}`, 'info');
              } else {
                console.log('[Real-time] ⏭️ Skipping duplicate notification');
              }

              // Force immediate refetch of all queries across all pages
              queryClient.refetchQueries({ queryKey: ['calls'] });
              queryClient.refetchQueries({ queryKey: ['call-history'] });
              queryClient.refetchQueries({ queryKey: ['client-minutes', userId] });
              queryClient.refetchQueries({ queryKey: ['agent-status', userId] }); // Agents page status
              queryClient.refetchQueries({ queryKey: ['client'] });
              queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });

              // Also invalidate to mark as stale
              queryClient.invalidateQueries({ queryKey: ['calls'] });
              queryClient.invalidateQueries({ queryKey: ['call-history'] });
              queryClient.invalidateQueries({ queryKey: ['client-minutes'] });
              queryClient.invalidateQueries({ queryKey: ['agent-status'] });
              queryClient.invalidateQueries({ queryKey: ['client'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Real-time] Call history subscription status:', status, err);

          if (status === 'SUBSCRIBED') {
            console.log('[Real-time] Call history subscription active');
          }
        });
    };

    // Start by fetching agent IDs
    fetchAgentIds();

    return () => {
      console.log('[Real-time] Component unmounting, but keeping global call history subscription alive');
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

  useEffect(() => {
    if (!userId) return;

    // If global channel already exists and is active, just return
    if (globalAgentsChannel?.state === 'joined') {
      console.log('[Real-time] Agents subscription already active globally');
      return;
    }

    const setupSubscription = () => {
      // Clean up existing global channel if it exists
      if (globalAgentsChannel) {
        supabase.removeChannel(globalAgentsChannel);
        globalAgentsChannel = null;
      }

      console.log('[Real-time] Setting up agents subscription for user:', userId);

      const channelName = `agents-${userId}`;

      globalAgentsChannel = supabase
        .channel(channelName, {
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
            // Force immediate refetch of agent-related queries
            queryClient.refetchQueries({ queryKey: ['agents', userId] });
            queryClient.refetchQueries({ queryKey: ['agent-ids', userId] });
            queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });

            // Also invalidate to mark as stale
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            queryClient.invalidateQueries({ queryKey: ['agent-ids'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          }
        )
        .subscribe((status, err) => {
          console.log('[Real-time] Agents subscription status:', status, err);

          if (status === 'SUBSCRIBED') {
            console.log('[Real-time] Agents subscription active');
          }
        });
    };

    setupSubscription();

    return () => {
      console.log('[Real-time] Component unmounting, but keeping global agents subscription alive');
    };
  }, [userId, queryClient]);
}
