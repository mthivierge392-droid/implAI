// app/dashboard/agents/page.tsx (complete)
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/supabase';
import { X, Loader2, MessageSquare, Edit3, Plug, Phone, Calendar } from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { API_CONFIG } from '@/lib/constants';

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingVoice, setEditingVoice] = useState('');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCalling, setTestCalling] = useState<string | null>(null);
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

  // Fetch client minutes status (separate query for real-time updates)
  const { data: minutesData } = useQuery({
    queryKey: ['client-minutes', userId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('minutes_included, minutes_used')
        .eq('user_id', userId!)
        .single();

      if (!client) return { hasMinutes: false };

      const remaining = Math.max(0, client.minutes_included - client.minutes_used);
      return { hasMinutes: remaining > 0 };
    },
    enabled: !!userId,
    staleTime: Infinity, // Cache forever - rely on real-time updates
  });

  const hasMinutes = minutesData?.hasMinutes ?? false;

  // Fetch agents with React Query (cache forever, rely on real-time updates)
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('client_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: Infinity, // Cache forever - rely on real-time updates
  });

  useEffect(() => {
    if (!userId) return;

    // Real-time subscription for agents table changes
    const agentsChannel = supabase
      .channel('agents-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // All events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'agents',
          filter: `client_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Agent change detected:', payload);
          // Invalidate and refetch agents when any change occurs
          queryClient.invalidateQueries({ queryKey: ['agents', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate minutes query to update hasMinutes status in real-time
          queryClient.invalidateQueries({ queryKey: ['client-minutes', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(agentsChannel);
    };
  }, [userId, queryClient]);

  const handleEditPrompt = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditingPrompt(agent.prompt || '');
    setEditingVoice(agent.voice || '11labs-Adrian');
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
            voice: editingVoice
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
      // This handles both voice changes and prompt-only changes
      const agentUpdateResponse = await fetch('/api/retell/update-agent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          agent_id: selectedAgent.retell_agent_id,
          ...(editingVoice !== originalVoice && { voice_id: editingVoice }),
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
          voice: editingVoice
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
            voice: originalVoice
          } : a
        ) || []
      );
      setError(siteConfig.dashboardAgents.errorSaveFailed);
      showToast('Failed to update agent settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Show agent phone number for testing
  const handleShowTestNumber = (agent: Agent) => {
    if (testCalling === agent.id) {
      setTestCalling(null); // Close if already open
    } else {
      setTestCalling(agent.id); // Show phone number
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
    } else if (integrationType === 'cal_com') {
      if (!calApiKey.trim() || !calEventTypeId.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
    }

    setSubmittingRequest(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        showToast('Please log in to submit a request', 'error');
        setSubmittingRequest(false);
        return;
      }

      const requestData: any = {
        user_email: session.user.email || 'Unknown',
        user_id: session.user.id,
        agent_id: selectedAgentForIntegration.id,
        agent_name: selectedAgentForIntegration.agent_name,
        retell_agent_id: selectedAgentForIntegration.retell_agent_id,
        retell_llm_id: selectedAgentForIntegration.retell_llm_id,
        integration_type: integrationType,
      };

      if (integrationType === 'transfer_call') {
        requestData.phone_number = phoneNumber;
        requestData.transfer_description = transferDescription;
        requestData.transfer_function_name = transferFunctionName;
      } else if (integrationType === 'cal_com') {
        requestData.cal_api_key = calApiKey;
        requestData.cal_event_type_id = calEventTypeId;
        if (calTimezone.trim()) {
          requestData.cal_timezone = calTimezone;
        }
      }

      const response = await fetch('/api/integrations/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit request');
      }

      showToast(result.message || 'Integration request sent successfully!', 'success');
      handleCloseIntegrationModal();
    } catch (error) {
      console.error('Error submitting integration request:', error);
      showToast(error instanceof Error ? error.message : 'Failed to submit request. Please try again.', 'error');
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
                        <CardTitle
                          className="text-lg cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleNameClick(agent)}
                        >
                          {agent.agent_name}
                        </CardTitle>
                      )}
                      <CardDescription className="font-mono text-xs truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">{agent.retell_agent_id}</CardDescription>
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
                      <span className="hidden sm:inline">Request Integration</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditPrompt(agent)}
                      className="gap-2 flex-shrink-0"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit Settings</span>
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

                <div className="mt-4 pt-4 border-t border-border">
                  {agent.twilio_number ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowTestNumber(agent)}
                        className="w-full gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        {testCalling === agent.id ? 'Hide Number' : "Show Agent's Number"}
                      </Button>

                      {testCalling === agent.id && (
                        <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-xs text-muted-foreground mb-1">Call this number to test your agent:</p>
                          <p className="text-lg font-semibold text-primary">{agent.twilio_number}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground text-center">No phone number assigned yet</p>
                    </div>
                  )}
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

      {/* Integration Request Modal */}
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
                <h3 className="text-xl font-semibold text-card-foreground">Request Integration</h3>
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

                  <div className="p-4 bg-muted/30 rounded-lg border border-border mb-4">
                    <p className="text-sm text-muted-foreground">
                      📅 We'll configure <strong>both</strong> Cal.com functions for you: <strong>check availability</strong> and <strong>book appointment</strong>. Just provide your API credentials below.
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
                      Sending...
                    </>
                  ) : 'Submit Request'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}