import React from 'react';
import { TEST_CASE_PRESETS } from '../engine/presets';
import type { TestCasePreset } from '../types/report';
import { FlaskConical, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TestCasePresetsProps {
  selectedPresetId?: string;
  onSelectPreset: (preset: TestCasePreset) => void;
}

export const TestCasePresets: React.FC<TestCasePresetsProps> = ({
  selectedPresetId,
  onSelectPreset,
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FlaskConical className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200 m-0">Evaluation Test Cases</h3>
          <span className="text-[11px] text-slate-400">1-click verify recruiter exercise requirements</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TEST_CASE_PRESETS.slice(0, 3).map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          const isErrorCase = preset.id === 'case_3_inconsistency';

          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-3 rounded-lg border transition duration-150 flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-950/50 hover:bg-slate-800/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-100 flex items-center space-x-1.5">
                    {isErrorCase ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>{preset.name}</span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isErrorCase
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 m-0 mb-2">
                  "{preset.dictation}"
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                <span>{preset.expectedBehavior.slice(0, 48)}...</span>
                <span className="text-cyan-400 font-medium">Load &rarr;</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
