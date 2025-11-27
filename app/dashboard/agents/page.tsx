'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Cpu, Edit2, Save, X } from 'lucide-react';

interface UpdateAgentPromptParams {
  agentId: string;
  retellLlmId: string;
  prompt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: client } = await supabase
        .from('clients')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (!client) throw new Error('Client not found');

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('client_id', client.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error loading agents:', err);
      toast.error('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEditPrompt = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setEditingPrompt(agent.prompt || '');
    setError(null);
  }, []);

  const handleSavePrompt = useCallback(async () => {
    if (!selectedAgent || !editingPrompt.trim()) {
      toast.error('Prompt cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    const originalPrompt = selectedAgent.prompt;
    const optimisticUpdate = agents.map((a) =>
      a.id === selectedAgent.id ? { ...a, prompt: editingPrompt } : a
    );

    setAgents(optimisticUpdate);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      await updateAgentPrompt({
        agentId: selectedAgent.id,
        retellLlmId: selectedAgent.retell_llm_id,
        prompt: editingPrompt,
        sessionToken: session.access_token,
      });

      setSelectedAgent(null);
      toast.success('Prompt updated successfully', {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgent.id ? { ...a, prompt: originalPrompt } : a
        )
      );
      setError('Failed to save prompt. Please try again.');
      toast.error('Error saving prompt');
    } finally {
      setIsSaving(false);
    }
  }, [agents, editingPrompt, selectedAgent]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-4 w-52" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
        <CardTitle className="text-xl">No agents created</CardTitle>
        <CardDescription className="mt-2">
          Contact support to create your first agent
        </CardDescription>
        <Button className="mt-6" variant="outline" onClick={fetchAgents}>
          Refresh
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Agents</h1>
        <p className="text-muted-foreground mt-2">
          Manage and customize your AI agents
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{agent.agent_name}</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs">{agent.retell_agent_id}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Voice</span>
                <span className="text-sm font-medium capitalize">{agent.voice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Greeting</span>
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {agent.begin_sentence}
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => handleEditPrompt(agent)}
                className="w-full"
                variant="outline"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Prompt
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!selectedAgent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAgent(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Agent Prompt</DialogTitle>
            <DialogDescription>{selectedAgent?.agent_name}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <Textarea
              value={editingPrompt}
              onChange={(e) => {
                setEditingPrompt(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter prompt for your agent..."
              className="min-h-[300px] resize-none"
              disabled={isSaving}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAgent(null);
                setError(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePrompt}
              disabled={isSaving || !editingPrompt.trim()}
            >
              {isSaving ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function updateAgentPrompt({
  agentId,
  retellLlmId,
  prompt,
  sessionToken,
}: UpdateAgentPromptParams & { sessionToken: string }) {
  const response = await fetch('/api/retell/update-llm', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({
      llm_id: retellLlmId,
      general_prompt: prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Update failed: ${response.status}`);
  }

  const { error } = await supabase
    .from('agents')
    .update({ prompt })
    .eq('id', agentId);

  if (error) throw error;
}