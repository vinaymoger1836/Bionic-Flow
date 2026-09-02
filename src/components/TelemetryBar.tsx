import React from 'react';
import type { StructuredReport } from '../types/report';
import { AlertTriangle, ShieldCheck, Clock, FileCheck } from 'lucide-react';

interface TelemetryBarProps {
  report: StructuredReport;
  onSignOff: () => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({ report, onSignOff }) => {
  const allSentences = [...report.findings, ...report.impression];
  const totalSentences = allSentences.length || 1;

  const dictationCount = allSentences.filter((s) => s.source === 'dictation').length;
  const templateCount = allSentences.filter((s) => s.source === 'template').length;

  const dictationPct = Math.round((dictationCount / totalSentences) * 100);
  const templatePct = Math.round((templateCount / totalSentences) * 100);
  const inferencePct = 100 - dictationPct - templatePct;

  const activeErrors = report.warnings.filter((w) => w.severity === 'error' && !w.dismissed);
  const isSignReady = activeErrors.length === 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg shadow-black/40 mt-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="w-full lg:w-1/2 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-slate-200">Sentence Provenance Breakdown:</span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Dictation ({dictationPct}%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Template ({templatePct}%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span>Inference ({inferencePct}%)</span>
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${dictationPct}%` }}
              className="bg-cyan-500 h-full transition-all duration-300"
              title={`Dictation: ${dictationPct}%`}
            />
            <div
              style={{ width: `${templatePct}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Template: ${templatePct}%`}
            />
            <div
              style={{ width: `${inferencePct}%` }}
              className="bg-purple-500 h-full transition-all duration-300"
              title={`System Inference: ${inferencePct}%`}
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 w-full lg:w-auto">
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Generation:</span>
            <span className="font-mono font-bold text-slate-200">{report.generationTimeMs}ms</span>
          </div>

          <div className="flex items-center space-x-2">
            {isSignReady ? (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Sign-Ready</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-xs font-semibold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{activeErrors.length} Issue(s) Require Action</span>
              </div>
            )}

            <button
              onClick={onSignOff}
              disabled={!isSignReady}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg font-medium text-xs transition cursor-pointer ${
                isSignReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Sign & Finalize Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
