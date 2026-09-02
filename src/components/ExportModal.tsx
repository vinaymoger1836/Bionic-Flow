import React, { useState } from 'react';
import type { StructuredReport } from '../types/report';
import { X, Copy, Check } from 'lucide-react';

interface ExportModalProps {
  report: StructuredReport;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ report, isOpen, onClose }) => {
  const [activeFormat, setActiveFormat] = useState<'text' | 'json' | 'dicom' | 'markdown'>('text');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const findingsText = report.findings.map((f) => f.text).join(' ');
  const impressionText = report.impression.map((i) => `• ${i.text}`).join('\n');

  const textOutput = `CLINICAL RADIOLOGY REPORT\nDate/Time: ${new Date().toISOString()}\nModality: ${report.modality}\n\nFINDINGS:\n${findingsText}\n\nIMPRESSION:\n${impressionText}\n\n[Electronically Verified and Signed]`;

  const markdownOutput = `# Structured Radiology Report\n\n**Modality:** ${report.modality}  \n**Template:** ${report.templateUsed || 'Standard'}  \n**Generation Time:** ${report.generationTimeMs}ms  \n\n## Findings\n${report.findings.map((f) => `- [${f.source.toUpperCase()}] ${f.text}`).join('\n')}\n\n## Impression\n${report.impression.map((i) => `1. [${i.source.toUpperCase()}] ${i.text}`).join('\n')}\n`;

  const jsonOutput = JSON.stringify(report, null, 2);

  const dicomSrOutput = JSON.stringify(
    {
      resourceType: 'DiagnosticReport',
      status: 'final',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
              code: 'RAD',
              display: 'Radiology',
            },
          ],
        },
      ],
      code: {
        coding: [{ system: 'http://loinc.org', code: '18748-4', display: report.title }],
      },
      conclusion: report.impression.map((i) => i.text).join(' '),
      result: report.findings.map((f) => ({
        display: f.text,
        provenance: f.source,
      })),
      effectiveDateTime: new Date().toISOString(),
    },
    null,
    2
  );

  const getContent = () => {
    switch (activeFormat) {
      case 'text':
        return textOutput;
      case 'markdown':
        return markdownOutput;
      case 'json':
        return jsonOutput;
      case 'dicom':
        return dicomSrOutput;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h3 className="text-sm font-bold text-slate-100 m-0">Export Structured Report</h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 flex items-center space-x-2 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveFormat('text')}
            className={`pb-2 px-2 font-medium border-b-2 transition cursor-pointer ${
              activeFormat === 'text'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Clinical Text
          </button>
          <button
            onClick={() => setActiveFormat('markdown')}
            className={`pb-2 px-2 font-medium border-b-2 transition cursor-pointer ${
              activeFormat === 'markdown'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Markdown (with Provenance)
          </button>
          <button
            onClick={() => setActiveFormat('json')}
            className={`pb-2 px-2 font-medium border-b-2 transition cursor-pointer ${
              activeFormat === 'json'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Schema
          </button>
          <button
            onClick={() => setActiveFormat('dicom')}
            className={`pb-2 px-2 font-medium border-b-2 transition cursor-pointer ${
              activeFormat === 'dicom'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            FHIR / DICOM-SR
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap overflow-x-auto m-0 leading-relaxed">
            {getContent()}
          </pre>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Export ready for Hospital RIS / PACS integration.
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-900/40 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Output'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
