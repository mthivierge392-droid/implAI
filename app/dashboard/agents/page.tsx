// app/dashboard/agents/page.tsx (complete)
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/supabase';
import { X, Loader2, MessageSquare, Edit3 } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMinutes, setHasMinutes] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch client data to check minutes
      const { data: client } = await supabase
        .from('clients')
        .select('user_id, minutes_included, minutes_used')
        .eq('user_id', user.id)
        .single();

      if (!client) throw new Error('Client not found');

      // Check if has minutes
      const remaining = Math.max(0, client.minutes_included - client.minutes_used);
      setHasMinutes(remaining > 0);

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('client_id', client.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error loading agents:', err);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();

    // Subscribe to minutes changes for real-time status updates
    const channel = supabase
      .channel('agents-minutes-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
        },
        (payload) => {
          const newData = payload.new as any;
          const remaining = Math.max(0, newData.minutes_included - newData.minutes_used);
          setHasMinutes(remaining > 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAgents]);

  const handleEditPrompt = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditingPrompt(agent.prompt || '');
    setError(null);
  };

  const handleNameClick = (agent: Agent) => {
    setEditingNameId(agent.id);
    setEditingNameValue(agent.agent_name);
  };

  const handleNameSave = async (agent: Agent) => {
    if (!editingNameValue.trim() || editingNameValue === agent.agent_name) {
      setEditingNameId(null);
      return;
    }

    const originalName = agent.agent_name;
    
    // Optimistically update UI
    setAgents(prev => prev.map(a => 
      a.id === agent.id ? { ...a, agent_name: editingNameValue } : a
    ));
    setEditingNameId(null);

    try {
      const { error } = await supabase
        .from('agents')
        .update({ agent_name: editingNameValue })
        .eq('id', agent.id);

      if (error) throw error;
      showToast(siteConfig.dashboardAgents.nameUpdated, 'success');
    } catch (error) {
      console.error('Error updating name:', error);
      // Revert on error
      setAgents(prev => prev.map(a =>
        a.id === agent.id ? { ...a, agent_name: originalName } : a
      ));
      showToast(siteConfig.dashboardAgents.nameUpdateFailed, 'error');
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent, agent: Agent) => {
    if (e.key === 'Enter') {
      handleNameSave(agent);
    } else if (e.key === 'Escape') {
      setEditingNameId(null);
    }
  };

  const handleSavePrompt = async () => {
    if (!selectedAgent || !editingPrompt.trim()) return;

    setSaving(true);
    setError(null);
    const originalPrompt = selectedAgent.prompt;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(siteConfig.dashboardAgents.errorNotAuthenticated);
        showToast(siteConfig.dashboardAgents.errorNotAuthenticated, 'error');
        setSaving(false);
        return;
      }

      const updatedAgents = agents.map(a => 
        a.id === selectedAgent.id ? { ...a, prompt: editingPrompt } : a
      );
      setAgents(updatedAgents);

      const response = await fetch('/api/retell/update-llm', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          llm_id: selectedAgent.retell_llm_id,
          general_prompt: editingPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      await supabase
        .from('agents')
        .update({ prompt: editingPrompt })
        .eq('id', selectedAgent.id);

      setSelectedAgent(null);
      showToast(siteConfig.dashboardAgents.promptUpdated, 'success');
    } catch (error) {
      console.error('Error saving prompt:', error);
      setAgents(prev => prev.map(a =>
        a.id === selectedAgent.id ? { ...a, prompt: originalPrompt } : a
      ));
      setError(siteConfig.dashboardAgents.errorSaveFailed);
      showToast(siteConfig.dashboardAgents.promptUpdateFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">{siteConfig.dashboardAgents.emptyStateTitle}</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          {siteConfig.dashboardAgents.emptyStateDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{siteConfig.dashboardAgents.title}</h1>
        <p className="text-muted-foreground">{siteConfig.dashboardAgents.subtitle}</p>
      </div>

      <div className="grid gap-4">
        {agents.map(agent => (
          <Card key={agent.id} className="group hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    {editingNameId === agent.id ? (
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onBlur={() => handleNameSave(agent)}
                        onKeyDown={(e) => handleNameKeyDown(e, agent)}
                        autoFocus
                        className="text-lg font-semibold bg-background border border-input rounded px-2 py-1 focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                      />
                    ) : (
                      <CardTitle 
                        className="text-lg cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleNameClick(agent)}
                      >
                        {agent.agent_name}
                      </CardTitle>
                    )}
                    <CardDescription className="font-mono text-xs">{agent.retell_agent_id}</CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleEditPrompt(agent)}
                  className="gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  {siteConfig.dashboardAgents.editPromptButton}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <Badge
                  variant={hasMinutes ? "success" : "destructive"}
                  style={hasMinutes ? {
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: 'rgb(22, 163, 74)',
                    borderColor: 'rgba(34, 197, 94, 0.3)'
                  } : {
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'rgb(220, 38, 38)',
                    borderColor: 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  {hasMinutes ? siteConfig.dashboardAgents.statusActive : siteConfig.dashboardAgents.statusPaused}
                </Badge>
                
                {/* GLOW EFFECT - GREEN FOR ACTIVE, RED FOR PAUSED */}
                <div className="relative w-4 h-4 flex-shrink-0">
                  {/* Outer pulsing glow */}
                  <div 
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{
                      backgroundColor: hasMinutes ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                      boxShadow: hasMinutes 
                        ? '0 0 10px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.4)' 
                        : '0 0 10px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.4)'
                    }}
                  ></div>
                  {/* Middle pinging glow */}
                  <div 
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: hasMinutes ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                    }}
                  ></div>
                  {/* Center dot */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      margin: '4px',
                      backgroundColor: hasMinutes ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                      boxShadow: hasMinutes 
                        ? '0 0 4px rgba(34, 197, 94, 0.8)' 
                        : '0 0 4px rgba(239, 68, 68, 0.8)'
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedAgent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedAgent(null)}
        >
          <div 
            className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-semibold text-card-foreground">{siteConfig.dashboardAgents.modalTitle}</h3>
                <p className="text-sm text-muted-foreground">{selectedAgent.agent_name}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  setSelectedAgent(null);
                  setError(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                value={editingPrompt}
                onChange={(e) => {
                  setEditingPrompt(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={siteConfig.dashboardAgents.modalPlaceholder}
                className="w-full h-64 p-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring resize-none"
              />
              
              {error && (
                <div className="mt-4 p-3 rounded-lg border border-destructive/20 bg-destructive/10">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border bg-muted/50">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAgent(null);
                  setError(null);
                }}
                className="flex-1"
              >
                {siteConfig.dashboardAgents.modalCancel}
              </Button>
              <Button
                onClick={handleSavePrompt}
                disabled={saving || !editingPrompt.trim()}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {siteConfig.dashboardAgents.modalSaving}
                  </>
                ) : siteConfig.dashboardAgents.modalSave}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}