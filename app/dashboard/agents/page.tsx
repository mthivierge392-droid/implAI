'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/supabase';
import { Cpu, Loader2, Pencil, MessageSquare, Check, X } from 'lucide-react';
import { showToast } from '@/components/toast';
import { cn } from '@/lib/utils';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

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
        .eq('client_id', client.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (err) {
      console.error('Error loading agents:', err);
      showToast('Failed to load agents', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEditName = (agent: Agent) => {
    setEditingAgent(agent);
    setEditingName(agent.agent_name || '');
  };

  const handleSaveName = async () => {
    if (!editingAgent || !editingName.trim()) return;

    setSaving(true);
    
    try {
      // Optimistic update
      const updatedAgents = agents.map(a => 
        a.id === editingAgent.id ? { ...a, agent_name: editingName } : a
      );
      setAgents(updatedAgents);

      // Database update
      const { error } = await supabase
        .from('agents')
        .update({ agent_name: editingName })
        .eq('id', editingAgent.id);

      if (error) throw error;

      setEditingAgent(null);
      showToast('Agent name updated', 'success');
      
    } catch (error) {
      console.error('Error saving agent name:', error);
      await fetchAgents(); // Revert on error
      showToast('Error saving name', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditPrompt = async (agent: Agent) => {
    // Keep existing prompt editing logic but hidden from UI
    console.log('Prompt editing available via API only for agent:', agent.id);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-3 animate-pulse" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 animate-pulse" />
              </div>
              <div className="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Cpu size={32} className="text-white" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          No Agents Created
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Contact us to create your first AI agent
        </p>
        <a
          href="mailto:mthivierge392@gmail.com?subject=Request%20for%20AI%20Agent%20Creation"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
        >
          <MessageSquare size={18} />
          Request Agent Creation
        </a>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
          My AI Agents
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm md:text-base">
          Manage your agents
        </p>
      </div>

      <div className="grid gap-4 md:gap-6">
        {agents.map(agent => (
          <AgentCard 
            key={agent.id} 
            agent={agent}
            onEditName={handleEditName}
          />
        ))}
      </div>

      {/* Edit Name Modal */}
      {editingAgent && (
        <NameEditModal
          name={editingName}
          setName={setEditingName}
          onSave={handleSaveName}
          onClose={() => setEditingAgent(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function AgentCard({ agent, onEditName }: { agent: Agent; onEditName: (agent: Agent) => void }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Cpu size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {agent.agent_name || 'Unnamed Agent'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Created {new Date(agent.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
        <button
          onClick={() => onEditName(agent)}
          className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex-shrink-0"
          title="Edit agent name"
        >
          <Pencil size={18} />
        </button>
      </div>
    </div>
  );
}

function NameEditModal({
  name,
  setName,
  onSave,
  onClose,
  saving
}: {
  name: string;
  setName: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Edit Agent Name
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <label htmlFor="agent-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Agent Name
          </label>
          <input
            id="agent-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Sales Agent, Support Bot"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!name.trim() || saving}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-medium transition-all",
              name.trim() && !saving
                ? "bg-blue-600 hover:bg-blue-700 text-white active:scale-95"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            )}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin inline mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} className="inline mr-2" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}