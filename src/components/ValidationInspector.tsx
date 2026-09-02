import React, { useState } from 'react';
import type {
  ValidationWarning,
  ValidationType,
} from '../types/report';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  EyeOff,
} from 'lucide-react';

interface ValidationInspectorProps {
  warnings: ValidationWarning[];
  onApplyFix: (warning: ValidationWarning) => void;
  onDismissWarning: (warningId: string, reason: string) => void;
  onRestoreWarning: (warningId: string) => void;
}

export const ValidationInspector: React.FC<ValidationInspectorProps> = ({
  warnings,
  onApplyFix,
  onDismissWarning,
  onRestoreWarning,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'dismissed'>('active');
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('Clinical judgment');

  const activeWarnings = warnings.filter((w) => !w.dismissed);
  const dismissedWarnings = warnings.filter((w) => w.dismissed);
  const errorCount = activeWarnings.filter((w) => w.severity === 'error').length;

  const getWarningTypeBadge = (type: ValidationType) => {
    switch (type) {
      case 'laterality':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            Laterality Inconsistency
          </span>
        );
      case 'measurement':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
            Measurement / Unit Mismatch
          </span>
        );
      case 'negation':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950/80 text-orange-300 border border-orange-800">
            Negation Inconsistency
          </span>
        );
      case 'unsupported_finding':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 text-red-300 border border-red-800">
            Unsupported (Hallucination)
          </span>
        );
      case 'missing_critical_finding':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-950/80 text-yellow-300 border border-yellow-800">
            Missing Critical Finding
          </span>
        );
    }
  };

  const handleConfirmDismiss = (warningId: string) => {
    onDismissWarning(warningId, dismissReason);
    setDismissingId(null);
    setDismissReason('Clinical judgment');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-lg shadow-black/40">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {errorCount > 0 ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-sm font-semibold text-slate-100">Safety Guardrails & Validation</span>
        </div>

        <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-2.5 py-0.5 rounded font-medium transition cursor-pointer ${
              activeTab === 'active'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({activeWarnings.length})
          </button>
          <button
            onClick={() => setActiveTab('dismissed')}
            className={`px-2.5 py-0.5 rounded font-medium transition cursor-pointer ${
              activeTab === 'dismissed'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Log ({dismissedWarnings.length})
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {activeTab === 'active' && (
          <>
            {activeWarnings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-emerald-900/50 bg-emerald-950/10 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <h4 className="text-sm font-semibold text-emerald-300 m-0 mb-1">
                  All Safety Guardrails Passed
                </h4>
                <p className="text-xs text-slate-400 max-w-sm m-0">
                  Laterality, negation, measurements, and clinical grounding verified against dictation. Report is sign-ready.
                </p>
              </div>
            ) : (
              activeWarnings.map((warning) => {
                const isDismissing = dismissingId === warning.id;

                return (
                  <div
                    key={warning.id}
                    className={`p-3.5 rounded-lg border transition ${
                      warning.severity === 'error'
                        ? 'bg-rose-950/20 border-rose-800/80'
                        : 'bg-amber-950/20 border-amber-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {getWarningTypeBadge(warning.type)}
                          <span className="text-xs font-bold text-slate-100">
                            {warning.title}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          warning.severity === 'error'
                            ? 'bg-rose-900 text-rose-200'
                            : 'bg-amber-900 text-amber-200'
                        }`}
                      >
                        {warning.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed m-0 mb-3">
                      {warning.description}
                    </p>

                    {(warning.dictationSpan || warning.reportSpan) && (
                      <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono space-y-1 mb-3">
                        {warning.dictationSpan && (
                          <div className="flex items-center text-cyan-400">
                            <span className="text-slate-500 w-16">Dictation:</span>
                            <span className="font-semibold">{warning.dictationSpan}</span>
                          </div>
                        )}
                        {warning.reportSpan && (
                          <div className="flex items-center text-rose-400">
                            <span className="text-slate-500 w-16">Report:</span>
                            <span className="font-semibold line-through">{warning.reportSpan}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isDismissing ? (
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-700 space-y-2">
                        <span className="text-[11px] font-semibold text-slate-300">
                          Select dismissal reason for audit log:
                        </span>
                        <select
                          value={dismissReason}
                          onChange={(e) => setDismissReason(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none"
                        >
                          <option value="Clinical judgment">Clinical judgment override</option>
                          <option value="Dictation speech typo">Dictation speech typo</option>
                          <option value="Intentional change">Intentional radiologist modification</option>
                          <option value="False positive warning">False positive rule trigger</option>
                        </select>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setDismissingId(null)}
                            className="px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleConfirmDismiss(warning.id)}
                            className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium cursor-pointer"
                          >
                            Confirm Dismiss
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        {warning.suggestedFix ? (
                          <button
                            onClick={() => onApplyFix(warning)}
                            className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-sm shadow-cyan-900/50 transition cursor-pointer"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Apply Suggested Fix</span>
                          </button>
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={() => setDismissingId(warning.id)}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Dismiss</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

        {activeTab === 'dismissed' && (
          <div className="space-y-2.5">
            {dismissedWarnings.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No dismissed warnings in audit trail.
              </div>
            ) : (
              dismissedWarnings.map((dw) => (
                <div
                  key={dw.id}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">{dw.title}</span>
                    <button
                      onClick={() => onRestoreWarning(dw.id)}
                      className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      Restore
                    </button>
                  </div>
                  <p className="text-slate-400 m-0">{dw.description}</p>
                  <div className="text-[11px] text-slate-500 italic">
                    Reason: {dw.dismissReason || 'Clinical judgment'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
