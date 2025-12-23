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
  const isActiveRef = useRef(true);

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
            // Force immediate refetch of all client/minutes queries across all pages
            queryClient.refetchQueries({ queryKey: ['client-minutes', userId] });
            queryClient.refetchQueries({ queryKey: ['client'] });
            // Also invalidate to mark as stale
            queryClient.invalidateQueries({ queryKey: ['client-minutes'] });
            queryClient.invalidateQueries({ queryKey: ['client'] });
          }
        )
        .subscribe((status, err) => {
          console.log('[Real-time] Minutes subscription status:', status, err);

          if (status === 'SUBSCRIBED') {
            console.log('[Real-time] Minutes subscription active');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Real-time] Minutes subscription failed, retrying in 2s...', err);
            // Retry connection after 2 seconds
            if (isActiveRef.current) {
              retryTimeoutRef.current = setTimeout(() => {
                if (isActiveRef.current) {
                  setupSubscription();
                }
              }, 2000);
            }
          }
        });
    };

    // Handle visibility change (tab/app switching on mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Real-time] Page became visible, reconnecting minutes...');
        // Force reconnect when page becomes visible
        setTimeout(() => {
          if (isActiveRef.current) {
            setupSubscription();
          }
        }, 500);
      }
    };

    // Handle online/offline events
    const handleOnline = () => {
      console.log('[Real-time] Connection restored, reconnecting minutes...');
      setTimeout(() => {
        if (isActiveRef.current) {
          setupSubscription();
        }
      }, 1000);
    };

    setupSubscription();

    // Add event listeners for mobile reliability
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      console.log('[Real-time] Cleaning up minutes subscription');
      isActiveRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityChange);
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
  const isActiveRef = useRef(true);
  const agentIdsFetchedRef = useRef(false);

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
        agentIdsFetchedRef.current = true;
        console.log('[Real-time] Loaded agent IDs for call history:', agentIdsRef.current);

        // Setup subscription after getting agent IDs
        if (isActiveRef.current) {
          setupSubscription();
        }
      } catch (error) {
        console.error('[Real-time] Failed to fetch agent IDs:', error);
        // Retry after 3 seconds
        if (isActiveRef.current) {
          retryTimeoutRef.current = setTimeout(fetchAgentIds, 3000);
        }
      }
    };

    const setupSubscription = () => {
      if (!agentIdsFetchedRef.current || agentIdsRef.current.length === 0) {
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

              // Force immediate refetch of all queries across all pages
              queryClient.refetchQueries({ queryKey: ['calls'] });
              queryClient.refetchQueries({ queryKey: ['call-history'] });
              queryClient.refetchQueries({ queryKey: ['client-minutes', userId] });
              queryClient.refetchQueries({ queryKey: ['client'] });
              queryClient.refetchQueries({ queryKey: ['dashboard-stats'] });

              // Also invalidate to mark as stale
              queryClient.invalidateQueries({ queryKey: ['calls'] });
              queryClient.invalidateQueries({ queryKey: ['call-history'] });
              queryClient.invalidateQueries({ queryKey: ['client-minutes'] });
              queryClient.invalidateQueries({ queryKey: ['client'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            }
          }
        )
        .subscribe((status, err) => {
          console.log('[Real-time] Call history subscription status:', status, err);

          if (status === 'SUBSCRIBED') {
            console.log('[Real-time] Call history subscription active');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Real-time] Call history subscription failed, retrying in 2s...', err);
            // Retry connection after 2 seconds
            if (isActiveRef.current) {
              retryTimeoutRef.current = setTimeout(() => {
                if (isActiveRef.current) {
                  setupSubscription();
                }
              }, 2000);
            }
          }
        });
    };

    // Handle visibility change (tab/app switching on mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Real-time] Page became visible, reconnecting call history...');
        // Force reconnect when page becomes visible
        setTimeout(() => {
          if (isActiveRef.current && agentIdsFetchedRef.current) {
            setupSubscription();
          } else if (isActiveRef.current && !agentIdsFetchedRef.current) {
            fetchAgentIds();
          }
        }, 500);
      }
    };

    // Handle online/offline events
    const handleOnline = () => {
      console.log('[Real-time] Connection restored, reconnecting call history...');
      setTimeout(() => {
        if (isActiveRef.current && agentIdsFetchedRef.current) {
          setupSubscription();
        } else if (isActiveRef.current && !agentIdsFetchedRef.current) {
          fetchAgentIds();
        }
      }, 1000);
    };

    // Start by fetching agent IDs
    fetchAgentIds();

    // Add event listeners for mobile reliability
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      console.log('[Real-time] Cleaning up call history subscription');
      isActiveRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityChange);
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
  const isActiveRef = useRef(true);

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
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.error('[Real-time] Agents subscription failed, retrying in 2s...', err);
            // Retry connection after 2 seconds
            if (isActiveRef.current) {
              retryTimeoutRef.current = setTimeout(() => {
                if (isActiveRef.current) {
                  setupSubscription();
                }
              }, 2000);
            }
          }
        });
    };

    // Handle visibility change (tab/app switching on mobile)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Real-time] Page became visible, reconnecting agents...');
        // Force reconnect when page becomes visible
        setTimeout(() => {
          if (isActiveRef.current) {
            setupSubscription();
          }
        }, 500);
      }
    };

    // Handle online/offline events
    const handleOnline = () => {
      console.log('[Real-time] Connection restored, reconnecting agents...');
      setTimeout(() => {
        if (isActiveRef.current) {
          setupSubscription();
        }
      }, 1000);
    };

    setupSubscription();

    // Add event listeners for mobile reliability
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      console.log('[Real-time] Cleaning up agents subscription');
      isActiveRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [userId, queryClient]);
}
