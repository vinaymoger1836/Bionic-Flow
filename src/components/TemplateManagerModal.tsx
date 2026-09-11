import React, { useState } from 'react';
import type { RadiologyTemplate } from '../types/report';
import {
  X,
  FileSpreadsheet,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Command,
} from 'lucide-react';
import { DEFAULT_RADIOLOGY_TEMPLATES } from '../engine/templates';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: RadiologyTemplate[];
  onSaveTemplates: (updatedTemplates: RadiologyTemplate[]) => void;
  onResetTemplates: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplates,
  onResetTemplates,
}) => {
  const [templateList, setTemplateList] = useState<RadiologyTemplate[]>(() =>
    JSON.parse(JSON.stringify(templates))
  );
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [savedNotice, setSavedNotice] = useState(false);

  // Sync state if modal opens with new templates
  React.useEffect(() => {
    if (isOpen) {
      setTemplateList(JSON.parse(JSON.stringify(templates)));
    }
  }, [isOpen, templates]);

  if (!isOpen) return null;

  const activeTemplate = templateList[selectedTemplateIndex] || templateList[0];

  const handleUpdateNormalText = (sectionIndex: number, newNormalText: string) => {
    setTemplateList((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedTemplateIndex].organSections[sectionIndex].normalText = newNormalText;
      return copy;
    });
  };

  const handleUpdateMacro = (newMacro: string) => {
    setTemplateList((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedTemplateIndex].macroShortcut = newMacro;
      return copy;
    });
  };

  const handleAddOrganSection = () => {
    setTemplateList((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedTemplateIndex].organSections.push({
        name: 'New Anatomical Region',
        normalText: 'Normal appearance without acute focal abnormality.',
        keywords: ['new', 'region'],
      });
      return copy;
    });
  };

  const handleRemoveOrganSection = (sectionIndex: number) => {
    setTemplateList((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[selectedTemplateIndex].organSections.splice(sectionIndex, 1);
      return copy;
    });
  };

  const handleAddTemplate = () => {
    const newTpl: RadiologyTemplate = {
      id: `custom_tpl_${Date.now()}`,
      name: 'Custom MRI / CT Template',
      modality: 'CT',
      macroShortcut: '.custom',
      organSections: [
        {
          name: 'Primary Region',
          normalText: 'Normal anatomical appearance with preserved signal/attenuation.',
          keywords: ['region'],
        },
      ],
    };
    setTemplateList((prev) => [...prev, newTpl]);
    setSelectedTemplateIndex(templateList.length);
  };

  const handleSave = () => {
    onSaveTemplates(templateList);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    if (confirm('Reset all templates to 5C Network institutional defaults?')) {
      onResetTemplates();
      setTemplateList(JSON.parse(JSON.stringify(DEFAULT_RADIOLOGY_TEMPLATES)));
      setSelectedTemplateIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 m-0">
              Radiologist Preferred Templates & Formatting
            </h3>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
              Persisted in Storage
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Layout: Sidebar & Editor */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Template Tabs */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 p-3 space-y-1.5 overflow-y-auto">
            <div className="text-[11px] font-semibold text-slate-400 px-2 pb-1 uppercase tracking-wider">
              Installed Templates
            </div>
            {templateList.map((tpl, idx) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplateIndex(idx)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition cursor-pointer flex flex-col ${
                  selectedTemplateIndex === idx
                    ? 'bg-cyan-950/50 border-cyan-500 text-cyan-100 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 truncate">{tpl.name}</span>
                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800">
                    {tpl.macroShortcut || '.tpl'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">
                  {tpl.organSections.length} anatomical organs
                </span>
              </button>
            ))}

            <button
              onClick={handleAddTemplate}
              className="w-full mt-2 flex items-center justify-center space-x-1 p-2 rounded-lg border border-dashed border-slate-700 text-xs text-slate-400 hover:text-cyan-300 hover:border-cyan-500 hover:bg-slate-900/60 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Template</span>
            </button>
          </div>

          {/* Right Editor Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {activeTemplate && (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 m-0">
                      {activeTemplate.name}
                    </h4>
                    <p className="text-xs text-slate-400 m-0 mt-0.5">
                      Customize standard normal text inserted for unmentioned organs.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-slate-400 flex items-center space-x-1">
                      <Command className="w-3 h-3 text-cyan-400" />
                      <span>Macro Hotkey:</span>
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.macroShortcut || ''}
                      onChange={(e) => handleUpdateMacro(e.target.value)}
                      placeholder=".normbrain"
                      className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Organ Sections */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Organ Baseline Normals ({activeTemplate.organSections.length})
                    </span>
                    <button
                      onClick={handleAddOrganSection}
                      className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Organ Region</span>
                    </button>
                  </div>

                  {activeTemplate.organSections.map((sec, secIdx) => (
                    <div
                      key={secIdx}
                      className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          <span>{sec.name}</span>
                        </span>
                        {activeTemplate.organSections.length > 1 && (
                          <button
                            onClick={() => handleRemoveOrganSection(secIdx)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title="Remove organ"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Default Normal Phrasing (auto-applied when organ is unmentioned in dictation):
                        </label>
                        <textarea
                          value={sec.normalText}
                          onChange={(e) => handleUpdateNormalText(secIdx, e.target.value)}
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded p-2 text-xs text-slate-200 font-mono resize-none focus:outline-none"
                        />
                      </div>

                      {sec.surgicalKeywords && (
                        <div className="text-[10px] text-amber-400/90 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3" />
                          <span>
                            Surgical Suppression Active: Automatically replaced if prior surgery (e.g. cholecystectomy) is dictated.
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center space-x-2">
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
              <span>{savedNotice ? 'Templates Saved!' : 'Save & Apply Preferences'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
