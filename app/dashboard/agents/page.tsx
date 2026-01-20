// app/dashboard/agents/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/supabase';
import {
  X, Loader2, MessageSquare, Edit3, Phone, Calendar, Trash2, Plus,
  Settings, ChevronRight, MoreHorizontal, Mic, Globe, Zap, Copy,
  ArrowUpRight, CheckCircle2
} from 'lucide-react';
import { showToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { siteConfig } from '@/config/site';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimePhoneNumbers } from '@/hooks/useRealtimeSubscriptions';
import { Select } from '@/components/ui/Select';

type TabType = 'settings' | 'integrations' | 'danger';

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  // Settings form state
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingVoice, setEditingVoice] = useState('');
  const [editingLanguage, setEditingLanguage] = useState('');
  const [saving, setSaving] = useState(false);

  // Integration form state
  const [integrationType, setIntegrationType] = useState<'transfer_call' | 'cal_com' | null>(null);
  const [submittingIntegration, setSubmittingIntegration] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferFunctionName, setTransferFunctionName] = useState('');
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

  // Delete state
  const [deleting, setDeleting] = useState(false);

  const queryClient = useQueryClient();

  // Get user ID
  const { data: userId } = useQuery({
    queryKey: ['user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return user.id;
    },
    staleTime: Infinity,
  });

  useRealtimePhoneNumbers(userId);

  // Fetch client minutes status
  const { data: minutesData } = useQuery({
    queryKey: ['agent-status', userId],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('minutes_included, minutes_used')
        .eq('user_id', userId!)
        .maybeSingle();

      if (!client) return { hasMinutes: false };
      const remaining = Math.max(0, client.minutes_included - client.minutes_used);
      return { hasMinutes: remaining > 0 };
    },
    enabled: !!userId,
    staleTime: 0,
  });

  const hasMinutes = minutesData?.hasMinutes ?? true;

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select(`*, phone_numbers (phone_number)`)
        .eq('client_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: Infinity,
  });

  // Open agent settings panel
  const handleOpenAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditingPrompt(agent.prompt || '');
    setEditingVoice(agent.voice || '11labs-Adrian');
    setEditingLanguage(agent.language || 'en-US');
    setActiveTab('settings');
    setIntegrationType(null);
  };

  // Close agent settings panel
  const handleClosePanel = () => {
    setSelectedAgent(null);
    setIntegrationType(null);
    setPhoneNumber('');
    setTransferDescription('');
    setTransferFunctionName('');
    setCalApiKey('');
    setCalEventTypeId('');
    setCalTimezone('');
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!selectedAgent) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Update LLM prompt
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
        const errData = await promptResponse.json().catch(() => ({}));
        console.error('Prompt update failed:', errData);
        throw new Error(errData.error || 'Prompt update failed');
      }

      // Update agent voice/language
      const agentResponse = await fetch('/api/retell/update-agent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          agent_id: selectedAgent.retell_agent_id,
          voice_id: editingVoice,
          language: editingLanguage,
        }),
      });

      if (!agentResponse.ok) {
        const errData = await agentResponse.json().catch(() => ({}));
        console.error('Agent update failed:', errData);
        throw new Error(errData.error || 'Agent update failed');
      }

      // Update database
      await supabase
        .from('agents')
        .update({ prompt: editingPrompt, voice: editingVoice, language: editingLanguage })
        .eq('id', selectedAgent.id);

      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add integration
  const handleAddIntegration = async () => {
    if (!selectedAgent || !integrationType) return;

    // Validation
    if (integrationType === 'transfer_call') {
      if (!phoneNumber.trim() || !transferDescription.trim() || !transferFunctionName.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(transferFunctionName)) {
        showToast('Function name can only contain letters, numbers, underscores, and dashes', 'error');
        return;
      }
    } else if (integrationType === 'cal_com') {
      if (!calApiKey.trim() || !calEventTypeId.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      if (isNaN(Number(calEventTypeId))) {
        showToast('Event Type ID must be a number', 'error');
        return;
      }
    }

    setSubmittingIntegration(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const integration = integrationType === 'transfer_call'
        ? { type: 'transfer_call', phone_number: phoneNumber, transfer_description: transferDescription, function_name: transferFunctionName }
        : { type: 'cal_com', cal_api_key: calApiKey, event_type_id: Number(calEventTypeId), ...(calTimezone.trim() && { timezone: calTimezone }) };

      const response = await fetch('/api/integrations/add-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ agent_id: selectedAgent.id, integration }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to add integration');

      showToast(result.message || 'Integration added!', 'success');
      setIntegrationType(null);
      setPhoneNumber('');
      setTransferDescription('');
      setTransferFunctionName('');
      setCalApiKey('');
      setCalEventTypeId('');
      setCalTimezone('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to add integration', 'error');
    } finally {
      setSubmittingIntegration(false);
    }
  };

  // Delete agent
  const handleDeleteAgent = async () => {
    if (!selectedAgent) return;
    setDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/agents/delete?agent_id=${selectedAgent.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Failed to delete agent');

      showToast(`Agent deleted successfully`, 'success');
      handleClosePanel();
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    } catch (error) {
      showToast('Failed to delete agent', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Create agent
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) {
      showToast('Agent name is required', 'error');
      return;
    }

    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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

      showToast(`Agent "${newAgentName}" created!`, 'success');
      setNewAgentName('');
      setNewAgentPrompt('');
      setNewAgentVoice('11labs-Adrian');
      setNewAgentLanguage('en-US');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['agents', userId] });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create agent', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Copy agent ID
  const copyAgentId = (id: string) => {
    navigator.clipboard.writeText(id);
    showToast('Agent ID copied!', 'success');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{siteConfig.dashboardAgents.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your AI voice agents
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Agent
        </Button>
      </div>

      {/* Empty State */}
      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-1">No agents yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Create your first AI voice agent to start handling calls automatically.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Agents Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="group cursor-pointer hover:border-primary/50 transition-all duration-200"
              onClick={() => handleOpenAgent(agent)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{agent.agent_name}</h3>
                      {agent.phone_numbers && agent.phone_numbers.length > 0 ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {agent.phone_numbers[0].phone_number}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          No phone linked
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasMinutes ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                </div>

                {/* Quick info */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Mic className="w-3 h-3" />
                    {agent.voice?.split('-')[1] || 'Default'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {agent.language || 'en-US'}
                  </span>
                </div>

                {/* Action hint */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <Badge variant="outline" className={hasMinutes ? 'border-green-500/30 text-green-600 dark:text-green-400' : 'border-red-500/30 text-red-600 dark:text-red-400'}>
                    {hasMinutes ? 'Active' : 'Paused'}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Configure <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Agent Settings Panel (Slide-over) */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleClosePanel}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-card border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{selectedAgent.agent_name}</h2>
                  <button
                    onClick={() => copyAgentId(selectedAgent.retell_agent_id)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {selectedAgent.retell_agent_id.slice(0, 8)}...
                  </button>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClosePanel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { id: 'settings', label: 'Settings', icon: Settings },
                { id: 'integrations', label: 'Integrations', icon: Zap },
                { id: 'danger', label: 'Danger Zone', icon: Trash2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as TabType); setIntegrationType(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {/* Voice */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voice</label>
                    <Select
                      value={editingVoice}
                      onChange={(e) => setEditingVoice(e.target.value)}
                      icon={<Mic className="w-4 h-4" />}
                    >
                      <optgroup label="Popular">
                        <option value="11labs-Adrian">Adrian - American Male</option>
                        <option value="11labs-Aria">Aria - American Female</option>
                        <option value="11labs-Brian">Brian - American Male</option>
                        <option value="11labs-Sarah">Sarah - American Female</option>
                      </optgroup>
                      <optgroup label="American">
                        <option value="11labs-Andrew">Andrew - Young</option>
                        <option value="11labs-Anna">Anna - Young</option>
                        <option value="11labs-Emily">Emily - Middle Aged</option>
                        <option value="11labs-Ethan">Ethan - Young</option>
                        <option value="11labs-Grace">Grace - Middle Aged</option>
                        <option value="11labs-Hailey">Hailey - Young</option>
                        <option value="11labs-Jason">Jason - Young</option>
                        <option value="11labs-Julia">Julia - Middle Aged</option>
                        <option value="11labs-Kate">Kate - Middle Aged</option>
                        <option value="11labs-Lily">Lily - Young</option>
                        <option value="11labs-Marissa">Marissa - Young</option>
                        <option value="11labs-Mia">Mia - Middle Aged</option>
                        <option value="11labs-Ryan">Ryan - Young</option>
                      </optgroup>
                      <optgroup label="British">
                        <option value="11labs-Amy">Amy - Young</option>
                        <option value="11labs-Anthony">Anthony - Middle Aged</option>
                        <option value="11labs-Dorothy">Dorothy - Young</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="11labs-charlie">Charlie - Australian</option>
                        <option value="11labs-Noah">Noah - Australian</option>
                        <option value="11labs-Carola">Carola - German</option>
                        <option value="11labs-Monika">Monika - Indian</option>
                        <option value="11labs-Santiago">Santiago - Spanish</option>
                      </optgroup>
                    </Select>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Language</label>
                    <Select
                      value={editingLanguage}
                      onChange={(e) => setEditingLanguage(e.target.value)}
                      icon={<Globe className="w-4 h-4" />}
                    >
                      <optgroup label="English">
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="en-AU">English (Australia)</option>
                        <option value="en-IN">English (India)</option>
                      </optgroup>
                      <optgroup label="European">
                        <option value="es-ES">Spanish (Spain)</option>
                        <option value="es-419">Spanish (Latin America)</option>
                        <option value="fr-FR">French (France)</option>
                        <option value="fr-CA">French (Canada)</option>
                        <option value="de-DE">German</option>
                        <option value="it-IT">Italian</option>
                        <option value="pt-BR">Portuguese (Brazil)</option>
                        <option value="nl-NL">Dutch</option>
                      </optgroup>
                      <optgroup label="Asian">
                        <option value="zh-CN">Chinese (Simplified)</option>
                        <option value="ja-JP">Japanese</option>
                        <option value="ko-KR">Korean</option>
                        <option value="hi-IN">Hindi</option>
                      </optgroup>
                      <option value="multi">Multi-language</option>
                    </Select>
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Prompt</label>
                    <textarea
                      value={editingPrompt}
                      onChange={(e) => setEditingPrompt(e.target.value)}
                      placeholder="Define your agent's personality, role, and instructions..."
                      rows={10}
                      className="w-full p-3 rounded-lg border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-ring focus:border-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      This prompt defines how your agent behaves and responds to callers.
                    </p>
                  </div>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  {!integrationType ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Add capabilities to your agent by connecting integrations.
                      </p>

                      {/* Transfer Call */}
                      <button
                        onClick={() => setIntegrationType('transfer_call')}
                        className="w-full p-4 border border-border rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">Transfer Call</h4>
                            <p className="text-xs text-muted-foreground">
                              Forward calls to a human when needed
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>

                      {/* Cal.com */}
                      <button
                        onClick={() => setIntegrationType('cal_com')}
                        className="w-full p-4 border border-border rounded-lg hover:border-primary hover:bg-accent/50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">Cal.com Booking</h4>
                            <p className="text-xs text-muted-foreground">
                              Check availability & book appointments
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    </>
                  ) : integrationType === 'transfer_call' ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setIntegrationType(null)} className="text-sm text-muted-foreground hover:text-foreground">
                          Integrations
                        </button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Transfer Call</span>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Phone Number *</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+1234567890"
                          className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Function Name *</label>
                        <input
                          type="text"
                          value={transferFunctionName}
                          onChange={(e) => setTransferFunctionName(e.target.value)}
                          placeholder="transfer_to_sales"
                          className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground">No spaces, use underscores</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">When to Transfer *</label>
                        <textarea
                          value={transferDescription}
                          onChange={(e) => setTransferDescription(e.target.value)}
                          placeholder="Transfer when the caller asks to speak with a human..."
                          rows={3}
                          className="w-full p-3 rounded-lg border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <Button
                        onClick={handleAddIntegration}
                        disabled={submittingIntegration}
                        className="w-full"
                      >
                        {submittingIntegration ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4 mr-2" />Add Transfer Call</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setIntegrationType(null)} className="text-sm text-muted-foreground hover:text-foreground">
                          Integrations
                        </button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Cal.com</span>
                      </div>

                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Your agent will be able to check availability and book appointments instantly.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">API Key *</label>
                        <input
                          type="password"
                          value={calApiKey}
                          onChange={(e) => setCalApiKey(e.target.value)}
                          placeholder="cal_live_xxxxx"
                          className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Event Type ID *</label>
                        <input
                          type="number"
                          value={calEventTypeId}
                          onChange={(e) => setCalEventTypeId(e.target.value)}
                          placeholder="123456"
                          className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Timezone (Optional)</label>
                        <input
                          type="text"
                          value={calTimezone}
                          onChange={(e) => setCalTimezone(e.target.value)}
                          placeholder="America/New_York"
                          className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
                        />
                      </div>

                      <Button
                        onClick={handleAddIntegration}
                        disabled={submittingIntegration}
                        className="w-full"
                      >
                        {submittingIntegration ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4 mr-2" />Add Cal.com</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && (
                <div className="space-y-6">
                  <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                    <h4 className="font-medium text-destructive mb-2">Delete Agent</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete this agent and all its configurations. This action cannot be undone.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAgent}
                      disabled={deleting}
                      className="w-full"
                    >
                      {deleting ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" />Deleting...</>
                      ) : (
                        <><Trash2 className="w-4 h-4 mr-2" />Delete Agent</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            {activeTab === 'settings' && (
              <div className="p-6 border-t border-border bg-muted/30">
                <Button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold">Create New Agent</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g., Customer Support"
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Voice</label>
                <Select
                  value={newAgentVoice}
                  onChange={(e) => setNewAgentVoice(e.target.value)}
                  icon={<Mic className="w-4 h-4" />}
                >
                  <option value="11labs-Adrian">Adrian (Male)</option>
                  <option value="11labs-Aria">Aria (Female)</option>
                  <option value="11labs-Brian">Brian (Male)</option>
                  <option value="11labs-Sarah">Sarah (Female)</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Select
                  value={newAgentLanguage}
                  onChange={(e) => setNewAgentLanguage(e.target.value)}
                  icon={<Globe className="w-4 h-4" />}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">System Prompt (Optional)</label>
                <textarea
                  value={newAgentPrompt}
                  onChange={(e) => setNewAgentPrompt(e.target.value)}
                  placeholder="Define your agent's behavior..."
                  rows={4}
                  className="w-full p-3 rounded-lg border border-input bg-background text-sm resize-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-border">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateAgent} disabled={creating || !newAgentName.trim()} className="flex-1">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
