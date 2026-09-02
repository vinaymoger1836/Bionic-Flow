import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, RotateCcw, FileSpreadsheet, Volume2 } from 'lucide-react';
import { RADIOLOGY_TEMPLATES } from '../engine/templates';

interface DictationInputProps {
  dictation: string;
  onChangeDictation: (text: string) => void;
  selectedTemplateId: string;
  onChangeTemplate: (templateId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const DictationInput: React.FC<DictationInputProps> = ({
  dictation,
  onChangeDictation,
  selectedTemplateId,
  onChangeTemplate,
  onGenerate,
  isGenerating,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const dictationRef = useRef(dictation);

  useEffect(() => {
    dictationRef.current = dictation;
  }, [dictation]);

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
        onChangeDictation(current ? `${current.trim()} ${finalTranscript.trim()}` : finalTranscript.trim());
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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-lg shadow-black/40">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
          <span className="text-sm font-semibold text-slate-200">Radiologist Dictation Input</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <select
              value={selectedTemplateId}
              onChange={(e) => onChangeTemplate(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {RADIOLOGY_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
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

      <div className="p-4 flex-1 flex flex-col relative">
        <textarea
          value={dictation}
          onChange={(e) => onChangeDictation(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste or dictate radiology findings here (e.g. 'CT brain. 12 by 8 mm acute hemorrhage in left basal ganglia...'). Press Ctrl+Enter to generate."
          className="w-full flex-1 min-h-[220px] bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 text-slate-100 text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono leading-relaxed"
        />

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
