'use client';

import { useEffect, useState, useRef } from 'react';
import { sanitizeHtml, sanitizePhoneNumber } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { CallHistory } from '@/lib/supabase';
import { Search, ChevronLeft, ChevronRight, Loader2, X, PhoneIncoming } from 'lucide-react';
import { showToast } from '@/components/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '@/lib/constants';

const ITEMS_PER_PAGE = 50;
const MAX_SEARCH_LENGTH = 20;

function useRealtimeMinutes() {
  const [minutes, setMinutes] = useState({
    included: 0,
    used: 0,
    remaining: 0,
  });

  useEffect(() => {
    const channel = supabase.channel('minutes-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
        },
        (payload) => {
          const newData = payload.new as any;
          setMinutes({
            included: newData.minutes_included,
            used: newData.minutes_used,
            remaining: Math.max(0, newData.minutes_included - newData.minutes_used),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return minutes;
}

export default function CallHistoryPage() {
  const [selectedCall, setSelectedCall] = useState<CallHistory | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [page, setPage] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const queryClient = useQueryClient();
  const minutes = useRealtimeMinutes();
  
  const isUnmounting = useRef(false);
  const agentIdsRef = useRef<string[]>([]);
  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: clientId, isLoading: clientLoading } = useQuery({
    queryKey: ['client-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: client } = await supabase
        .from('clients')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      
      if (!client) throw new Error('Client not found');
      return client.user_id;
    },
    staleTime: API_CONFIG.STALE_TIME,
  });

  const { data: agentIds } = useQuery({
    queryKey: ['agent-ids', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('agents')
        .select('retell_agent_id')
        .eq('client_id', clientId!);
      return data?.map(a => a.retell_agent_id) || [];
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    agentIdsRef.current = agentIds || [];
  }, [agentIds]);

  const { data: callsData, isLoading: callsLoading } = useQuery({
    queryKey: ['calls', clientId, searchPhone, page],
    queryFn: async () => {
      let query = supabase
        .from('call_history')
        .select('*', { count: 'exact' })
        .in('retell_agent_id', agentIds || [])
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (searchPhone) {
        query = query.ilike('phone_number', `%${searchPhone}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { calls: data || [], totalCount: count || 0 };
    },
    enabled: !!agentIds && agentIds.length > 0,
    staleTime: API_CONFIG.STALE_TIME,
  });

  // Real-time subscription with retry logic
  useEffect(() => {
    isUnmounting.current = false;

    // Clean up any existing subscription first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const setupRealtime = () => {
      // If no agent IDs, wait and retry
      if (!agentIdsRef.current.length) {
        console.log('No agent IDs yet, will retry in 500ms');
        retryTimeoutRef.current = setTimeout(setupRealtime, 500);
        return;
      }

      channelRef.current = supabase
        .channel('call-history-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'call_history',
          },
          (payload) => {
            const newCall = payload.new as CallHistory;
            console.log('New call received:', newCall);
            
            if (agentIdsRef.current.includes(newCall.retell_agent_id)) {
              if (!isUnmounting.current) {
                queryClient.setQueryData(
                  ['calls', clientId, searchPhone, page],
                  (old: any) => {
                    if (!old) return { calls: [newCall], totalCount: 1 };
                    return {
                      calls: [newCall, ...old.calls].slice(0, ITEMS_PER_PAGE),
                      totalCount: old.totalCount + 1,
                    };
                  }
                );
                showToast(`New call: ${newCall.phone_number}`, 'info');
              }
            }
          }
        )
        .subscribe((status: string) => {
          console.log('Realtime status:', status);
          
          if (status === 'SUBSCRIBED') {
            setRealtimeEnabled(true);
          } 
          else if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && !isUnmounting.current) {
            setRealtimeEnabled(false);
            console.error('Realtime connection lost, retrying in 1s');
            
            // Auto-retry on connection loss
            retryTimeoutRef.current = setTimeout(() => {
              if (!isUnmounting.current) {
                setupRealtime();
              }
            }, 1000);
          }
        });
    };

    setupRealtime();

    return () => {
      isUnmounting.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [clientId, searchPhone, page, agentIds, queryClient]);

  const totalPages = Math.ceil((callsData?.totalCount || 0) / ITEMS_PER_PAGE);

  // Search functions
  const handleSearch = () => {
    if (searchPhone.length > MAX_SEARCH_LENGTH) {
      showToast(`Search too long (max ${MAX_SEARCH_LENGTH} characters)`, 'error');
      return;
    }
    setPage(0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInputChange = (value: string) => {
    const sanitized = sanitizePhoneNumber(value);
    if (sanitized.length > MAX_SEARCH_LENGTH) {
      showToast(`Max ${MAX_SEARCH_LENGTH} characters`, 'info');
    }
    setSearchInput(sanitized.substring(0, MAX_SEARCH_LENGTH));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    return mins > 0 ? `${mins}m ${seconds % 60}s` : `${seconds}s`;
  };

  const getStatusBadge = (status: string | null) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      no_answer: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
    } as const;

    const labels = {
      completed: 'Completed',
      failed: 'Failed',
      no_answer: 'No Answer',
      in_progress: 'In Progress',
    } as const;

    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    const label = labels[status as keyof typeof labels] || status || 'Unknown';

    return <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
  };

  if (clientLoading || callsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-64" />
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {[...Array(5)].map((_, i) => (
                  <th key={i} className="px-6 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, i) => (
                <tr key={i} className="border-t">
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Error: Client not authenticated</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6 space-y-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white">Call History</h2>
          <p className="text-gray-600 mt-1 text-sm md:text-base">Call history for your agents</p>
        </div>
        
        {/* Search Bar - Stacks on mobile, side-by-side on md+ */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search phone number..."
              value={searchInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {callsData?.calls.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No calls recorded.</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Calls will appear here automatically.</p>
        </div>
      ) : (
        <>
          {/* Table Container - Allows horizontal scrolling without page overflow */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date/Time</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Number</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {callsData?.calls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDate(call.created_at)}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {sanitizePhoneNumber(call.phone_number)}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        {getStatusBadge(call.call_status)}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDuration(call.call_duration_seconds)}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-sm">
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
                        >
                          See transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 px-4 md:px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 rounded-b-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {page + 1} of {totalPages || 1}
            </div>
            <div className="flex gap-1 md:gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 md:px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 md:px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Transcript Modal */}
      {selectedCall && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setSelectedCall(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-2xl max-w-full md:max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col mx-2 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                  Call Details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedCall.phone_number} - {formatDate(selectedCall.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(selectedCall.call_status)}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Duration: {formatDuration(selectedCall.call_duration_seconds)}
                  </span>
                </div>
              </div>
              
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Transcript:</h4>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                  {selectedCall.transcript 
                    ? <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedCall.transcript) }} />
                    : 'No transcript available for this call.'}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <button
                onClick={() => setSelectedCall(null)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}