'use client';

import { useEffect, useState } from 'react';
import { Agent } from '@/lib/supabase';
import { X, Loader2 } from 'lucide-react';
import { showToast } from '@/components/toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/lib/language-provider'; // ✅ NEW IMPORT

// API hooks
const useAgents = () => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error loading agents');
      }
      const data = await response.json();
      return data.agents as Agent[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

const useUpdateAgentPrompt = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ agentId, prompt, retellLlmId }: { agentId: string; prompt: string; retellLlmId: string }) => {
      const response = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, prompt, retellLlmId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error updating agent');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
};

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const { t } = useTranslation(); // ✅ USE TRANSLATION
  
  const { data: agents = [], isLoading: loading, error } = useAgents();
  const updateMutation = useUpdateAgentPrompt();

  const handleEditPrompt = (agent: Agent) => {
    setSelectedAgent(agent);
    setEditingPrompt(agent.prompt || '');
  };

  const handleSavePrompt = async () => {
    if (!selectedAgent || !editingPrompt.trim()) return;

    updateMutation.mutate(
      {
        agentId: selectedAgent.id,
        prompt: editingPrompt,
        retellLlmId: selectedAgent.retell_llm_id,
      },
      {
        onSuccess: () => {
          setSelectedAgent(null);
          showToast(t.agents.promptUpdated, 'success');
        },
        onError: (error) => {
          console.error('Error:', error);
          showToast(t.agents.saveError, 'error');
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-52 animate-pulse" />
              </div>
              <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{t.agents.loadError}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{t.agents.title}</h2>
        <p className="text-gray-600 mt-1">{t.agents.subtitle}</p>
      </div>

      {agents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600 text-lg">{t.agents.noAgents}</p>
          <p className="text-gray-500 text-sm mt-2">{t.agents.contactToCreate}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => (
            <div 
              key={agent.id} 
              className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{agent.agent_name}</h3>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">{t.agents.agentId}:</span> {agent.retell_agent_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">{t.agents.voice}:</span> {agent.voice}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">{t.agents.greeting}:</span> {agent.begin_sentence}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleEditPrompt(agent)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {t.agents.editPrompt}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedAgent(null)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{t.agents.editPromptTitle}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedAgent.agent_name}</p>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                placeholder={t.agents.promptPlaceholder}
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button onClick={() => setSelectedAgent(null)} className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium">
                {t.agents.cancel}
              </button>
              <button
                onClick={handleSavePrompt}
                disabled={updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
              >
                {updateMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {t.agents.saving}
                  </span>
                ) : (
                  t.agents.save
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}