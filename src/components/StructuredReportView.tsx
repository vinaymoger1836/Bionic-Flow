import React, { useState } from 'react';
import type {
  StructuredReport,
  ReportSentence,
  ProvenanceSource,
  ValidationWarning,
} from '../types/report';
import {
  FileText,
  Copy,
  Check,
  Edit2,
  Download,
  MapPin,
} from 'lucide-react';
import { CriticalAlertBanner } from './CriticalAlertBanner';

interface StructuredReportViewProps {
  report: StructuredReport;
  onUpdateSentence: (
    section: 'findings' | 'impression',
    sentenceId: string,
    newText: string
  ) => void;
  onExport: () => void;
  warnings: ValidationWarning[];
  activeSentenceId?: string | null;
  activeGroundingSpan?: string | null;
  onHoverSentence?: (sentence: ReportSentence | null) => void;
  onSelectSentence?: (sentence: ReportSentence | null) => void;
  onDocumentCriticalAlert?: (details: {
    physicianName: string;
    readbackConfirmed: boolean;
    contactMethod: string;
    timestamp: string;
  }) => void;
}

export const StructuredReportView: React.FC<StructuredReportViewProps> = ({
  report,
  onUpdateSentence,
  onExport,
  warnings,
  activeSentenceId,
  activeGroundingSpan,
  onHoverSentence,
  onSelectSentence,
  onDocumentCriticalAlert,
}) => {
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  const handleCopyAll = () => {
    const findingsText = report.findings.map((f) => f.text).join(' ');
    const impressionText = report.impression.map((i) => `• ${i.text}`).join('\n');
    const fullText = `STRUCTURED RADIOLOGY REPORT\n\nFINDINGS:\n${findingsText}\n\nIMPRESSION:\n${impressionText}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = (sentence: ReportSentence, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(sentence.id);
    setEditBuffer(sentence.text);
  };

  const saveEdit = (section: 'findings' | 'impression', sentenceId: string) => {
    if (editBuffer.trim()) {
      onUpdateSentence(section, sentenceId, editBuffer.trim());
    }
    setEditingId(null);
    setEditBuffer('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer('');
  };

  const getProvenanceBadge = (source: ProvenanceSource) => {
    switch (source) {
      case 'dictation':
        return (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 select-none"
            title="Transcribed directly from radiologist dictation"
          >
            Dictation
          </span>
        );
      case 'template':
        return (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 select-none"
            title="Sourced from standard normal baseline template"
          >
            Template
          </span>
        );
      case 'system_inference':
        return (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-950/80 text-purple-300 border border-purple-800/80 select-none"
            title="Synthesized by AI / System clinical inference"
          >
            System Inference
          </span>
        );
    }
  };

  const isSentenceWarned = (sentenceId: string) => {
    return warnings.some((w) => w.targetSentenceId === sentenceId && !w.dismissed);
  };

  const isSentenceActive = (sentence: ReportSentence) => {
    if (activeSentenceId === sentence.id) return true;
    if (activeGroundingSpan && sentence.groundingSpan) {
      const gClean = sentence.groundingSpan.toLowerCase().trim();
      const aClean = activeGroundingSpan.toLowerCase().trim();
      return gClean.includes(aClean) || aClean.includes(gClean);
    }
    return false;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-lg shadow-black/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-100">Sign-Ready Structured Report</span>
          <span className="text-[11px] text-slate-400 font-mono">({report.modality})</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyAll}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer"
            title="Copy formatted report"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer"
            title="Export formats (JSON, DICOM-SR, Markdown)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {/* Section 1: FINDINGS */}
        <div>
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-300 m-0 flex items-center space-x-1.5">
              <span>FINDINGS</span>
              <span className="text-[10px] text-slate-500 font-normal">
                ({report.findings.length} sentences)
              </span>
            </h4>
            <span className="text-[10px] text-slate-500 italic">Click/Hover to trace</span>
          </div>

          <div className="space-y-2">
            {report.findings.map((sentence) => {
              const isEditing = editingId === sentence.id;
              const hasWarning = isSentenceWarned(sentence.id);
              const isActive = isSentenceActive(sentence);

              return (
                <div
                  key={sentence.id}
                  onMouseEnter={() => !isEditing && onHoverSentence?.(sentence)}
                  onMouseLeave={() => !isEditing && onHoverSentence?.(null)}
                  onClick={() => !isEditing && onSelectSentence?.(isActive ? null : sentence)}
                  className={`group relative p-2.5 rounded-lg border transition duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-md shadow-cyan-950 ring-1 ring-cyan-400/60'
                      : hasWarning
                      ? 'bg-amber-950/20 border-amber-800/80 shadow-sm'
                      : 'bg-slate-950/40 hover:bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          className="w-full bg-slate-900 border border-cyan-500 rounded p-2 text-xs text-slate-100 font-mono resize-none focus:outline-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end space-x-2 mt-1.5">
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit('findings', sentence.id)}
                            className="px-2 py-0.5 rounded text-[11px] bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-slate-200 leading-relaxed m-0 flex-1">
                          {sentence.text}
                        </p>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {sentence.groundingSpan && (
                            <span
                              className={`inline-flex items-center space-x-0.5 text-[9px] px-1 py-0.5 rounded font-mono transition select-none ${
                                isActive
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-900 text-cyan-400/80 border border-cyan-900 hover:text-cyan-300'
                              }`}
                              title="Click to highlight exact dictation source"
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span>Trace</span>
                            </span>
                          )}

                          {getProvenanceBadge(sentence.source)}

                          <button
                            onClick={(e) => startEdit(sentence, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Edit sentence"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACR Critical Actionable Finding Banner */}
        {report.criticalAlert && onDocumentCriticalAlert && (
          <div className="mb-2">
            <CriticalAlertBanner
              alert={report.criticalAlert}
              onDocumentNotification={onDocumentCriticalAlert}
            />
          </div>
        )}

        {/* Section 2: IMPRESSION */}
        <div>
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-300 m-0 flex items-center space-x-1.5">
              <span>IMPRESSION</span>
              <span className="text-[10px] text-slate-500 font-normal">
                ({report.impression.length} points)
              </span>
            </h4>
            <span className="text-[10px] text-slate-500 italic">Click/Hover to trace</span>
          </div>

          <div className="space-y-2">
            {report.impression.map((sentence, idx) => {
              const isEditing = editingId === sentence.id;
              const hasWarning = isSentenceWarned(sentence.id);
              const isActive = isSentenceActive(sentence);

              return (
                <div
                  key={sentence.id}
                  onMouseEnter={() => !isEditing && onHoverSentence?.(sentence)}
                  onMouseLeave={() => !isEditing && onHoverSentence?.(null)}
                  onClick={() => !isEditing && onSelectSentence?.(isActive ? null : sentence)}
                  className={`group relative p-2.5 rounded-lg border transition duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-md shadow-cyan-950 ring-1 ring-cyan-400/60'
                      : hasWarning
                      ? 'bg-red-950/20 border-red-800 shadow-sm shadow-red-950/50'
                      : 'bg-slate-950/40 hover:bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editBuffer}
                          onChange={(e) => setEditBuffer(e.target.value)}
                          className="w-full bg-slate-900 border border-cyan-500 rounded p-2 text-xs text-slate-100 font-mono resize-none focus:outline-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end space-x-2 mt-1.5">
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit('impression', sentence.id)}
                            className="px-2 py-0.5 rounded text-[11px] bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start space-x-2 flex-1">
                          <span className="text-cyan-400 font-bold text-xs mt-0.5">
                            {idx + 1}.
                          </span>
                          <p className="text-xs font-medium text-slate-100 leading-relaxed m-0">
                            {sentence.text}
                          </p>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {sentence.groundingSpan && (
                            <span
                              className={`inline-flex items-center space-x-0.5 text-[9px] px-1 py-0.5 rounded font-mono transition select-none ${
                                isActive
                                  ? 'bg-cyan-500 text-slate-950 font-bold'
                                  : 'bg-slate-900 text-cyan-400/80 border border-cyan-900 hover:text-cyan-300'
                              }`}
                              title="Click to highlight exact dictation source"
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span>Trace</span>
                            </span>
                          )}

                          {getProvenanceBadge(sentence.source)}

                          <button
                            onClick={(e) => startEdit(sentence, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Edit sentence"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
