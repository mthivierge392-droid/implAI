'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/supabase';
import { X, Loader2, Cpu } from 'lucide-react';
import { showToast } from '@/components/toast';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
        .eq('client_id', client.user_id);

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
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated. Please login again.');
        showToast('Not authenticated', 'error');
        setSaving(false);
        return;
      }

      // Optimistic update
      const updatedAgents = agents.map(a => 
        a.id === selectedAgent.id ? { ...a, prompt: editingPrompt } : a
      );
      setAgents(updatedAgents);

      // API call with explicit auth token
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

      // Database update
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
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="flex items-start justify-between gap-4 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-52 animate-pulse" />
              </div>
              <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 md:p-12 text-center">
        <Cpu className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No agents created.</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Contact us to create your first agent.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">My Agents</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">Manage and customize your AI agents</p>
      </div>

      <div className="grid gap-4">
        {agents.map(agent => (
          <div 
            key={agent.id} 
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 min-w-0">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{agent.agent_name}</h3>
                <div className="mt-3 space-y-1.5">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Agent ID:</span> 
                    <span className="ml-1 truncate inline-block max-w-[200px] align-bottom">{agent.retell_agent_id}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Voice:</span> {agent.voice}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Greeting:</span> {agent.begin_sentence}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleEditPrompt(agent)}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-70disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
              >
                Edit Prompt
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedAgent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setSelectedAgent(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-2xl max-w-full md:max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col mx-2 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Edit Prompt</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedAgent.agent_name}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedAgent(null);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <textarea
                value={editingPrompt}
                onChange={(e) => {
                  setEditingPrompt(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter prompt for your agent..."
                className="w-full h-48 md:h-64 p-3 md:p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm md:text-base"
              />
              
              {error && (
                <div className="mt-4 p-3 md:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                  <X size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <button 
                onClick={() => {
                  setSelectedAgent(null);
                  setError(null);
                }} 
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-70disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}