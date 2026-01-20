// app/dashboard/agents/page.tsx (complete)
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/supabase';
import { X, Loader2, MessageSquare, Edit3, Plug, Phone, Calendar, Trash2, Plus } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { siteConfig } from '@/config/site';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimePhoneNumbers } from '@/hooks/useRealtimeSubscriptions';

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingVoice, setEditingVoice] = useState('');
  const [editingLanguage, setEditingLanguage] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Integration Request Modal State
  const [selectedAgentForIntegration, setSelectedAgentForIntegration] = useState<Agent | null>(null);
  const [integrationType, setIntegrationType] = useState<'transfer_call' | 'cal_com' | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Transfer Call fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferFunctionName, setTransferFunctionName] = useState('');

  // Cal.com fields
  const [calApiKey, setCalApiKey] = useState('');
  const [calEventTypeId, setCalEventTypeId] = useState('');
  const [calTimezone, setCalTimezone] = useState('');

  // Create Agent Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [newAgentVoice, setNewAgentVoice] = useState('11labs-Adrian');
  const [newAgentLanguage, setNewAgentLanguage] = useState('en-US');

  // Delete Confirmation Modal State
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Get user ID
  const { data: userId } = useQuery({
    queryKey: ['user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return user.id;
    },
    staleTime: Infinity, // User ID never changes
  });

  // Enable real-time updates for phone numbers (updates agent cards when phone linked/unlinked)
  useRealtimePhoneNumbers(userId);

  // Fetch client minutes status (separate query for real-time updates)
  // Use different query key to avoid conflicts with MinutesCounter component
  const { data: minutesData } = useQuery({
    queryKey: ['agent-status', userId],
    queryFn: async () => {
      try {
        // Add timeout to prevent indefinite hanging (same as MinutesCounter)
        const queryPromise = supabase
          .from('clients')
          .select('minutes_included, minutes_used')
          .eq('user_id', userId!)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout after 5 seconds')), 5000)
        );

        const { data: client, error } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('[Agents Page] Client query error:', error);
          return { hasMinutes: false };
        }

        if (!client) {
          console.warn('[Agents Page] No client data found');
          return { hasMinutes: false };
        }

        const remaining = Math.max(0, client.minutes_included - client.minutes_used);
        return { hasMinutes: remaining > 0 };
      } catch (err) {
        console.error('[Agents Page] Query exception:', err);
        return { hasMinutes: false };
      }
    },
    enabled: !!userId,
    staleTime: 0, // Always refetch - rely on real-time updates to trigger
    refetchOnWindowFocus: true,
    retry: 2,
    retryDelay: 1000,
  });

  // Default to true (Active) until we have actual data - prevents "paused" flash during loading
  const hasMinutes = minutesData?.hasMinutes ?? true;

  // Fetch agents with linked phone numbers
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          phone_numbers (
            phone_number
          )
        `)
        .eq('client_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: Infinity, // Cache forever - rely on real-time updates
  });

  const handleEditPrompt = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditingPrompt(agent.prompt || '');
    setEditingVoice(agent.voice || '11labs-Adrian');
    setEditingLanguage(agent.language || 'en-US');
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
    queryClient.setQueryData(['agents', userId], (prev: Agent[] | undefined) =>
      prev?.map((a: Agent) =>
        a.id === agent.id ? { ...a, agent_name: editingNameValue } : a
      ) || []
    );
    setEditingNameId(null);

    try {
      // Update Retell API first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const retellResponse = await fetch('/api/retell/update-agent', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            agent_id: agent.retell_agent_id,
            agent_name: editingNameValue,
          }),
        });

        if (!retellResponse.ok) {
          console.error('Retell name update failed');
        }
      }

      // Update database
      const { error } = await supabase
        .from('agents')
        .update({ agent_name: editingNameValue })
        .eq('id', agent.id);

      if (error) throw error;
      showToast(siteConfig.dashboardAgents.nameUpdated, 'success');
    } catch (error) {
      console.error('Error updating name:', error);
      // Revert on error
      queryClient.setQueryData(['agents', userId], (prev: Agent[] | undefined) =>
        prev?.map((a: Agent) =>
          a.id === agent.id ? { ...a, agent_name: originalName } : a
        ) || []
      );
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
    const originalVoice = selectedAgent.voice;
    const originalLanguage = selectedAgent.language;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(siteConfig.dashboardAgents.errorNotAuthenticated);
        showToast(siteConfig.dashboardAgents.errorNotAuthenticated, 'error');
        setSaving(false);
        return;
      }

      // Optimistically update cache
      queryClient.setQueryData(['agents', userId], (prev: Agent[] | undefined) =>
        prev?.map((a: Agent) =>
          a.id === selectedAgent.id ? {
            ...a,
            prompt: editingPrompt,
            voice: editingVoice,
            language: editingLanguage
          } : a
        ) || []
      );

      // Update prompt via LLM endpoint
      const promptResponse = await fetch('/api/retell/update-llm', {
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

      if (!promptResponse.ok) {
        throw new Error(`Prompt update failed: ${promptResponse.status}`);
      }

      // Always publish agent to ensure latest version is active
      // This handles both voice and language changes
      const agentUpdateResponse = await fetch('/api/retell/update-agent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          agent_id: selectedAgent.retell_agent_id,
          ...(editingVoice !== originalVoice && { voice_id: editingVoice }),
          ...(editingLanguage !== originalLanguage && { language: editingLanguage }),
        }),
      });

      if (!agentUpdateResponse.ok) {
        const errorData = await agentUpdateResponse.json().catch(() => ({}));
        console.error('Agent update error:', errorData);
        throw new Error(`Agent update failed: ${agentUpdateResponse.status}`, { cause: errorData });
      }

      await supabase
        .from('agents')
        .update({
          prompt: editingPrompt,
          voice: editingVoice,
          language: editingLanguage
        })
        .eq('id', selectedAgent.id);

      setSelectedAgent(null);
      showToast('Agent settings updated successfully!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert on error
      queryClient.setQueryData(['agents', userId], (prev: Agent[] | undefined) =>
        prev?.map((a: Agent) =>
          a.id === selectedAgent.id ? {
            ...a,
            prompt: originalPrompt,
            voice: originalVoice,
            language: originalLanguage
          } : a
        ) || []
      );
      setError(siteConfig.dashboardAgents.errorSaveFailed);
      showToast('Failed to update agent settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete agent handler - show confirmation modal
  const handleDeleteAgent = (agent: Agent) => {
    setAgentToDelete(agent);
  };

  // Confirm and execute deletion
  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;

    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Not authenticated', 'error');
        return;
      }

      // Optimistically remove from UI
      queryClient.setQueryData(['agents', userId], (prev: Agent[] | undefined) =>
        prev?.filter((a: Agent) => a.id !== agentToDelete.id) || []
      );

      showToast(`Deleting "${agentToDelete.agent_name}"...`, 'info');

      // Call delete API
      const response = await fetch(`/api/agents/delete?agent_id=${agentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete agent');
      }

      showToast(`Agent "${agentToDelete.agent_name}" deleted successfully`, 'success');

      // Close modal and refetch
      setAgentToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });

    } catch (error) {
      console.error('Error deleting agent:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete agent', 'error');

      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    } finally {
      setDeleting(false);
    }
  };

  // Create Agent Handlers
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      showToast('Agent name is required', 'error');
      return;
    }

    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Not authenticated', 'error');
        return;
      }

      showToast('Creating agent...', 'info');

      const response = await fetch('/api/agents/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          agent_name: newAgentName,
          prompt: newAgentPrompt || null,
          voice: newAgentVoice,
          language: newAgentLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create agent');
      }

      await response.json();

      showToast(`Agent "${newAgentName}" created successfully!`, 'success');

      // Reset form
      setNewAgentName('');
      setNewAgentPrompt('');
      setNewAgentVoice('11labs-Adrian');
      setNewAgentLanguage('en-US');
      setShowCreateModal(false);

      // Refetch agents
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });

    } catch (error) {
      console.error('Error creating agent:', error);
      showToast(error instanceof Error ? error.message : 'Failed to create agent', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Integration Request Handlers
  const handleOpenIntegrationModal = (agent: Agent) => {
    setSelectedAgentForIntegration(agent);
    setIntegrationType(null);
    // Reset all form fields
    setPhoneNumber('');
    setTransferDescription('');
    setTransferFunctionName('');
    setCalApiKey('');
    setCalEventTypeId('');
    setCalTimezone('');
  };

  const handleCloseIntegrationModal = () => {
    setSelectedAgentForIntegration(null);
    setIntegrationType(null);
    setPhoneNumber('');
    setTransferDescription('');
    setTransferFunctionName('');
    setCalApiKey('');
    setCalEventTypeId('');
    setCalTimezone('');
  };

  const handleSubmitIntegrationRequest = async () => {
    if (!selectedAgentForIntegration || !integrationType) return;

    // Validation
    if (integrationType === 'transfer_call') {
      if (!phoneNumber.trim() || !transferDescription.trim() || !transferFunctionName.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      // Validate function name format
      if (!/^[a-zA-Z0-9_-]+$/.test(transferFunctionName)) {
        showToast('Function name can only contain letters, numbers, underscores, and dashes', 'error');
        return;
      }
    } else if (integrationType === 'cal_com') {
      if (!calApiKey.trim() || !calEventTypeId.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      // Validate event type ID is a number
      if (isNaN(Number(calEventTypeId))) {
        showToast('Event Type ID must be a number', 'error');
        return;
      }
    }

    setSubmittingRequest(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        showToast('Please log in', 'error');
        setSubmittingRequest(false);
        return;
      }

      // Build integration payload for direct API call
      let integration: any;

      if (integrationType === 'transfer_call') {
        integration = {
          type: 'transfer_call',
          phone_number: phoneNumber,
          transfer_description: transferDescription,
          function_name: transferFunctionName,
        };
      } else if (integrationType === 'cal_com') {
        integration = {
          type: 'cal_com',
          cal_api_key: calApiKey,
          event_type_id: Number(calEventTypeId),
          ...(calTimezone.trim() && { timezone: calTimezone }),
        };
      }

      // Call the new direct integration API
      const response = await fetch('/api/integrations/add-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          agent_id: selectedAgentForIntegration.id,
          integration,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add integration');
      }

      showToast(result.message || 'Integration added successfully!', 'success');
      handleCloseIntegrationModal();

      // Refresh agents to show updated integrations
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    } catch (error) {
      console.error('Error adding integration:', error);
      showToast(error instanceof Error ? error.message : 'Failed to add integration. Please try again.', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (isLoading) {
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
      <>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{siteConfig.dashboardAgents.title}</h1>
            <p className="text-muted-foreground">{siteConfig.dashboardAgents.subtitle}</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Agent
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{siteConfig.dashboardAgents.emptyStateTitle}</h2>
          <p className="text-muted-foreground text-sm max-w-md text-center mb-4">
            {siteConfig.dashboardAgents.emptyStateDescription}
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Agent
          </Button>
        </div>

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
              <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
                <h2 className="text-xl font-semibold text-foreground">Create New Agent</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                {/* Agent Name */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Agent Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAgentName}
                    onChange={(e) => setNewAgentName(e.target.value)}
                    placeholder="e.g., Customer Support Agent"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                  />
                </div>

                {/* Prompt */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    System Prompt (Optional)
                  </label>
                  <textarea
                    value={newAgentPrompt}
                    onChange={(e) => setNewAgentPrompt(e.target.value)}
                    placeholder="Define your agent's personality, role, and instructions..."
                    rows={6}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can edit this later in agent settings
                  </p>
                </div>

                {/* Voice Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Voice
                  </label>
                  <select
                    value={newAgentVoice}
                    onChange={(e) => setNewAgentVoice(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                  >
                    <option value="11labs-Adrian">Adrian (Male)</option>
                    <option value="11labs-Aria">Aria (Female)</option>
                    <option value="11labs-Fin">Fin (Male)</option>
                    <option value="11labs-Sarah">Sarah (Female)</option>
                    <option value="openai-Alloy">Alloy (Neutral)</option>
                    <option value="openai-Echo">Echo (Male)</option>
                    <option value="openai-Nova">Nova (Female)</option>
                  </select>
                </div>

                {/* Language Selection */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Language
                  </label>
                  <select
                    value={newAgentLanguage}
                    onChange={(e) => setNewAgentLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="es-MX">Spanish (Mexico)</option>
                    <option value="fr-FR">French</option>
                    <option value="de-DE">German</option>
                    <option value="it-IT">Italian</option>
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="ja-JP">Japanese</option>
                    <option value="ko-KR">Korean</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                  </select>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 p-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAgent}
                  disabled={creating || !newAgentName.trim()}
                  className="flex-1"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : 'Create Agent'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{siteConfig.dashboardAgents.title}</h1>
          <p className="text-muted-foreground">{siteConfig.dashboardAgents.subtitle}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Agent
        </Button>
      </div>

      {/* Agents List */}
      <div className="space-y-4">
        {agents.map(agent => (
            <Card key={agent.id} className="group hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 md:gap-4">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {editingNameId === agent.id ? (
                        <input
                          type="text"
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onBlur={() => handleNameSave(agent)}
                          onKeyDown={(e) => handleNameKeyDown(e, agent)}
                          autoFocus
                          className="text-lg font-semibold bg-background border border-input rounded px-2 py-1 focus:ring-2 focus:ring-ring focus:border-ring outline-none w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2 group/name">
                          <CardTitle
                            className="text-lg cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleNameClick(agent)}
                          >
                            {agent.agent_name}
                          </CardTitle>
                          <button
                            onClick={() => handleNameClick(agent)}
                            className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                            aria-label="Edit agent name"
                          >
                            <Edit3 className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                      {agent.phone_numbers && agent.phone_numbers.length > 0 ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                            <Phone className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-primary">{agent.phone_numbers[0].phone_number}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                            <Phone className="w-3 h-3 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-500">No phone linked</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenIntegrationModal(agent)}
                      className="gap-2 flex-shrink-0"
                    >
                      <Plug className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Integration</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditPrompt(agent)}
                      className="gap-2 flex-shrink-0"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit Settings</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteAgent(agent)}
                      className="gap-2 flex-shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
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

      {/* Edit Prompt Modal */}
      {selectedAgent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={() => setSelectedAgent(null)}
        >
          <div
            className="bg-card rounded-xl shadow-xl max-w-[95vw] sm:max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
              <div>
                <h3 className="text-xl font-semibold text-card-foreground">Edit Agent Settings</h3>
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

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Voice Selection
                </label>
                <select
                  value={editingVoice}
                  onChange={(e) => setEditingVoice(e.target.value)}
                  className="w-full p-3 rounded-lg border-2 border-input shadow-sm hover:border-primary/50 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: 'white',
                    color: 'black'
                  }}
                >
                  <option value="11labs-Adrian">Adrian - American Young</option>
                  <option value="11labs-Amritanshu">Amritanshu - Indian Middle Aged</option>
                  <option value="11labs-Amy">Amy (UK) - British Young</option>
                  <option value="11labs-Andrew">Andrew - American Young</option>
                  <option value="11labs-Anna">Anna - American Young</option>
                  <option value="11labs-Anthony">Anthony - British Middle Aged</option>
                  <option value="11labs-Billy">Billy - American Young</option>
                  <option value="11labs-Bing">Bing - American Young</option>
                  <option value="11labs-Brian">Brian - American Young</option>
                  <option value="11labs-Carola">Carola - German Middle Aged</option>
                  <option value="11labs-charlie">Charlie - Australian Middle Aged</option>
                  <option value="11labs-Chloe">Chloe - American Young</option>
                  <option value="11labs-Cimo">Cimo - American Middle Aged</option>
                  <option value="11labs-Cleo">Cleo - American Middle Aged</option>
                  <option value="11labs-Dorothy">Dorothy - British Young</option>
                  <option value="11labs-Emily">Emily - American Middle Aged</option>
                  <option value="11labs-Ethan">Ethan - American Young</option>
                  <option value="11labs-Evie">Evie - American Young</option>
                  <option value="11labs-Gilfoy">Gilfoy - American Middle Aged</option>
                  <option value="11labs-Grace">Grace - American Middle Aged</option>
                  <option value="11labs-Hailey-Latin-America-Spanish-localized">Hailey - Latin America Spanish</option>
                  <option value="11labs-Hailey">Hailey - American Young</option>
                  <option value="11labs-James">James - American Old</option>
                  <option value="11labs-Jason">Jason - American Young</option>
                  <option value="custom_voice_b98ca99edb0d341cf62d98d207">Jeanne Mance - Female Teacher</option>
                  <option value="11labs-Jenny">Jenny - American Young</option>
                  <option value="11labs-Joe">Joe - American Middle Aged</option>
                  <option value="11labs-John">John - American Middle Aged</option>
                  <option value="11labs-Julia">Julia - American Middle Aged</option>
                  <option value="11labs-Kate">Kate - American Middle Aged</option>
                  <option value="11labs-Kathrine">Kathrine - American Middle Aged</option>
                  <option value="11labs-Lily">Lily - American Young</option>
                  <option value="11labs-Lucas">Lucas - American Middle Aged</option>
                  <option value="custom_voice_02c1752d1699a3e1d5b58b89c0">Léo - Quebec French</option>
                  <option value="custom_voice_3f9e6369afc0b6d5945d43573a">Mademoiselle French - Conversational</option>
                  <option value="11labs-Marissa">Marissa - American Young</option>
                  <option value="11labs-Max">Max - American Middle Aged</option>
                  <option value="11labs-Mia">Mia - American Middle Aged</option>
                  <option value="11labs-Monika">Monika - Indian Middle Aged</option>
                  <option value="11labs-Myra">Myra - American Young</option>
                  <option value="11labs-Nia">Nia - American Young</option>
                  <option value="11labs-Nico">Nico - American Middle Aged</option>
                  <option value="11labs-Nina">Nina - American Middle Aged</option>
                  <option value="11labs-Noah">Noah - Australian Middle Aged</option>
                  <option value="11labs-Nyla">Nyla - American Young</option>
                  <option value="11labs-Paola">Paola - American Young</option>
                  <option value="custom_voice_e839c34f2b96df6cdee668d1ba">Patrick - Québec Canada Montréal</option>
                  <option value="11labs-Paul">Paul - American Old</option>
                  <option value="11labs-Ryan">Ryan - American Young</option>
                  <option value="11labs-Samad">Samad - Indian Middle Aged</option>
                  <option value="11labs-Santiago">Santiago - Spanish Middle Aged</option>
                  <option value="11labs-Steve">Steve - American Old</option>
                  <option value="11labs-Susan">Susan - American Middle Aged</option>
                  <option value="11labs-victoria">Victoria - American Young</option>
                  <option value="11labs-Zuri">Zuri - American Old</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Language
                </label>
                <select
                  value={editingLanguage}
                  onChange={(e) => setEditingLanguage(e.target.value)}
                  className="w-full p-3 rounded-lg border-2 border-input shadow-sm hover:border-primary/50 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: 'white',
                    color: 'black'
                  }}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-AU">English (Australia)</option>
                  <option value="en-NZ">English (New Zealand)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="multi">Multi-language</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="es-419">Spanish (Latin America)</option>
                  <option value="fr-FR">French (France)</option>
                  <option value="fr-CA">French (Canada)</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                  <option value="pt-BR">Portuguese (Brazil)</option>
                  <option value="pt-PT">Portuguese (Portugal)</option>
                  <option value="nl-NL">Dutch</option>
                  <option value="pl-PL">Polish</option>
                  <option value="ru-RU">Russian</option>
                  <option value="tr-TR">Turkish</option>
                  <option value="sv-SE">Swedish</option>
                  <option value="da-DK">Danish</option>
                  <option value="no-NO">Norwegian</option>
                  <option value="fi-FI">Finnish</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="ko-KR">Korean</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="th-TH">Thai</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  System Prompt
                </label>
                <textarea
                  value={editingPrompt}
                  onChange={(e) => {
                    setEditingPrompt(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={siteConfig.dashboardAgents.modalPlaceholder}
                  className="w-full h-48 p-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 md:p-6 border-t border-border bg-muted/50">
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

      {/* Integration Modal */}
      {selectedAgentForIntegration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={handleCloseIntegrationModal}
        >
          <div
            className="bg-card rounded-xl shadow-xl max-w-[95vw] sm:max-w-lg w-full border border-border max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-xl font-semibold text-card-foreground">Add Integration</h3>
                <p className="text-sm text-muted-foreground">{selectedAgentForIntegration.agent_name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseIntegrationModal}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Step 1: Select Integration Type */}
              {!integrationType && (
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Select Integration Type</h4>

                  {/* Transfer Call Option */}
                  <button
                    onClick={() => setIntegrationType('transfer_call')}
                    className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                        <Phone className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-foreground mb-1">Transfer Call Number</h5>
                        <p className="text-sm text-muted-foreground">
                          Forward calls to a phone number when specific conditions are met
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Cal.com Option */}
                  <button
                    onClick={() => setIntegrationType('cal_com')}
                    className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                        <Calendar className="w-6 h-6 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-foreground mb-1">Cal.com Integration</h5>
                        <p className="text-sm text-muted-foreground">
                          Book appointments or check availability via Cal.com
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2: Transfer Call Form */}
              {integrationType === 'transfer_call' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIntegrationType(null)}
                    >
                      ← Back
                    </Button>
                    <h4 className="font-medium text-foreground">Transfer Call Configuration</h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Include country code (e.g., +1 for US)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Function Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={transferFunctionName}
                      onChange={(e) => setTransferFunctionName(e.target.value)}
                      placeholder="transfer_to_sales"
                      className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use underscores, no spaces (e.g., transfer_to_support)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      When to Transfer <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={transferDescription}
                      onChange={(e) => setTransferDescription(e.target.value)}
                      placeholder="e.g., Transfer to human agent when customer asks to speak with a person or needs urgent assistance"
                      rows={3}
                      className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring resize-none"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Describe when the agent should transfer the call
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Cal.com Form */}
              {integrationType === 'cal_com' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIntegrationType(null)}
                    >
                      ← Back
                    </Button>
                    <h4 className="font-medium text-foreground">Cal.com Configuration</h4>
                  </div>

                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Your agent will instantly be able to <strong>check availability</strong> and <strong>book appointments</strong> via Cal.com. No manual setup required!
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Cal.com API Key <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="password"
                      value={calApiKey}
                      onChange={(e) => setCalApiKey(e.target.value)}
                      placeholder="cal_live_xxxxxxxxxxxxx"
                      className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Get from Cal.com → Settings → Developer → API Keys
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Event Type ID <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      value={calEventTypeId}
                      onChange={(e) => setCalEventTypeId(e.target.value)}
                      placeholder="123456"
                      className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Numeric ID from your Cal.com event type URL
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Timezone (Optional)
                    </label>
                    <input
                      type="text"
                      value={calTimezone}
                      onChange={(e) => setCalTimezone(e.target.value)}
                      placeholder="America/New_York"
                      className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Leave empty to use server timezone
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with action buttons */}
            {integrationType && (
              <div className="flex gap-3 p-4 md:p-6 border-t border-border bg-muted/50 sticky bottom-0">
                <Button
                  variant="outline"
                  onClick={handleCloseIntegrationModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitIntegrationRequest}
                  disabled={submittingRequest}
                  className="flex-1"
                >
                  {submittingRequest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : 'Add Integration'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
              <h2 className="text-xl font-semibold text-foreground">Create New Agent</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Agent Name */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Agent Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g., Customer Support Agent"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  System Prompt (Optional)
                </label>
                <textarea
                  value={newAgentPrompt}
                  onChange={(e) => setNewAgentPrompt(e.target.value)}
                  placeholder="Define your agent's personality, role, and instructions..."
                  rows={6}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can edit this later in agent settings
                </p>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Voice
                </label>
                <select
                  value={newAgentVoice}
                  onChange={(e) => setNewAgentVoice(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                >
                  <option value="11labs-Adrian">Adrian (Male)</option>
                  <option value="11labs-Aria">Aria (Female)</option>
                  <option value="11labs-Fin">Fin (Male)</option>
                  <option value="11labs-Sarah">Sarah (Female)</option>
                  <option value="openai-Alloy">Alloy (Neutral)</option>
                  <option value="openai-Echo">Echo (Male)</option>
                  <option value="openai-Nova">Nova (Female)</option>
                </select>
              </div>

              {/* Language Selection */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Language
                </label>
                <select
                  value={newAgentLanguage}
                  onChange={(e) => setNewAgentLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="es-MX">Spanish (Mexico)</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                  <option value="pt-BR">Portuguese (Brazil)</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="ko-KR">Korean</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                </select>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAgent}
                disabled={creating || !newAgentName.trim()}
                className="flex-1"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : 'Create Agent'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {agentToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full border border-border shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Delete Agent</h2>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-sm mb-2 font-medium" style={{ color: 'rgb(220, 38, 38)' }}>
                  You are about to delete:
                </p>
                <p className="text-base font-semibold text-foreground">
                  {agentToDelete.agent_name}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  This will permanently delete the agent configuration.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-border bg-muted/20">
              <Button
                variant="outline"
                onClick={() => setAgentToDelete(null)}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteAgent}
                disabled={deleting}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}