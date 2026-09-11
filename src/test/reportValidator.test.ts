import { describe, it, expect } from 'vitest';
import { generateStructuredReport } from '../engine/reportGenerator';
import { validateReport } from '../engine/reportValidator';
import { detectCriticalFinding } from '../engine/criticalAlerts';
import { TEST_CASE_PRESETS } from '../engine/presets';
import type { ReportSentence } from '../types/report';

describe('Bionic Flow Clinical Safety Engine', () => {
  it('Case 1: CT Brain - maintains laterality, no midline shift, normal ventricles', () => {
    const preset = TEST_CASE_PRESETS[0];
    const report = generateStructuredReport(preset.dictation, preset.templateId);

    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.impression.length).toBeGreaterThan(0);

    // Verify side is left
    const allText = [...report.findings, ...report.impression].map((s) => s.text).join(' ');
    expect(allText.toLowerCase()).toContain('left');
    expect(allText.toLowerCase()).not.toContain('right');

    // Verify 12 by 8 millimetre preserved
    expect(allText.toLowerCase()).toMatch(/12\s*(?:x|by)\s*8\s*(?:mm|millimetre)/);

    // Verify no midline shift
    expect(allText.toLowerCase()).toContain('no midline shift');

    // Verify 0 critical validation errors
    const criticalErrors = report.warnings.filter((w) => w.severity === 'error');
    expect(criticalErrors.length).toBe(0);

    // Verify provenance markings
    const dictationSentences = report.findings.filter((s) => s.source === 'dictation');
    expect(dictationSentences.length).toBeGreaterThan(0);
    expect(
      dictationSentences.some(
        (s) =>
          s.text.toLowerCase().includes('haemorrhage') ||
          s.text.toLowerCase().includes('hemorrhage')
      )
    ).toBe(true);
  });

  it('Case 2: CT Abdomen - post-cholecystectomy status suppresses normal gallbladder', () => {
    const preset = TEST_CASE_PRESETS[1];
    const report = generateStructuredReport(preset.dictation, preset.templateId);

    const allFindingsText = report.findings.map((s) => s.text).join(' ');

    // Gallbladder must NOT be described as normal
    expect(allFindingsText.toLowerCase()).not.toContain('gallbladder is normal');
    expect(allFindingsText.toLowerCase()).toContain('surgically absent');

    // Liver lesion 2.4 centimetre segment six preserved in impression
    const impressionText = report.impression.map((s) => s.text).join(' ');
    expect(impressionText.toLowerCase()).toMatch(/2\.4\s*(?:cm|centimetre)/);
    expect(impressionText.toLowerCase()).toMatch(/segment vi|segment six/);

    // 0 validation errors
    const criticalErrors = report.warnings.filter((w) => w.severity === 'error');
    expect(criticalErrors.length).toBe(0);
  });

  it('Case 3: Deliberate Inconsistency - flags laterality, measurement, and negation errors', () => {
    const preset = TEST_CASE_PRESETS[2];
    const report = generateStructuredReport(preset.dictation, preset.templateId);

    expect(report.warnings.length).toBeGreaterThanOrEqual(3);

    const lateralityWarning = report.warnings.find((w) => w.type === 'laterality');
    const measurementWarning = report.warnings.find((w) => w.type === 'measurement');
    const negationWarning = report.warnings.find((w) => w.type === 'negation');

    expect(lateralityWarning).toBeDefined();
    expect(lateralityWarning?.severity).toBe('error');
    expect(lateralityWarning?.description.toLowerCase()).toContain('left');

    expect(measurementWarning).toBeDefined();
    expect(measurementWarning?.severity).toBe('error');
    expect(measurementWarning?.description.toLowerCase()).toMatch(/14\s*(cm|centimetres|unit)/);

    expect(negationWarning).toBeDefined();
    expect(negationWarning?.severity).toBe('error');
    expect(negationWarning?.description.toLowerCase()).toContain('hydronephrosis');
  });

  it('Correction Flow: applying suggested fix resolves the warnings', () => {
    const preset = TEST_CASE_PRESETS[2];
    const report = generateStructuredReport(preset.dictation, preset.templateId);

    // Apply auto-fixes to impression
    const fixedImpression = report.impression.map((s) => {
      let text = s.text;
      text = text.replace(/right/gi, 'Left');
      text = text.replace(/14 centimetres/gi, '14 millimetre');
      text = text.replace(/with hydronephrosis/gi, 'no hydronephrosis');
      return { ...s, text };
    });

    const fixedWarnings = validateReport(preset.dictation, report.findings, fixedImpression);
    const criticalErrors = fixedWarnings.filter((w) => w.severity === 'error');
    expect(criticalErrors.length).toBe(0);
  });

  it('Hallucination Guardrail: detects invented positive severe diagnoses', () => {
    const dictation = 'CT brain. Normal gray-white differentiation. No acute intracranial hemorrhage.';
    const findings: ReportSentence[] = [
      { id: 'f1', text: 'Normal brain parenchyma.', source: 'template', section: 'findings' },
    ];
    const impressionWithHallucination: ReportSentence[] = [
      { id: 'i1', text: 'Acute subdural hematoma with severe mass effect and herniation.', source: 'system_inference', section: 'impression' },
    ];

    const warnings = validateReport(dictation, findings, impressionWithHallucination);
    const hallucinationWarning = warnings.find((w) => w.type === 'unsupported_finding');

    expect(hallucinationWarning).toBeDefined();
    expect(hallucinationWarning?.severity).toBe('error');
    expect(hallucinationWarning?.description.toLowerCase()).toMatch(/mass effect|herniation/);
  });

  it('Missing Critical Finding Guardrail: flags omitted acute hemorrhage from impression', () => {
    const dictation = 'CT head shows acute subarachnoid hemorrhage in the basal cisterns.';
    const findings: ReportSentence[] = [
      { id: 'f1', text: 'Acute subarachnoid hemorrhage in basal cisterns.', source: 'dictation', section: 'findings' },
    ];
    const incompleteImpression: ReportSentence[] = [
      { id: 'i1', text: 'No acute hydrocephalus.', source: 'system_inference', section: 'impression' },
    ];

    const warnings = validateReport(dictation, findings, incompleteImpression);
    const missingCrit = warnings.find((w) => w.type === 'missing_critical_finding');

    expect(missingCrit).toBeDefined();
    expect(missingCrit?.severity).toBe('warning');
    expect(missingCrit?.description.toLowerCase()).toMatch(/haemorrhage|hemorrhage/);
  });

  it('Grounding Traceability: assigns valid groundingSpan linking back to raw dictation', () => {
    const preset = TEST_CASE_PRESETS[0];
    const report = generateStructuredReport(preset.dictation, preset.templateId);

    const dictationSentences = report.findings.filter((s) => s.source === 'dictation');
    expect(dictationSentences.every((s) => typeof s.groundingSpan === 'string' && s.groundingSpan.length > 0)).toBe(true);

    const primaryImpression = report.impression[0];
    expect(primaryImpression.groundingSpan).toBeDefined();
    expect(primaryImpression.groundingSpan?.toLowerCase()).toMatch(/haemorrhage|hemorrhage/);
  });

  it('ACR Critical Finding Detection: detects acute intracranial hemorrhage in Case 1 as STAT Category 1', () => {
    const preset = TEST_CASE_PRESETS[0];
    const report = generateStructuredReport(preset.dictation, preset.templateId);

    expect(report.criticalAlert).toBeDefined();
    expect(report.criticalAlert?.urgency).toBe('stat');
    expect(report.criticalAlert?.categoryName).toContain('ACR Category 1');
    expect(report.criticalAlert?.findingText.toLowerCase()).toMatch(/haemorrhage|hemorrhage/);
  });

  it('ACR Critical Finding Negation: suppresses false alert when acute finding is negated', () => {
    const dictation = 'CT Brain. No acute intracranial hemorrhage or territorial infarction. Ventricles are normal.';
    const alert = detectCriticalFinding(dictation, []);

    expect(alert).toBeNull();
  });
});
