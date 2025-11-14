'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Phone, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/lib/language-provider';
import { API_CONFIG, UI_CONFIG } from '@/lib/constants'; // ✅ FIX: Import both

interface Stats {
  totalCalls: number;
  agents: number;
  avgDuration: number;
  completedCalls: number;
}

const statsCache = {
  data: null as Stats | null,
  timestamp: 0,
};

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({
    totalCalls: 0,
    agents: 0,
    avgDuration: 0,
    completedCalls: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchStats = async () => {
      const now = Date.now();
      // ✅ FIX: Use API_CONFIG.CACHE_DURATION
      if (statsCache.data && (now - statsCache.timestamp) < API_CONFIG.CACHE_DURATION) {
        setStats(statsCache.data);
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error(t.errors.unauthorized);

        const { data: client } = await supabase
          .from('clients')
          .select('user_id')
          .eq('user_id', user.id)
          .single();

        if (!client) throw new Error(t.errors.notFound);

        const { data: agentIds } = await supabase
          .from('agents')
          .select('retell_agent_id')
          .eq('client_id', client.user_id);

        const agentIdList = agentIds?.map(a => a.retell_agent_id) || [];

        const { data: calls, error: callsError } = await supabase
          .from('call_history')
          .select('*')
          .in('retell_agent_id', agentIdList);

        if (callsError) throw callsError;

        const totalCalls = calls?.length || 0;
        const completedCalls = calls?.filter(c => c.call_status === 'completed').length || 0;
        const totalDuration = calls?.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) || 0;
        const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

        const { count: agents } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.user_id);

        const result = {
          totalCalls,
          agents: agents || 0,
          avgDuration,
          completedCalls,
        };

        statsCache.data = result;
        statsCache.timestamp = now;

        setStats(result);
      } catch (err) {
        console.error('Error:', err);
        setError(t.errors.internalError);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [t]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
              <div className="p-3 bg-gray-200 rounded-lg h-12 w-12 animate-pulse" />
            </div>
          </div>
        ))}
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
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{t.dashboard.nav.overview}</h2>
        <p className="text-gray-600 mt-1">{t.stats.aboutText}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={Phone} 
          label={t.stats.totalCalls} 
          value={stats.totalCalls} 
          color="blue" 
        />
        <StatCard 
          icon={TrendingUp} 
          label={t.stats.activeAgents} 
          value={stats.agents} 
          color="green" 
        />
        <StatCard 
          icon={Clock} 
          label={t.stats.avgDuration} 
          value={`${stats.avgDuration}s`} 
          color="purple" 
        />
        <StatCard 
          icon={CheckCircle} 
          label={t.stats.completedCalls} 
          value={stats.completedCalls} 
          color="orange" 
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900">{t.stats.aboutTitle}</h3>
        <p className="text-blue-800 mt-2">
          {t.stats.aboutText}
        </p>
      </div>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  } as const;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}