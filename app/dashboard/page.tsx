'use client';

import { Phone, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalCalls: number;
  agents: number;
  avgDuration: number;
  completedCalls: number;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
} as const;

// Optimized: Uses count queries instead of loading all calls into memory
async function fetchStats(): Promise<Stats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!client) throw new Error('Client not found');

  const { data: agentIds } = await supabase
    .from('agents')
    .select('retell_agent_id')
    .eq('client_id', client.user_id);

  const agentIdList = agentIds?.map(a => a.retell_agent_id) || [];
  
  if (agentIdList.length === 0) {
    return {
      totalCalls: 0,
      agents: 0,
      avgDuration: 0,
      completedCalls: 0,
    };
  }

  // Optimized: Use count queries for better performance
  const { count: totalCalls } = await supabase
    .from('call_history')
    .select('*', { count: 'exact', head: true })
    .in('retell_agent_id', agentIdList);

  const { count: completedCalls } = await supabase
    .from('call_history')
    .select('*', { count: 'exact', head: true })
    .in('retell_agent_id', agentIdList)
    .eq('call_status', 'completed');

  const { count: agents } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', client.user_id);

  // For average, limit to last 30 days to prevent memory issues
  const { data: recentCalls } = await supabase
    .from('call_history')
    .select('call_duration_seconds')
    .in('retell_agent_id', agentIdList)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const avgDuration = recentCalls && recentCalls.length > 0 
    ? Math.round(recentCalls.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0) / recentCalls.length)
    : 0;

  return {
    totalCalls: totalCalls || 0,
    agents: agents || 0,
    avgDuration,
    completedCalls: completedCalls || 0,
  };
}

export default function DashboardOverview() {
  const { data: stats, isLoading: loading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    staleTime: API_CONFIG.CACHE_DURATION,
    retry: API_CONFIG.RETRY_ATTEMPTS,
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-3 animate-pulse" />
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
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-300">{error.message}</p>
      </div>
    );
  }

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number; 
    color: keyof typeof colorClasses 
  }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
          <div className={`p-2.5 md:p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon size={20} className="md:w-6 md:h-6" />
          </div>
        </div>
      </div>
    );
  };

  // Add empty state for no data
  if (stats && stats.totalCalls === 0) {
    return (
      <div className="min-w-0">
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">Real-time statistics for your AI agents</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 md:p-12 text-center">
          <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg md:text-xl font-medium text-gray-900 dark:text-white mb-2">No calls yet</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Your agents haven't made any calls. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">Real-time statistics for your AI agents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <StatCard icon={Phone} label="Total Calls" value={stats!.totalCalls} color="blue" />
        <StatCard icon={TrendingUp} label="Active Agents" value={stats!.agents} color="green" />
        <StatCard icon={Clock} label="Average Duration" value={`${stats!.avgDuration}s`} color="purple" />
        <StatCard icon={CheckCircle} label="Completed Calls" value={stats!.completedCalls} color="orange" />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300">About This Dashboard</h3>
        <p className="text-blue-800 dark:text-blue-300 mt-2 text-sm md:text-base">
          These statistics are automatically calculated from your AI agents' call history. 
          Check the <span className="font-semibold">Call History</span> section to see details for each call.
        </p>
      </div>
    </div>
  );
}