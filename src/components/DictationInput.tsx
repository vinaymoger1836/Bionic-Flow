import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  Volume2,
  FileEdit,
  Crosshair,
  MapPin,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { RADIOLOGY_TEMPLATES } from '../engine/templates';
import { splitIntoSentences } from '../engine/reportGenerator';
import type { RadiologyTemplate } from '../types/report';

interface DictationInputProps {
  dictation: string;
  onChangeDictation: (text: string) => void;
  selectedTemplateId: string;
  onChangeTemplate: (templateId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  activeGroundingSpan?: string | null;
  onHoverDictationSpan?: (span: string | null) => void;
  onSelectDictationSpan?: (span: string | null) => void;
  groundingOriginSentence?: string | null;
  templates?: RadiologyTemplate[];
  onOpenTemplateManager?: () => void;
}

export const DictationInput: React.FC<DictationInputProps> = ({
  dictation,
  onChangeDictation,
  selectedTemplateId,
  onChangeTemplate,
  onGenerate,
  isGenerating,
  activeGroundingSpan,
  onHoverDictationSpan,
  onSelectDictationSpan,
  groundingOriginSentence,
  templates = RADIOLOGY_TEMPLATES,
  onOpenTemplateManager,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [viewMode, setViewMode] = useState<'editor' | 'traceability'>('editor');
  const recognitionRef = useRef<any>(null);
  const dictationRef = useRef(dictation);

  useEffect(() => {
    dictationRef.current = dictation;
  }, [dictation]);

  // Auto-switch to traceability view if user clicks a sentence to inspect grounding
  useEffect(() => {
    if (activeGroundingSpan) {
      setViewMode('traceability');
    }
  }, [activeGroundingSpan]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }

      if (finalTranscript) {
        const current = dictationRef.current;
        onChangeDictation(
          current ? `${current.trim()} ${finalTranscript.trim()}` : finalTranscript.trim()
        );
      }
    };

    recognition.onerror = (err: any) => {
      console.warn('Speech recognition error:', err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [onChangeDictation]);

  const toggleListening = () => {
    if (!voiceSupported) {
      alert('Web Speech API is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onGenerate();
    }
  };

  const dictationSentences = splitIntoSentences(dictation);

  const isSegmentMatched = (segment: string) => {
    if (!activeGroundingSpan) return false;
    const segClean = segment.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
    const spanClean = activeGroundingSpan.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
    return spanClean.includes(segClean) || segClean.includes(spanClean);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-lg shadow-black/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
          <span className="text-sm font-semibold text-slate-200">Radiologist Dictation</span>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 ml-2 text-[11px]">
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                viewMode === 'editor'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileEdit className="w-3 h-3" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setViewMode('traceability')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                viewMode === 'traceability'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>Traceability Map</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <select
              value={selectedTemplateId}
              onChange={(e) => onChangeTemplate(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.macroShortcut ? `(${t.macroShortcut})` : ''}
                </option>
              ))}
            </select>

            {onOpenTemplateManager && (
              <button
                type="button"
                onClick={onOpenTemplateManager}
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition cursor-pointer"
                title="Customize preferred normal templates & macro hotkeys"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => onChangeDictation('')}
            disabled={!dictation}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Clear dictation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Editor vs Traceability Map */}
      <div className="p-4 flex-1 flex flex-col relative overflow-hidden">
        {viewMode === 'editor' ? (
          <textarea
            value={dictation}
            onChange={(e) => onChangeDictation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste or dictate radiology findings here (e.g. 'CT brain. 12 by 8 mm acute hemorrhage in left basal ganglia...'). Press Ctrl+Enter to generate."
            className="w-full flex-1 min-h-[220px] bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 text-slate-100 text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono leading-relaxed"
          />
        ) : (
          <div className="w-full flex-1 min-h-[220px] bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 text-sm overflow-y-auto font-mono leading-relaxed space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
                <Crosshair className="w-3.5 h-3.5" />
                <span>Interactive Grounding Trace</span>
              </span>
              <span>Hover or click a sentence to trace to structured report</span>
            </div>

            <div className="space-y-2 pt-1">
              {dictationSentences.map((sentence, idx) => {
                const matched = isSegmentMatched(sentence);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => onHoverDictationSpan?.(sentence)}
                    onMouseLeave={() => onHoverDictationSpan?.(null)}
                    onClick={() => onSelectDictationSpan?.(sentence)}
                    className={`p-2 rounded-md transition duration-150 cursor-pointer border ${
                      matched
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-100 shadow-md shadow-cyan-950/80 ring-1 ring-cyan-400/50'
                        : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 select-none">
                        S{idx + 1}
                      </span>
                      <span className="flex-1 text-xs">{sentence}</span>
                      {matched && (
                        <span className="flex items-center space-x-1 text-[10px] uppercase font-bold text-cyan-300 bg-cyan-900/60 px-1.5 py-0.5 rounded border border-cyan-700 select-none">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Matched</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Grounding Trace Bar (appears when a report sentence is hovered or selected) */}
        {activeGroundingSpan && (
          <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/70 border border-cyan-500/70 text-xs text-cyan-200 shadow-md shadow-cyan-950 flex items-start space-x-2 animate-in fade-in duration-200">
            <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 text-[11px] uppercase tracking-wider">
                  Bi-Directional Grounding Trace
                </span>
                <span className="text-[10px] text-cyan-400/80 font-mono">100% Sourced</span>
              </div>
              <p className="m-0 text-slate-200 text-xs mt-0.5 italic">
                "{activeGroundingSpan}"
              </p>
              {groundingOriginSentence && (
                <p className="m-0 text-slate-400 text-[10px] mt-1">
                  Report target: <span className="text-slate-300 font-semibold">"{groundingOriginSentence}"</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Live voice indicator bar */}
        {isListening && (
          <div className="mt-2 px-3 py-1.5 rounded-md bg-red-950/60 border border-red-800/80 flex items-center justify-between text-xs text-red-300 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Microphone Active — Listening to dictation...</span>
            </div>
            <Volume2 className="w-4 h-4 text-red-400" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <button
            onClick={toggleListening}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
              isListening
                ? 'bg-red-900/60 text-red-200 border-red-700 shadow-md shadow-red-950'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isListening ? 'Stop Mic' : 'Voice Dictate'}</span>
          </button>

          <span>
            {dictation.trim() ? dictation.trim().split(/\s+/).length : 0} words &bull;{' '}
            {dictation.length} chars
          </span>
        </div>

        <button
          onClick={onGenerate}
          disabled={!dictation.trim() || isGenerating}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Structuring...' : 'Generate Report (Ctrl+Enter)'}</span>
        </button>
      </div>
    </div>
  );
};
