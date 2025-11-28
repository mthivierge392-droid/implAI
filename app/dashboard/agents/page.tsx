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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
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

  const handleSavePrompt = async () => {
    if (!selectedAgent || !editingPrompt.trim()) return;

    setSaving(true);
    setError(null);
    const originalPrompt = selectedAgent.prompt;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated. Please login again.');
        showToast('Not authenticated', 'error');
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
      showToast('Prompt updated successfully', 'success');
    } catch (error) {
      console.error('Error saving prompt:', error);
      setAgents(prev => prev.map(a => 
        a.id === selectedAgent.id ? { ...a, prompt: originalPrompt } : a
      ));
      setError('Failed to save prompt. Please try again.');
      showToast('Error saving prompt', 'error');
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
        <h2 className="text-xl font-semibold text-foreground mb-2">No agents yet</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          Contact support to create your first AI agent and start making calls.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Agents</h1>
        <p className="text-muted-foreground">Manage your AI agent configurations</p>
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
                    <CardTitle className="text-lg">{agent.agent_name}</CardTitle>
                    <CardDescription className="font-mono text-xs">{agent.retell_agent_id}</CardDescription>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleEditPrompt(agent)}
                  className="gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Prompt
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3">
                <Badge variant={hasMinutes ? "success" : "destructive"}>
                  {hasMinutes ? "Active" : "Paused"}
                </Badge>
                
                {/* GLOW EFFECT - GREEN FOR ACTIVE, RED FOR PAUSED */}
                <div className="relative w-3 h-3 flex-shrink-0">
                  {/* Outer pulsing glow */}
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-pulse",
                    hasMinutes ? "bg-green-500/50" : "bg-destructive/50"
                  )}></div>
                  {/* Middle pinging glow */}
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-ping",
                    hasMinutes ? "bg-green-500/30" : "bg-destructive/30"
                  )}></div>
                  {/* Center dot with ring */}
                  <div className={cn(
                    "absolute inset-1 rounded-full ring-2",
                    hasMinutes 
                      ? "bg-green-500 ring-green-500/60" 
                      : "bg-destructive ring-destructive/60"
                  )}></div>
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
                <h3 className="text-xl font-semibold text-card-foreground">Edit Prompt</h3>
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
                placeholder="Enter your agent's prompt..."
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
                Cancel
              </Button>
              <Button
                onClick={handleSavePrompt}
                disabled={saving || !editingPrompt.trim()}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : 'Save Prompt'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}