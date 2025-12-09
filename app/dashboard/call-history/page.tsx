// app/dashboard/call-history/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { sanitizePhoneNumber } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { CallHistory } from '@/lib/supabase';
import { Search, ChevronLeft, ChevronRight, X, PhoneIncoming, Filter } from 'lucide-react';
import { showToast } from '@/components/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

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

  // Real-time subscription
  useEffect(() => {
    isUnmounting.current = false;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const setupRealtime = () => {
      if (!agentIdsRef.current.length) {
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
                showToast(siteConfig.dashboardCallHistory.newCall.replace('{phone}', newCall.phone_number), 'info');
              }
            }
          }
        )
        .subscribe((status: string) => {
          setRealtimeEnabled(status === 'SUBSCRIBED');
          
          if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && !isUnmounting.current) {
            retryTimeoutRef.current = setTimeout(() => {
              if (!isUnmounting.current) setupRealtime();
            }, 1000);
          }
        });
    };

    setupRealtime();

    return () => {
      isUnmounting.current = true;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [clientId, searchPhone, page, agentIds, queryClient]);

  const totalPages = Math.ceil((callsData?.totalCount || 0) / ITEMS_PER_PAGE);

  const handleSearch = () => {
    if (searchPhone.length > MAX_SEARCH_LENGTH) {
      showToast(siteConfig.dashboardCallHistory.searchTooLong.replace('{max}', MAX_SEARCH_LENGTH.toString()), 'error');
      return;
    }
    setSearchPhone(searchInput);
    setPage(0);
  };

  // FIXED: Proper enter key handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleInputChange = (value: string) => {
    const sanitized = sanitizePhoneNumber(value);
    if (sanitized.length > MAX_SEARCH_LENGTH) {
      showToast(siteConfig.dashboardCallHistory.searchMaxReached.replace('{max}', MAX_SEARCH_LENGTH.toString()), 'info');
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
    const variant = {
      completed: 'success' as const,
      failed: 'destructive' as const,
      no_answer: 'warning' as const,
      in_progress: 'default' as const,
    };

    const label = {
      completed: siteConfig.dashboardCallHistory.statusLabels.completed,
      failed: siteConfig.dashboardCallHistory.statusLabels.failed,
      no_answer: siteConfig.dashboardCallHistory.statusLabels.no_answer,
      in_progress: siteConfig.dashboardCallHistory.statusLabels.in_progress,
    };

    return (
      <Badge variant={variant[status as keyof typeof variant] || 'outline'}>
        {label[status as keyof typeof label] || status || siteConfig.dashboardCallHistory.statusLabels.unknown}
      </Badge>
    );
  };

  if (clientLoading || callsLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">{siteConfig.dashboardCallHistory.errorNotAuthenticated}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{siteConfig.dashboardCallHistory.title}</h1>
        <p className="text-muted-foreground">{siteConfig.dashboardCallHistory.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder={siteConfig.dashboardCallHistory.searchPlaceholder}
                value={searchInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown} // FIXED: Enter key triggers search
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-all"
              />
            </div>
            <Button onClick={handleSearch} className="gap-2">
              <Filter className="w-4 h-4" />
              {siteConfig.dashboardCallHistory.searchButton}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {callsData?.calls.length === 0 ? (
            <div className="text-center py-8">
              <PhoneIncoming className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium">{siteConfig.dashboardCallHistory.emptyStateTitle}</p>
              <p className="text-muted-foreground text-sm mt-1">{siteConfig.dashboardCallHistory.emptyStateDescription}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{siteConfig.dashboardCallHistory.tableHeaders.dateTime}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{siteConfig.dashboardCallHistory.tableHeaders.number}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{siteConfig.dashboardCallHistory.tableHeaders.status}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{siteConfig.dashboardCallHistory.tableHeaders.duration}</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{siteConfig.dashboardCallHistory.tableHeaders.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {callsData?.calls.map((call) => (
                    <tr 
                      key={call.id} 
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm text-foreground whitespace-nowrap">
                        {formatDate(call.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground whitespace-nowrap">
                        {sanitizePhoneNumber(call.phone_number)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(call.call_status)}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground whitespace-nowrap">
                        {formatDuration(call.call_duration_seconds)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setSelectedCall(call)}
                          className="p-0 h-auto font-medium"
                        >
                          {siteConfig.dashboardCallHistory.viewTranscript}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {siteConfig.dashboardCallHistory.pageLabel.replace('{current}', (page + 1).toString()).replace('{total}', (totalPages || 1).toString())}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  {siteConfig.dashboardCallHistory.previousButton}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  {siteConfig.dashboardCallHistory.nextButton}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Modal */}
      {selectedCall && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedCall(null)}
        >
          <div 
            className="bg-card rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-semibold text-card-foreground">{siteConfig.dashboardCallHistory.modalTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {sanitizePhoneNumber(selectedCall.phone_number)} • {formatDate(selectedCall.created_at)}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedCall(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-4">
                {getStatusBadge(selectedCall.call_status)}
                <span className="text-sm text-muted-foreground">
                  {siteConfig.dashboardCallHistory.modalDuration.replace('{duration}', formatDuration(selectedCall.call_duration_seconds))}
                </span>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-3">{siteConfig.dashboardCallHistory.modalTranscriptTitle}</h4>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedCall.transcript || siteConfig.dashboardCallHistory.modalNoTranscript}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/50">
              <Button onClick={() => setSelectedCall(null)} className="w-full">
                {siteConfig.dashboardCallHistory.modalClose}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}