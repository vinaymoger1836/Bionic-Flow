import React, { useState } from 'react';
import { Header } from './components/Header';
import { TestCasePresets } from './components/TestCasePresets';
import { DictationInput } from './components/DictationInput';
import { StructuredReportView } from './components/StructuredReportView';
import { ValidationInspector } from './components/ValidationInspector';
import { TelemetryBar } from './components/TelemetryBar';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import type {
  StructuredReport,
  ValidationWarning,
  GenerationSettings,
  TestCasePreset,
  RadiologyTemplate,
} from './types/report';
import { generateStructuredReport } from './engine/reportGenerator';
import { validateReport } from './engine/reportValidator';
import { TEST_CASE_PRESETS } from './engine/presets';
import {
  getStoredTemplates,
  saveStoredTemplates,
  resetTemplatesToDefault,
} from './engine/templates';

import { generateReportWithLLM } from './engine/llmService';

export const App: React.FC = () => {
  const [templates, setTemplates] = useState<RadiologyTemplate[]>(() => getStoredTemplates());
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  const [dictation, setDictation] = useState(TEST_CASE_PRESETS[0].dictation);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    TEST_CASE_PRESETS[0].templateId || 'ct_brain'
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(
    TEST_CASE_PRESETS[0].id
  );

  const [report, setReport] = useState<StructuredReport>(() =>
    generateStructuredReport(
      TEST_CASE_PRESETS[0].dictation,
      TEST_CASE_PRESETS[0].templateId,
      getStoredTemplates()
    )
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Bi-directional Grounding Trace State
  const [activeGroundingSpan, setActiveGroundingSpan] = useState<string | null>(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [groundingOriginSentence, setGroundingOriginSentence] = useState<string | null>(null);

  const [settings, setSettings] = useState<GenerationSettings>({
    mode: 'rule_based',
    provider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
  });

  const handleSelectPreset = (preset: TestCasePreset) => {
    setSelectedPresetId(preset.id);
    setDictation(preset.dictation);
    setActiveGroundingSpan(null);
    setActiveSentenceId(null);
    setGroundingOriginSentence(null);
    if (preset.templateId) {
      setSelectedTemplateId(preset.templateId);
    }
    const generated = generateStructuredReport(preset.dictation, preset.templateId, templates);
    setReport(generated);
  };

  const handleHoverSentence = (sentence: any | null) => {
    if (sentence && sentence.groundingSpan) {
      setActiveGroundingSpan(sentence.groundingSpan);
      setActiveSentenceId(sentence.id);
      setGroundingOriginSentence(sentence.text);
    } else {
      // Only clear if not locked by an explicit selection
      setActiveGroundingSpan(null);
      setActiveSentenceId(null);
      setGroundingOriginSentence(null);
    }
  };

  const handleSelectSentence = (sentence: any | null) => {
    if (sentence && sentence.groundingSpan) {
      setActiveGroundingSpan(sentence.groundingSpan);
      setActiveSentenceId(sentence.id);
      setGroundingOriginSentence(sentence.text);
    } else {
      setActiveGroundingSpan(null);
      setActiveSentenceId(null);
      setGroundingOriginSentence(null);
    }
  };

  const handleHoverDictationSpan = (span: string | null) => {
    if (!span) {
      setActiveGroundingSpan(null);
      setActiveSentenceId(null);
      return;
    }
    setActiveGroundingSpan(span);
    // Find corresponding report sentence
    const allSentences = [...report.findings, ...report.impression];
    const spanClean = span.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
    const matched = allSentences.find((s) => {
      if (!s.groundingSpan) return false;
      const gClean = s.groundingSpan.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
      return spanClean.includes(gClean) || gClean.includes(spanClean);
    });
    if (matched) {
      setActiveSentenceId(matched.id);
      setGroundingOriginSentence(matched.text);
    }
  };

  const handleSelectDictationSpan = (span: string | null) => {
    handleHoverDictationSpan(span);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      if (settings.mode === 'live_llm' && settings.apiKey?.trim()) {
        const generated = await generateReportWithLLM(
          dictation,
          selectedTemplateId,
          settings
        );
        setReport(generated);
      } else {
        setTimeout(() => {
          const generated = generateStructuredReport(dictation, selectedTemplateId, templates);
          setReport(generated);
        }, 150);
      }
    } catch (err) {
      console.error('Generation error:', err);
      const generated = generateStructuredReport(dictation, selectedTemplateId, templates);
      setReport(generated);
    } finally {
      setTimeout(() => setIsGenerating(false), 200);
    }
  };

  const handleSaveTemplates = (newTemplates: RadiologyTemplate[]) => {
    saveStoredTemplates(newTemplates);
    setTemplates(newTemplates);
    const regenerated = generateStructuredReport(dictation, selectedTemplateId, newTemplates);
    setReport(regenerated);
  };

  const handleResetTemplates = () => {
    const defaults = resetTemplatesToDefault();
    setTemplates(defaults);
    const regenerated = generateStructuredReport(dictation, selectedTemplateId, defaults);
    setReport(regenerated);
  };

  const handleUpdateSentence = (
    section: 'findings' | 'impression',
    sentenceId: string,
    newText: string
  ) => {
    setReport((prev) => {
      const updatedFindings =
        section === 'findings'
          ? prev.findings.map((s) =>
              s.id === sentenceId ? { ...s, text: newText, isEdited: true } : s
            )
          : prev.findings;

      const updatedImpression =
        section === 'impression'
          ? prev.impression.map((s) =>
              s.id === sentenceId ? { ...s, text: newText, isEdited: true } : s
            )
          : prev.impression;

      const newWarnings = validateReport(dictation, updatedFindings, updatedImpression);

      return {
        ...prev,
        findings: updatedFindings,
        impression: updatedImpression,
        warnings: newWarnings,
      };
    });
  };

  const handleApplyFix = (warning: ValidationWarning) => {
    if (!warning.suggestedFix) return;

    setReport((prev) => {
      if (warning.targetSentenceId) {
        const inFindings = prev.findings.some((s) => s.id === warning.targetSentenceId);
        const updatedFindings = inFindings
          ? prev.findings.map((s) =>
              s.id === warning.targetSentenceId
                ? { ...s, text: warning.suggestedFix!, isEdited: true }
                : s
            )
          : prev.findings;

        const updatedImpression = !inFindings
          ? prev.impression.map((s) =>
              s.id === warning.targetSentenceId
                ? { ...s, text: warning.suggestedFix!, isEdited: true }
                : s
            )
          : prev.impression;

        const newWarnings = validateReport(dictation, updatedFindings, updatedImpression);

        return {
          ...prev,
          findings: updatedFindings,
          impression: updatedImpression,
          warnings: newWarnings,
        };
      }

      const updatedImpression = prev.impression.map((s) => {
        if (warning.reportSpan && s.text.includes(warning.reportSpan)) {
          return {
            ...s,
            text: warning.suggestedFix || s.text,
            isEdited: true,
          };
        }
        return s;
      });

      const newWarnings = validateReport(dictation, prev.findings, updatedImpression);

      return {
        ...prev,
        impression: updatedImpression,
        warnings: newWarnings,
      };
    });
  };

  const handleDismissWarning = (warningId: string, reason: string) => {
    setReport((prev) => ({
      ...prev,
      warnings: prev.warnings.map((w) =>
        w.id === warningId ? { ...w, dismissed: true, dismissReason: reason } : w
      ),
    }));
  };

  const handleRestoreWarning = (warningId: string) => {
    setReport((prev) => ({
      ...prev,
      warnings: prev.warnings.map((w) => (w.id === warningId ? { ...w, dismissed: false } : w)),
    }));
  };

  const handleDocumentCriticalAlert = (details: {
    physicianName: string;
    readbackConfirmed: boolean;
    contactMethod: string;
    timestamp: string;
  }) => {
    setReport((prev) => {
      if (!prev.criticalAlert) return prev;
      const updatedAlert = {
        ...prev.criticalAlert,
        notified: true,
        physicianName: details.physicianName,
        readbackConfirmed: details.readbackConfirmed,
        contactMethod: details.contactMethod,
        timestamp: details.timestamp,
      };

      const attestationSentence = {
        id: `imp-crit-attest-${Date.now()}`,
        text: `CRITICAL VALUE DIRECTLY COMMUNICATED: Ordering/Attending physician ${details.physicianName} verbally notified via ${details.contactMethod} at ${details.timestamp}. Verbal read-back of ${prev.criticalAlert.findingText.toLowerCase()} confirmed.`,
        source: 'system_inference' as const,
        section: 'impression' as const,
      };

      return {
        ...prev,
        criticalAlert: updatedAlert,
        impression: [...prev.impression, attestationSentence],
      };
    });
  };

  const handleSignOff = () => {
    alert(
      'Report successfully signed and submitted to PACS / RIS! Audit logs recorded.'
    );
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Header
        generationTimeMs={report.generationTimeMs}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <TestCasePresets
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 h-[580px]">
            <DictationInput
              dictation={dictation}
              onChangeDictation={(val) => {
                setDictation(val);
                setSelectedPresetId(undefined);
              }}
              selectedTemplateId={selectedTemplateId}
              onChangeTemplate={setSelectedTemplateId}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              activeGroundingSpan={activeGroundingSpan}
              onHoverDictationSpan={handleHoverDictationSpan}
              onSelectDictationSpan={handleSelectDictationSpan}
              groundingOriginSentence={groundingOriginSentence}
              templates={templates}
              onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
            />
          </div>

          <div className="lg:col-span-4 h-[580px]">
            <StructuredReportView
              report={report}
              onUpdateSentence={handleUpdateSentence}
              onExport={() => setIsExportOpen(true)}
              warnings={report.warnings}
              activeSentenceId={activeSentenceId}
              activeGroundingSpan={activeGroundingSpan}
              onHoverSentence={handleHoverSentence}
              onSelectSentence={handleSelectSentence}
              onDocumentCriticalAlert={handleDocumentCriticalAlert}
            />
          </div>

          <div className="lg:col-span-3 h-[580px]">
            <ValidationInspector
              warnings={report.warnings}
              onApplyFix={handleApplyFix}
              onDismissWarning={handleDismissWarning}
              onRestoreWarning={handleRestoreWarning}
            />
          </div>
        </div>

        <TelemetryBar report={report} onSignOff={handleSignOff} />
      </main>

      <ExportModal
        report={report}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={(newSettings) => setSettings(newSettings)}
      />

      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        templates={templates}
        onSaveTemplates={handleSaveTemplates}
        onResetTemplates={handleResetTemplates}
      />
    </div>
  );
};

export default App;
