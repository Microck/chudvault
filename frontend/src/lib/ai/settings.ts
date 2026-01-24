import { useState, useEffect } from 'react';

export type AIProvider = 'openai' | 'anthropic' | 'ollama';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const stored = localStorage.getItem('chudvault_ai_settings');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse AI settings', e);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<AISettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      localStorage.setItem('chudvault_ai_settings', JSON.stringify(next));
      return next;
    });
  };

  return { settings, updateSettings };
}
