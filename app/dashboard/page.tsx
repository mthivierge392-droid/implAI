// app/dashboard/page.tsx
'use client';

import { Phone, Clock, CheckCircle, TrendingUp, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_CONFIG } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

interface Stats {
  totalCalls: number;
  agents: number;
  avgDuration: number;
  completedCalls: number;
}

export default function DashboardOverview() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    staleTime: 0, // Changed from CACHE_DURATION to always refetch on real-time updates
    retry: API_CONFIG.RETRY_ATTEMPTS,
    refetchOnWindowFocus: true, // Refetch when user returns to page (mobile)
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  if (stats && stats.totalCalls === 0) {
    return (
      <div className="flex flex-col gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{siteConfig.dashboardOverview.title}</h1>
          <p className="text-muted-foreground">{siteConfig.dashboardOverview.subtitle}</p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{siteConfig.dashboardOverview.emptyStateTitle}</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm">
              {siteConfig.dashboardOverview.emptyStateDescription}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statConfigs = [
    {
      icon: Phone,
      label: siteConfig.dashboardOverview.stats.totalCalls.label,
      value: stats!.totalCalls,
      color: "blue",
      description: siteConfig.dashboardOverview.stats.totalCalls.description
    },
    {
      icon: TrendingUp,
      label: siteConfig.dashboardOverview.stats.activeAgents.label,
      value: stats!.agents,
      color: "green",
      description: siteConfig.dashboardOverview.stats.activeAgents.description
    },
    {
      icon: Clock,
      label: siteConfig.dashboardOverview.stats.avgDuration.label,
      value: `${stats!.avgDuration}s`,
      color: "purple",
      description: siteConfig.dashboardOverview.stats.avgDuration.description
    },
    {
      icon: CheckCircle,
      label: siteConfig.dashboardOverview.stats.completed.label,
      value: stats!.completedCalls,
      color: "orange",
      description: siteConfig.dashboardOverview.stats.completed.description
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{siteConfig.dashboardOverview.title}</h1>
        <p className="text-muted-foreground">{siteConfig.dashboardOverview.subtitleWithData}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statConfigs.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="group hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription className="text-sm font-medium">
                  {stat.label}
                </CardDescription>
                <div className={cn(
                  "p-2 rounded-lg bg-muted",
                  "group-hover:scale-110 transition-transform"
                )}>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {siteConfig.dashboardOverview.welcomeTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {siteConfig.dashboardOverview.welcomeDescription}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Optimized fetch with count queries
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