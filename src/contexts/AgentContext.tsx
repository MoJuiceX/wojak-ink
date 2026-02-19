/**
 * AgentContext — manages agent state for the current user.
 * Provides: agent info, hasAgent, createAgent, rotateKey, rate limit status.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useToast } from './ToastContext';

interface AgentInfo {
  agent_id: string;
  name: string;
  status: 'active' | 'retired';
  tier: 'trial' | 'free' | 'premium';
  webhook_url: string | null;
  created_at: string;
  fighters: any[];
  battle_stats: {
    total: number;
    wins: number;
    losses: number;
  };
}

interface AgentContextValue {
  agent: AgentInfo | null;
  hasAgent: boolean;
  isLoading: boolean;
  oneTimeApiKey: string | null;
  webhookSecret: string | null;
  clearOneTimeKey: () => void;
  createAgent: (name: string, webhookUrl?: string) => Promise<boolean>;
  rotateKey: () => Promise<string | null>;
  refreshAgent: () => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children, ownerDid }: { children: ReactNode; ownerDid: string | null }) {
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oneTimeApiKey, setOneTimeApiKey] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const refreshAgent = useCallback(async () => {
    if (!ownerDid) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/combat/agent-profile?did=${encodeURIComponent(ownerDid)}`);
      if (res.ok) {
        const data = await res.json();
        setAgent(data);
      } else {
        setAgent(null);
      }
    } catch (err) {
      console.error('[AgentContext] Failed to fetch agent:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ownerDid]);

  // Load agent on mount / DID change
  useEffect(() => {
    if (ownerDid) refreshAgent();
    else setAgent(null);
  }, [ownerDid, refreshAgent]);

  const createAgent = useCallback(async (name: string, webhookUrl?: string): Promise<boolean> => {
    if (!ownerDid) return false;
    setIsLoading(true);
    try {
      const res = await fetch('/api/combat/agent-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerDid,
          name,
          webhook_url: webhookUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showError(data.error || 'Failed to create agent');
        return false;
      }

      const data = await res.json();
      setOneTimeApiKey(data.api_key);
      setWebhookSecret(data.webhook_secret);
      success('Agent created! Save your API key now.');
      await refreshAgent();
      return true;
    } catch (err) {
      showError('Network error creating agent');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ownerDid, success, showError, refreshAgent]);

  const rotateKey = useCallback(async (): Promise<string | null> => {
    // rotate-key requires the current API key in Authorization header.
    // This is a no-op from the frontend — agents rotate keys via API directly.
    showError('Key rotation must be done via the agent API');
    return null;
  }, [showError]);

  const clearOneTimeKey = useCallback(() => {
    setOneTimeApiKey(null);
    setWebhookSecret(null);
  }, []);

  return (
    <AgentContext.Provider
      value={{
        agent,
        hasAgent: !!agent,
        isLoading,
        oneTimeApiKey,
        webhookSecret,
        clearOneTimeKey,
        createAgent,
        rotateKey,
        refreshAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}
