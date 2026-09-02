import React, { useState } from 'react';
import type { GenerationSettings, LLMProvider } from '../types/report';
import { X, Key, Cpu, ShieldCheck, Sparkles, Check, Zap, Server, RefreshCw, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  settings: GenerationSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: GenerationSettings) => void;
}

const DEFAULT_GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Recommended)' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra-Fast < 150ms)' },
  { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision' },
  { id: 'llama-3.2-3b-preview', name: 'Llama 3.2 3B Preview' },
  { id: 'llama-3.2-1b-preview', name: 'Llama 3.2 1B Preview' },
  { id: 'llama3-70b-8192', name: 'Llama 3 70B (8k context)' },
  { id: 'llama3-8b-8192', name: 'Llama 3 8B (8k context)' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
  { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B' },
];

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
  { id: 'gpt-4o', name: 'GPT-4o (Full Precision)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [mode, setMode] = useState<GenerationSettings['mode']>(settings.mode);
  const [provider, setProvider] = useState<LLMProvider>(settings.provider || 'groq');
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [modelName, setModelName] = useState(settings.modelName || 'llama-3.3-70b-versatile');
  const [customEndpoint, setCustomEndpoint] = useState(settings.customEndpoint || 'http://localhost:11434/v1/chat/completions');
  
  const [fetchedModels, setFetchedModels] = useState<{ id: string; name: string }[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleProviderChange = (newProv: LLMProvider) => {
    setProvider(newProv);
    setFetchedModels([]);
    setFetchError(null);
    if (newProv === 'groq') {
      setModelName('llama-3.3-70b-versatile');
    } else if (newProv === 'openai') {
      setModelName('gpt-4o-mini');
    } else {
      setModelName('llama3');
    }
  };

  const handleFetchLiveModels = async () => {
    if (!apiKey.trim()) {
      setFetchError('Please enter your API Key first to fetch available models.');
      return;
    }

    setIsFetchingModels(true);
    setFetchError(null);

    try {
      let url = 'https://api.groq.com/openai/v1/models';
      if (provider === 'openai') {
        url = 'https://api.openai.com/v1/models';
      } else if (provider === 'custom') {
        url = customEndpoint.replace('/chat/completions', '/models');
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API returned ${res.status}: ${text}`);
      }

      const json = await res.json();
      const list: any[] = json.data || [];

      // Filter out non-chat / whisper models
      const chatModels = list
        .filter((m: any) => !m.id.includes('whisper') && !m.id.includes('tts') && !m.id.includes('embed'))
        .map((m: any) => ({
          id: m.id,
          name: `${m.id} ${m.owned_by ? `(${m.owned_by})` : ''}`,
        }));

      if (chatModels.length > 0) {
        setFetchedModels(chatModels);
        if (!chatModels.some((m) => m.id === modelName)) {
          setModelName(chatModels[0].id);
        }
      } else {
        setFetchError('No chat models found on this account.');
      }
    } catch (err: any) {
      console.error('Failed to fetch models:', err);
      setFetchError(err.message || 'Failed to connect to API.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = () => {
    onSave({
      mode,
      provider,
      apiKey: apiKey.trim(),
      modelName: modelName.trim(),
      customEndpoint: customEndpoint.trim(),
    });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  const activeModelOptions =
    fetchedModels.length > 0
      ? fetchedModels
      : provider === 'groq'
      ? DEFAULT_GROQ_MODELS
      : OPENAI_MODELS;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 m-0">Engine & AI Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Structuring Engine Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('rule_based')}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  mode === 'rule_based'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-slate-200 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Deterministic Mock</span>
                </div>
                <p className="text-[11px] text-slate-400 m-0">
                  Zero credentials needed. Instant review of all test cases.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('live_llm')}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  mode === 'live_llm'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-slate-200 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Live LLM Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 m-0">
                  Connect Groq (Llama 3.3/3.1), OpenAI, or local Ollama.
                </p>
              </button>
            </div>
          </div>

          {/* Live LLM Provider Selection */}
          {mode === 'live_llm' && (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  LLM Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleProviderChange('groq')}
                    className={`p-2 rounded-md border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      provider === 'groq'
                        ? 'bg-orange-950/40 border-orange-500 text-orange-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-orange-400 mb-1" />
                    <span className="text-xs font-bold">Groq (Llama)</span>
                    <span className="text-[9px] text-orange-300 font-mono">Ultra-Fast Open Source</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('openai')}
                    className={`p-2 rounded-md border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      provider === 'openai'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400 mb-1" />
                    <span className="text-xs font-bold">OpenAI</span>
                    <span className="text-[9px] text-slate-400 font-mono">GPT-4o / Mini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProviderChange('custom')}
                    className={`p-2 rounded-md border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      provider === 'custom'
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Server className="w-4 h-4 text-cyan-400 mb-1" />
                    <span className="text-xs font-bold">Local / Ollama</span>
                    <span className="text-[9px] text-slate-400 font-mono">Self-Hosted</span>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Key className="w-3 h-3 text-cyan-400" />
                    <span>
                      {provider === 'groq'
                        ? 'Groq API Key (gsk_...)'
                        : provider === 'openai'
                        ? 'OpenAI API Key (sk-...)'
                        : 'API Key (Optional for Local Ollama)'}
                    </span>
                  </span>
                  {provider !== 'custom' && (
                    <button
                      type="button"
                      onClick={handleFetchLiveModels}
                      disabled={isFetchingModels || !apiKey.trim()}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isFetchingModels ? 'animate-spin' : ''}`} />
                      <span>{isFetchingModels ? 'Fetching...' : 'Auto-Detect Models'}</span>
                    </button>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'groq' ? 'gsk_...' : 'sk-...'}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                />
                {fetchError && (
                  <div className="flex items-center space-x-1 text-[11px] text-rose-400 mt-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fetchError}</span>
                  </div>
                )}
              </div>

              {/* Model Selection & Custom Model Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    Model Selection {fetchedModels.length > 0 && `(${fetchedModels.length} detected)`}
                  </label>
                </div>

                {provider !== 'custom' && (
                  <select
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-3 py-2 focus:outline-none focus:border-cyan-500"
                  >
                    {activeModelOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Direct text input for model ID */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Or specify exact model ID directly:
                  </label>
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g. llama-3.3-70b-versatile or llama3-70b-8192"
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Custom Endpoint for Local Ollama */}
              {provider === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    API Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/v1/chat/completions"
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-900/40 transition cursor-pointer"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{savedNotice ? 'Saved!' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
