import React from 'react';
import { Activity, ShieldCheck, Settings, Moon, Sun, Clock } from 'lucide-react';
import type { GenerationSettings } from '../types/report';

interface HeaderProps {
  generationTimeMs?: number;
  settings: GenerationSettings;
  onOpenSettings: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  generationTimeMs,
  settings,
  onOpenSettings,
  isDarkMode,
  onToggleTheme,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white m-0">Bionic Flow</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                Radiology AI Workspace
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">5C Network Clinical Intelligence Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {generationTimeMs !== undefined && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Generation:</span>
              <span className="font-mono font-semibold text-cyan-300">{generationTimeMs} ms</span>
            </div>
          )}

          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Engine:</span>
            <span className="text-emerald-400 font-medium capitalize">
              {settings.mode === 'live_llm'
                ? `${settings.provider === 'groq' ? 'Groq (Llama)' : settings.provider.toUpperCase()} + Guardrails`
                : 'Hybrid Deterministic'}
            </span>
          </div>

          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer"
            title="Configure AI & LLM settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title={isDarkMode ? 'Switch to Light theme' : 'Switch to Dark theme'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
