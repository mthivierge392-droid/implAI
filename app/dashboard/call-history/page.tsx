'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CallHistory } from '@/lib/supabase';
import { Search, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { showToast } from '@/components/toast';
import { useTranslation } from '@/lib/language-provider';
import { UI_CONFIG } from '@/lib/constants';
import { useDebouncedCallback } from 'use-debounce';

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallHistory | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchPhone, setSearchPhone] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const { t } = useTranslation(); // ✅ USE TRANSLATION

  // Use debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchPhone(value);
    setPage(0);
  }, UI_CONFIG.DEBOUNCE_DELAY);

  useEffect(() => {
    const getClientId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase
        .from('clients')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      if (client) setClientId(client.user_id);
    };
    getClientId();
  }, []);

  const fetchCalls = async (currentPage: number, search: string) => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data: agentIds } = await supabase
        .from('agents')
        .select('retell_agent_id')
        .eq('client_id', clientId);

      const agentIdList = agentIds?.map(a => a.retell_agent_id) || [];

      let query = supabase
        .from('call_history')
        .select('*', { count: 'exact' })
        .in('retell_agent_id', agentIdList)
        .order('created_at', { ascending: false })
        .range(
          currentPage * UI_CONFIG.ITEMS_PER_PAGE, 
          (currentPage + 1) * UI_CONFIG.ITEMS_PER_PAGE - 1
        );

      if (search) {
        query = query.ilike('phone_number', `%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setCalls(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Erreur:', err);
      setError(t.errors.internalError);
      showToast(t.errors.internalError, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls(page, searchPhone);
  }, [clientId, page, searchPhone]);

  const totalPages = Math.ceil(totalCount / UI_CONFIG.ITEMS_PER_PAGE);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-CA', {
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
      completed: t.status.completed,
      failed: t.status.failed,
      no_answer: t.status.noAnswer,
      in_progress: t.status.inProgress,
    } as const;

    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    const label = labels[status as keyof typeof labels] || status || t.status.unknown;

    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
  };

  if (loading) {
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
              {[...Array(UI_CONFIG.ITEMS_PER_PAGE)].map((_, i) => (
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{t.callHistory.title}</h2>
          <p className="text-gray-600 mt-1">{t.callHistory.subtitle}</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t.callHistory.searchPlaceholder}
            defaultValue={searchPhone}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">{t.callHistory.noCalls}</p>
          <p className="text-gray-400 text-sm mt-2">{t.callHistory.callsAppearAutomatically}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.callHistory.dateTime}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.callHistory.number}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.callHistory.status}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.callHistory.duration}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.callHistory.actions}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(call.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(call.call_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(call.call_duration_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        {t.callHistory.seeTranscript}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {t.callHistory.page} {page + 1} {t.callHistory.of} {totalPages || 1}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">{t.callHistory.transcript}</h3>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {selectedCall.phone_number} - {formatDate(selectedCall.created_at)}
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <h4 className="font-semibold text-gray-700 mb-2">{t.callHistory.transcript}:</h4>
              <p className="text-gray-600 whitespace-pre-wrap">
                {selectedCall.transcript || t.callHistory.noTranscriptAvailable}
              </p>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedCall(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                {t.callHistory.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}